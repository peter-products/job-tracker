// enrich_csv.js — Fetches full job descriptions and adds them to jobs_raw.csv
// Run once (or re-run to fill gaps): node enrich_csv.js
// No external dependencies.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, 'data', 'jobs_raw.csv');

// --- HTML/text helpers ---

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Escape a field value for CSV (wrap in quotes, escape internal quotes)
function csvField(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

// --- Fetch helpers ---

async function fetchJson(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Parse company slug and job ID from a Greenhouse URL
// Handles both job-boards.greenhouse.io/{company}/jobs/{id} and
// boards.greenhouse.io/{company}/jobs/{id}
function parseGreenhouseUrl(url) {
  const m = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
  if (!m) return null;
  return { company: m[1], jobId: m[2] };
}

// Parse company slug and posting ID from a Lever URL
// handles jobs.lever.co/{company}/{uuid}
function parseLeverUrl(url) {
  const m = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/);
  if (!m) return null;
  return { company: m[1], postingId: m[2] };
}

async function fetchGreenhouseDescription(url) {
  const parsed = parseGreenhouseUrl(url);
  if (!parsed) return '';
  const apiUrl = `https://boards.greenhouse.io/v1/boards/${parsed.company}/jobs/${parsed.jobId}`;
  const data = await fetchJson(apiUrl);
  if (!data || !data.content) return '';
  return stripHtml(data.content);
}

async function fetchLeverDescription(url) {
  const parsed = parseLeverUrl(url);
  if (!parsed) return '';
  const apiUrl = `https://api.lever.co/v0/postings/${parsed.company}/${parsed.postingId}`;
  const data = await fetchJson(apiUrl);
  if (!data) return '';
  // Lever returns description (HTML) + lists (arrays of bullet sections)
  let text = stripHtml(data.description || '');
  if (Array.isArray(data.lists)) {
    for (const section of data.lists) {
      if (section.text) text += `\n\n${section.text}:\n`;
      if (section.content) text += stripHtml(section.content);
    }
  }
  if (data.additional) text += '\n\n' + stripHtml(data.additional);
  return text.trim();
}

async function fetchDescription(source, url) {
  if (source === 'greenhouse') return fetchGreenhouseDescription(url);
  if (source === 'lever') return fetchLeverDescription(url);
  return '';
}

// --- CSV parsing (minimal — handles quoted fields) ---

function parseCSV(content) {
  const lines = content.split('\n').filter(Boolean);
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// --- Main ---

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('jobs_raw.csv not found at', CSV_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const { headers, rows } = parseCSV(raw);

  // Add job_description column if not already present
  const descIdx = headers.indexOf('job_description');
  const hasDescCol = descIdx !== -1;
  if (!hasDescCol) headers.push('job_description');

  const sourceIdx = headers.indexOf('source');
  const urlIdx = headers.indexOf('url');
  const targetDescIdx = hasDescCol ? descIdx : headers.length - 1;

  console.log(`\nEnriching ${rows.length} jobs with full descriptions...\n`);

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existing = hasDescCol ? row[descIdx] : '';

    // Skip if already has a description
    if (existing && existing.length > 20) {
      skipped++;
      process.stdout.write(`  [${i + 1}/${rows.length}] SKIP (already has description)\n`);
      continue;
    }

    const source = row[sourceIdx];
    const url = row[urlIdx];
    const title = row[1] || '?';

    process.stdout.write(`  [${i + 1}/${rows.length}] Fetching: ${title.slice(0, 60)}...`);

    const desc = await fetchDescription(source, url);

    if (desc && desc.length > 20) {
      if (!hasDescCol) row.push(desc);
      else row[descIdx] = desc;
      fetched++;
      process.stdout.write(` OK (${desc.length} chars)\n`);
    } else {
      if (!hasDescCol) row.push('');
      else row[descIdx] = '';
      failed++;
      process.stdout.write(` FAILED (no description returned)\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  // Write updated CSV
  const outLines = [
    headers.map(csvField).join(','),
    ...rows.map(row => {
      // Pad row to header length if needed
      while (row.length < headers.length) row.push('');
      return row.map(csvField).join(',');
    }),
  ];

  fs.writeFileSync(CSV_PATH, outLines.join('\n'));

  console.log(`\n--- Done ---`);
  console.log(`Fetched:  ${fetched}`);
  console.log(`Skipped:  ${skipped} (already had description)`);
  console.log(`Failed:   ${failed} (URL dead or API returned nothing)`);
  console.log(`\nUpdated: ${CSV_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
