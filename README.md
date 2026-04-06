# Job Tracker

A local-first job search workspace I built to manage my own search. Tracks postings end-to-end (saved → applied → interview stages → offer), and includes a refresh script that polls public ATS APIs to surface net-new roles without scraping or paying for aggregator services.

## Why I built this

Most job tracking tools are either glorified spreadsheets or bloated CRMs designed for recruiters. I wanted something that:

- **Lives on my machine** — no SaaS, no account, no risk of someone else's product going down or getting acquired
- **Surfaces new roles automatically** — I shouldn't have to manually visit 50 company career pages every week
- **Doesn't double-show me jobs I've already seen** — most aggregators have terrible deduplication
- **Stays narrow on purpose** — only senior PM roles at companies in my target categories

## What it does

**Web app** (React + Express)
- Sortable, filterable table of every role I'm tracking
- Inline interview-stage dropdown, applied checkbox, edit/delete in place
- Stats bar (active applications, interviews scheduled, offers, rejected)
- Filter by stage, role category, company stage, remote type, LinkedIn connections
- Hyperlinks to original job posts; salary ranges and connection notes per role

**Refresh script** (Node)
- Polls Greenhouse, Lever, and Ashby public job board APIs across ~80 target companies
- Filters by title keywords (PM / Director / VP / Head of Product variants)
- Deduplicates against `seen_ids.json` so each daily run only fetches *net-new* postings
- For new postings only, fetches the full job description via the platform's detail API
- Outputs `new_jobs_YYYY-MM-DD.json` for downstream enrichment

**Why deduplication matters:** Without it, every daily run would re-fetch and re-process 5,000+ job descriptions. With it, a typical run touches 20–80 new postings — orders of magnitude cheaper to process downstream.

## Architecture decisions worth calling out

| Decision | Why |
|---|---|
| **JSON file storage** instead of SQLite | Single-user app, <500 records. `better-sqlite3` won't compile cleanly on Node 24 + Python 3.12 on my machine. JSON is simpler, version-controllable, and zero-dependency. |
| **No TypeScript** | This is a personal tool with one developer. The compile-time safety isn't worth the build complexity. |
| **Public ATS APIs only** | Greenhouse, Lever, and Ashby all expose unauthenticated job board APIs. No scraping, no rate limit games, no terms-of-service grey areas. |
| **Title filter, not LLM filter** | A regex on titles gets ~95% of the value. Running every job description through an LLM at fetch time would be slow and expensive. Better to fetch fast, then enrich downstream. |
| **Description fetching is lazy** | Only happens for net-new postings, never for re-runs. Saves ~99% of API calls on a typical day. |
| **Designed for downstream LLM processing** | The refresh script just collects raw data. A separate local LLM (Qwen 3 8B via Ollama) handles keyword extraction, summarization, and fit scoring — keeps cloud LLM token costs at zero. |

## Tech stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node 24, Express, ES modules
- **Storage**: JSON files (no database)
- **APIs polled**: Greenhouse, Lever, Ashby (public job board endpoints)

## Project structure

```
job-tracker/
├── server/
│   ├── index.js          # Express API (port 3457)
│   └── db.js             # JSON read/write helpers
├── client/               # React + Vite + Tailwind frontend
│   └── src/App.jsx       # Main UI: table, filters, modal
├── refresh.js            # On-demand ATS poller + dedup + description fetch
├── enrich_csv.js         # One-time backfill for hand-curated job CSVs
└── data/                 # (gitignored) personal job data lives here
```

## Running it locally

```bash
# install
cd job-tracker
npm install
cd client && npm install && npm run build && cd ..

# start the web app
node server/index.js
# open http://localhost:3457

# run a refresh (on demand)
node refresh.js
```

## Personal data note

This repo intentionally excludes the `data/` directory (`.gitignore`'d). All job applications, salary research, contact notes, and the `jobs.json` database stay local. The repo demonstrates the architecture and code, not anyone's actual job search.
