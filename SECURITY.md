# Security policy

## Supported versions

Only the latest commit on `main` is supported.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use [GitHub private vulnerability reporting](https://github.com/crazysandy1/audit-eagle/security/advisories/new). Include what you found, how to reproduce it, and the impact. We aim to reply within 7 days.

## Scope notes

- The scanner fetches URLs on the server. SSRF bypasses (reaching private or internal addresses, redirect tricks, DNS tricks) are in scope and taken seriously.
- The app has no authentication and is meant to be **self-hosted for personal use**. Running it on the open internet lets others use your server and your API quotas.
- Never commit API keys, service account files or `.env*` files. If you find one in the history, report it.
- Known limitation: the host check resolves DNS before fetching, so a DNS-rebinding attacker could in theory change the answer between the check and the fetch. Do not expose an instance to untrusted users.
