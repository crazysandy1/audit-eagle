# Audit Eagle

A website audit and lead-research tool. Upload a CSV of website URLs and Audit Eagle visits each site, rates its design and technology with Google Gemini, pulls out a contact email and phone number, and writes the results to a CSV file or live into a Google Sheet. Useful for agencies and freelancers who want to find businesses with outdated sites and a way to reach them.

> **Private project.** This is a working business tool, so the repository is private and not licensed for reuse.

## How it works

```
CSV of URLs  ->  fetch page (server side)  ->  Gemini: design rating, tech rating, contact extraction
                                            ->  results table  ->  CSV download / Google Sheet rows
```

For every URL the app:

1. **Scans the page.** It fetches the HTML with a 12 second timeout and a 1.5 MB cap, follows up to 4 redirects, and records the title, meta description, technology signatures (WordPress, Shopify, Wix, Squarespace, Webflow, Next.js, React, Vue, Angular, jQuery, Bootstrap, Tailwind and more), HTTPS, responsive viewport, heading and image-alt counts, any mailto and tel links, and a text excerpt.
2. **Rates it with Gemini** (`gemini-2.0-flash` through Genkit): design rating and comments, technology rating and comments, modernity and efficiency ratings, a technology summary, and the best contact email and phone found.
3. **Saves the row** to the on-screen table, to a batch CSV in `_audits_output/` every 200 sites, and optionally appends it to a Google Sheet (headers are created automatically).

Other behaviour: API calls are rate limited to 15 sites per minute, the run can be stopped at any time, and the dashboard page shows live progress counts.

### Safety of the scanner

The server only fetches `http` and `https` URLs and refuses localhost, private network, link-local and cloud-metadata addresses, re-checking after every redirect. Only scan sites you are allowed to visit, respect each site's terms, and follow local rules on contacting people you find (anti-spam and data-protection laws apply to outreach).

## Tech stack

Next.js 15 (App Router, server actions), React 18, TypeScript, Tailwind CSS with shadcn/ui, Genkit with Google AI (Gemini), `googleapis` for Google Sheets.

## Getting started

Requirements: Node.js 18+, a [Gemini API key](https://aistudio.google.com/apikey), and (optional) a Google Cloud service account for Sheets.

```bash
git clone https://github.com/crazysandy1/audit-eagle.git
cd audit-eagle
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3000
```

Upload a `.csv` file with one URL per line (first column; a `url` or `website` header row is skipped). Scheme-less entries such as `example.com` are accepted.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini key for the rating and extraction flows |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | for Sheets | The service account key JSON as one line. Best for hosting. |
| `GOOGLE_APPLICATION_CREDENTIALS_PATH` | for Sheets (alternative) | Path to a service account key file, for local use only |
| `AUDIT_MOCK_SCAN` | no | `true` returns canned sample data instead of fetching sites (demos, offline work) |

### Google Sheets output

1. In Google Cloud, enable the **Google Sheets API** and create a **service account** with a JSON key.
2. Share your target spreadsheet with the service account's `client_email` as **Editor**.
3. Paste the sheet URL into the app. Results go to a tab named `Sheet1`.

Never commit the key file or `.env*` files. Both are git-ignored.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check (passes) |
| `npm run genkit:dev` | Genkit developer UI for the AI flows |

## Project layout

```
src/app/page.tsx        Upload, processing loop, rate limiting, batches, downloads
src/app/dashboard       Live progress and status counts
src/app/actions.ts      Server actions: scanWebsite, appendDataToGoogleSheet, saveBatchCSVToServer
src/lib/scanner.ts      Page fetching, SSRF guard, technology and contact detection
src/lib/csvUtils.ts     CSV parsing and generation
src/ai/flows            Genkit flows: design rating, technology rating, contact extraction
src/types/audit.ts      ResultRow type
```

## Limitations and roadmap

- The scanner reads server-rendered HTML only. Sites that build everything in the browser need a headless browser (Playwright) step.
- Processing runs in the open browser tab, so keep the tab open during a run.
- Technology detection uses simple signatures and can miss or misreport.
- Next steps: Playwright rendering, a queue so runs survive tab closes, per-site screenshots, tests for the scanner and CSV parser.

## Author

Sandeep J S ([@crazysandy1](https://github.com/crazysandy1)).
