# Contributing to Audit Eagle

Thanks for helping. Bug reports, docs, tests, new technology signatures and features are all welcome.

## Ways to contribute

- **Report a bug or ask a question:** open an [issue](https://github.com/crazysandy1/audit-eagle/issues) with the template.
- **Propose a feature:** open an issue first for anything large so we can agree on the approach.
- **Good first areas:** more technology signatures in `src/lib/scanner.ts`, tests for server actions, README improvements, accessibility fixes in the UI.

## Development setup

```bash
git clone https://github.com/crazysandy1/audit-eagle.git
cd audit-eagle
npm install
cp .env.example .env.local        # set AUDIT_MOCK_SCAN=true to work without API keys
npm run dev
npm test && npm run typecheck     # both must pass
```

You do not need a Gemini key to run the tests or the mock-scan mode. The AI steps need `GEMINI_API_KEY`.

## Pull request checklist

1. Fork, then branch: `git checkout -b feat/short-description`.
2. Keep the change focused. One topic per pull request.
3. Add or update tests (`tests/*.test.ts`, run with `npm test`).
4. `npm run typecheck` and `npm run build` must pass.
5. Update `README.md` and `CHANGELOG.md` (under *Unreleased*) when behaviour changes.
6. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
7. Fill in the pull-request template.

## Ground rules

- **Safety first in the scanner.** Do not weaken the SSRF guard (`assertPublicHost`) or the robots.txt check. Changes there need tests.
- **No secrets or real data.** Never commit API keys, service account files, `.env*` files, or scan results containing real people's contact details.
- **Server-only code stays server-side.** Network and file-system code lives in server actions or `src/lib`, not in client components.
- Keep the tool honest: ratings and detections must come from what was actually fetched, not from canned data (mock mode is for demos only and must stay opt-in).

## Licensing of contributions

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE) and that you have the right to submit it.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
