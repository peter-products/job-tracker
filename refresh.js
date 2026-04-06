// refresh.js — Daily job board refresh using public Greenhouse and Lever APIs
// Run with: node refresh.js
// No external dependencies — uses Node.js built-in fetch and fs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---

const SEEN_IDS_PATH = path.join(__dirname, 'data', 'seen_ids.json');
const DATA_DIR = path.join(__dirname, 'data');

// Title filter: only surface PM/product leadership roles
const TITLE_KEYWORDS = [
  'product manager',
  'director of product',
  'vp of product',
  'vp product',
  'head of product',
  'principal pm',
  'staff pm',
  'lead pm',
  'product lead',
  'product management',
];

// Target companies to poll each run
const TARGET_COMPANIES = {
  greenhouse: [
    // GTM data / sales intelligence
    'apolloio', 'demandbase', 'signifyd95', 'gongio', 'seamlessai',
    // Data platform / modern data stack
    'hightouch', 'fivetran', 'dbtlabsinc', 'grafanalabs', 'reltio',
    'algolia', 'celonis', 'atlan', 'mixpanel',
    // Growth / monetization
    'brex', 'calendly', 'klaviyo', 'braze', 'stripe', 'webflow',
    // Analytics / product intelligence
    'amplitude', 'newrelic',
    // Platform / infrastructure
    'twilio', 'gleanwork',
    // B2B SaaS
    'samsara', 'smartsheet', 'manychat', 'splice',
    // Additional relevant companies
    'zapier',             // automation platform
    'intercom',           // customer messaging + data
    'pendo',              // product analytics
    'mparticle',          // CDP / data platform
    'rudderstack',        // CDP / event streaming
    'census',             // reverse ETL / data activation
    'metabase',           // data analytics / BI
    'looker',             // BI (via Google, worth checking)
    'thoughtspot',        // AI analytics
    'sisense',            // analytics / data platform
    'drift',              // conversational marketing
    'qualified',          // pipeline intelligence
    'chili-piper',        // revenue operations
    'salesloft',          // sales engagement
    'outreach',           // sales engagement (greenhouse board)
    'recordinc',          // Recorded Future
    // Verified — actually on Greenhouse (not Ashby)
    'mercury',            // fintech banking
    'retool',             // internal tools
    'airtable',           // data / no-code platform
    'figma',              // design (large PM team)
    'realtimeboardglobal', // Miro
    'descript',           // media / AI
    'scaleai',            // Scale AI — data labeling / AI infra
    'togetherai',         // Together AI — AI infra
    'typeform',           // data collection
  ],
  lever: [
    // GTM / sales intelligence
    'outreach', 'clari', 'people-ai', 'captivateiq', 'spekit',
    // Data / analytics
    'findem', 'atlan', 'contentsquare', 'levelai', 'valence',
    // Growth / monetization
    'rover', 'toptal', 'gohighlevel', 'useinsider',
    // Other
    'medallia', 'happyco', 'aledade', 'jobgether',
    // Additional
    'bombora',      // B2B intent data
    'lusha',        // B2B contact data
    'cognism',      // B2B data
    'rollworks',    // ABM platform
    'clearbit',     // data enrichment (now HubSpot)
    'commonroom',   // community intelligence
    'warmly',       // pipeline intelligence
    'fullstory',    // session analytics (now Contentsquare)
    'heap',         // product analytics (now Contentsquare)
    'pagerduty',    // operations platform
    'useloom',      // Loom — video messaging (verified slug)
    'notion',       // collaboration
    'linear',       // project management
    'mistral',      // AI models (verified on Lever)
    'appcues-2',    // product adoption / onboarding (verified slug)
  ],
  // Ashby — fast-growing ATS used by many top-tier startups
  // API: https://api.ashbyhq.com/posting-api/job-board/{company}
  // All slugs below are VERIFIED to return job data
  ashby: [
    'claylabs',     // Clay — B2B data enrichment (slug: claylabs, not clay)
    'ramp',         // fintech / spend management
    'vanta',        // compliance / trust data
    'perplexity',   // AI search
    'cohere',       // enterprise AI
    'Replit',       // coding platform (slug is case-sensitive: capital R)
    'runway-ml',    // AI video (slug: runway-ml, not runway)
    'zip',          // procurement / spend
    'anyscale',     // Ray / distributed AI infra
  ],
};

// --- Helpers ---

function loadSeenIds() {
  if (!fs.existsSync(SEEN_IDS_PATH)) {
    return { ids: [], last_run: '' };
  }
  return JSON.parse(fs.readFileSync(SEEN_IDS_PATH, 'utf8'));
}

function saveSeenIds(data) {
  fs.writeFileSync(SEEN_IDS_PATH, JSON.stringify(data, null, 2));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function isProductRole(title) {
  const lower = title.toLowerCase();
  return TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Fetch with a simple timeout and error swallow — we don't want one dead
// company API to abort the whole run
async function fetchJson(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- HTML stripping ---

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

// --- Description fetchers ---

async function fetchGreenhouseDescription(company, jobId) {
  const data = await fetchJson(
    `https://boards.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
  );
  return data?.content ? stripHtml(data.content) : '';
}

async function fetchAshbyDescription(company, postingId) {
  // Ashby detail endpoint returns the full posting including descriptionHtml
  const data = await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${company}/posting-detail?jobPostingId=${postingId}`
  );
  return data?.jobPosting?.descriptionHtml
    ? stripHtml(data.jobPosting.descriptionHtml)
    : '';
}

async function fetchLeverDescription(company, postingId) {
  const data = await fetchJson(
    `https://api.lever.co/v0/postings/${company}/${postingId}`
  );
  if (!data) return '';
  let text = stripHtml(data.description || '');
  if (Array.isArray(data.lists)) {
    for (const s of data.lists) {
      if (s.text) text += `\n\n${s.text}:\n`;
      if (s.content) text += stripHtml(s.content);
    }
  }
  if (data.additional) text += '\n\n' + stripHtml(data.additional);
  return text.trim();
}

// --- Ashby ---
// Public API: https://api.ashbyhq.com/posting-api/job-board/{company}
// Returns: { jobPostings: [{ id, title, jobUrl, isRemote, publishedAt, ... }] }

async function fetchAshbyJobs(company) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company}`;
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.jobPostings)) return [];

  return data.jobPostings
    .filter((j) => isProductRole(j.title))
    .map((j) => ({
      id: `ash_${company}_${j.id}`,
      title: j.title,
      company,
      url: j.jobUrl,
      source: 'ashby',
      _postingId: j.id,
      date_found: today(),
    }));
}

// --- Greenhouse ---
// Public API: https://boards.greenhouse.io/v1/boards/{company}/jobs
// Returns: { jobs: [{ id, title, absolute_url, updated_at, ... }] }

async function fetchGreenhouseJobs(company) {
  const url = `https://boards.greenhouse.io/v1/boards/${company}/jobs`;
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.jobs)) return [];

  return data.jobs
    .filter((j) => isProductRole(j.title))
    .map((j) => ({
      id: `gh_${company}_${j.id}`,
      title: j.title,
      company,
      url: j.absolute_url,
      source: 'greenhouse',
      _jobId: String(j.id),
      date_found: today(),
    }));
}

// --- Lever ---
// Public API: https://api.lever.co/v0/postings/{company}?mode=json
// Returns: [{ id, text (title), hostedUrl, ... }]

async function fetchLeverJobs(company) {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  const data = await fetchJson(url);
  if (!Array.isArray(data)) return [];

  return data
    .filter((j) => isProductRole(j.text))
    .map((j) => ({
      id: `lv_${company}_${j.id}`,
      title: j.text,
      company,
      url: j.hostedUrl,
      source: 'lever',
      _postingId: j.id,
      date_found: today(),
    }));
}

// --- Main ---

async function main() {
  console.log(`\nJob refresh — ${today()}\n`);

  const seen = loadSeenIds();
  const seenSet = new Set(seen.ids);

  const allJobs = [];

  // Poll Greenhouse companies
  console.log(`Polling ${TARGET_COMPANIES.greenhouse.length} Greenhouse boards...`);
  for (const company of TARGET_COMPANIES.greenhouse) {
    const jobs = await fetchGreenhouseJobs(company);
    allJobs.push(...jobs);
    if (jobs.length > 0) {
      process.stdout.write(`  ${company}: ${jobs.length} PM role(s)\n`);
    }
  }

  // Poll Lever companies
  console.log(`\nPolling ${TARGET_COMPANIES.lever.length} Lever boards...`);
  for (const company of TARGET_COMPANIES.lever) {
    const jobs = await fetchLeverJobs(company);
    allJobs.push(...jobs);
    if (jobs.length > 0) {
      process.stdout.write(`  ${company}: ${jobs.length} PM role(s)\n`);
    }
  }

  // Poll Ashby companies
  console.log(`\nPolling ${TARGET_COMPANIES.ashby.length} Ashby boards...`);
  for (const company of TARGET_COMPANIES.ashby) {
    const jobs = await fetchAshbyJobs(company);
    allJobs.push(...jobs);
    if (jobs.length > 0) {
      process.stdout.write(`  ${company}: ${jobs.length} PM role(s)\n`);
    }
  }

  // Find net-new jobs
  const newJobs = allJobs.filter((j) => !seenSet.has(j.id));

  console.log(`\n--- Results ---`);
  console.log(`Total PM roles seen today: ${allJobs.length}`);
  console.log(`Net new (not seen before): ${newJobs.length}\n`);

  if (newJobs.length > 0) {
    console.log('New jobs — fetching descriptions...\n');

    for (let i = 0; i < newJobs.length; i++) {
      const job = newJobs[i];
      process.stdout.write(`  [${i + 1}/${newJobs.length}] ${job.title.slice(0, 60)}...`);

      let desc = '';
      if (job.source === 'greenhouse' && job._jobId) {
        desc = await fetchGreenhouseDescription(job.company, job._jobId);
      } else if (job.source === 'lever' && job._postingId) {
        desc = await fetchLeverDescription(job.company, job._postingId);
      } else if (job.source === 'ashby' && job._postingId) {
        desc = await fetchAshbyDescription(job.company, job._postingId);
      }

      job.job_description = desc;
      // Clean up internal-only fields before saving
      delete job._jobId;
      delete job._postingId;

      process.stdout.write(desc ? ` OK (${desc.length} chars)\n` : ` no description\n`);
      await new Promise(r => setTimeout(r, 150));
    }

    console.log('\nNew jobs summary:\n');
    for (const job of newJobs) {
      console.log(`  [${job.source.toUpperCase()}] ${job.title}`);
      console.log(`  Company: ${job.company}`);
      console.log(`  URL:     ${job.url}`);
      console.log('');
    }

    // Save net-new jobs to dated file
    const outPath = path.join(DATA_DIR, `new_jobs_${today()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(newJobs, null, 2));
    console.log(`Saved to: ${outPath}`);
  } else {
    console.log('No new PM roles found today.');
  }

  // Update seen_ids — add all IDs seen this run (new + already known)
  const updatedIds = [...new Set([...seen.ids, ...allJobs.map((j) => j.id)])];
  saveSeenIds({ ids: updatedIds, last_run: today() });

  console.log(`\nseen_ids.json updated — ${updatedIds.length} total tracked IDs.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
