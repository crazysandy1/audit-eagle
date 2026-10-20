# Audit Eagle

[![CI](https://github.com/crazysandy1/audit-eagle/actions/workflows/ci.yml/badge.svg)](https://github.com/crazysandy1/audit-eagle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

An open-source website audit and lead-research tool. Upload a CSV of website URLs and Audit Eagle visits each site, rates its design and technology with Google Gemini, pulls out a contact email and phone number, and saves the results to CSV or live into a Google Sheet. Self-host it for your own agency or freelance prospecting.

## How it works

```
CSV of URLs -> robots.txt check -> fetch page (server side) -> Gemini: design rating, tech rating, contact extraction
                                                           -> results table -> CSV download / Google Sheet rows
```

For every URL the app:

1. **Checks `robots.txt`** and skips sites that disallow the `AuditEagleBot` user agent.
2. **Scans the page.** HTML is fetched with a 12 second timeout and a 1.5 MB cap, up to 4 redirects. It records the title, meta description, technology signatures (WordPress, Shopify, Wix, Squarespace, Webflow, Next.js, React, Vue, Angular, jQuery, Bootstrap, Tailwind and more), HTTPS, responsive viewport, heading and image-alt counts, `mailto:` and `tel:` links, and a text excerpt.
3. **Rates it with Gemini** (`gemini-2.0-flash` through Genkit): design rating and comments, technology rating and comments, modernity and efficiency ratings, a technology summary, and the best contact email and phone found.
4. **Saves the row** to the on-screen table, to a batch CSV in `_audits_output/` every 200 sites, and optionally appends it to a Google Sheet (headers are created for you).

Also: processing is rate limited to 15 sites per minute, a run can be stopped at any time, and the dashboard page shows live progress.

## Responsible use

- Only scan sites you are allowed to visit. `robots.txt` is respected by default (`AUDIT_IGNORE_ROBOTS=true` overrides it; use that only with permission).
- The scanner refuses localhost, private network, link-local and cloud-metadata addresses, and re-checks after every redirect.
- Contact details are collected for research. Anti-spam and data-protection laws (CAN-SPAM, GDPR, India's DPDP Act and others) apply to outreach, so check them before you email or call anyone.
- **Self-host only.** The app has no login. Do not expose a public instance, or anyone can use your server and your Gemini quota to fetch arbitrary sites.

## Tech stack

Next.js 15 (App Router, server actions), React 18, TypeScript, Tailwind CSS with shadcn/ui, Genkit with Google AI (Gemini), `googleapis` for Google Sheets, `node:test` with `tsx` for tests.

## Getting started

Requirements: Node.js 20+, a [Gemini API key](https://aistudio.google.com/apikey), and (optional) a Google Cloud service account for Sheets.

```bash
git clone https://github.com/crazysandy1/audit-eagle.git
cd audit-eagle
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3000
```

Upload a `.csv` file with one URL per line (first column; a `url` or `website` header row is skipped). Entries without a scheme, such as `example.com`, are accepted. To try the app without touching real sites, set `AUDIT_MOCK_SCAN=true`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini key for the rating and extraction flows |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | for Sheets | Service account key JSON on one line. Best for hosting. |
| `GOOGLE_APPLICATION_CREDENTIALS_PATH` | for Sheets (alternative) | Path to a key file, for local use only |
| `AUDIT_MOCK_SCAN` | no | `true` returns canned sample data instead of fetching sites (demos, offline work) |
| `AUDIT_IGNORE_ROBOTS` | no | `true` skips the robots.txt check. Use only with permission. |

### Google Sheets output

1. In Google Cloud, enable the **Google Sheets API** and create a **service account** with a JSON key.
2. Share your spreadsheet with the service account's `client_email` as **Editor**.
3. Paste the sheet URL into the app. Rows go to a tab named `Sheet1`.

Never commit key files or `.env*` files. Both are git-ignored.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests for the scanner and CSV parser |
| `npm run typecheck` | TypeScript check |
| `npm run genkit:dev` | Genkit developer UI for the AI flows |

## Project layout

```
src/app/page.tsx        Upload, processing loop, rate limiting, batches, downloads
src/app/dashboard       Live progress and status counts
src/app/actions.ts      Server actions: scanWebsite, appendDataToGoogleSheet, saveBatchCSVToServer
src/lib/scanner.ts      Fetching, SSRF guard, robots.txt, HTML analysis (technology, contacts)
src/lib/csvUtils.ts     CSV parsing and generation
src/ai/flows            Genkit flows: design rating, technology rating, contact extraction
src/types/audit.ts      ResultRow type
tests/                  Unit tests (node:test)
```

## Limitations and roadmap

Good places to contribute (see [CONTRIBUTING.md](CONTRIBUTING.md)):

- The scanner reads server-rendered HTML only. A Playwright rendering mode would cover sites built in the browser.
- Runs live in the open browser tab. A server-side queue would let runs survive closing it.
- Technology detection uses simple signatures and can miss or misreport. More signatures welcome.
- Optional access token or login for hosted use.
- Screenshots per site, more output formats (JSON, Airtable), and more tests for the server actions.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security issues as described in [SECURITY.md](SECURITY.md). Changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE). Copyright (c) 2026 Sandeep J S and Audit Eagle contributors.
