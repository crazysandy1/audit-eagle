# Changelog

All notable changes are recorded here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Open-source files: MIT license, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and pull-request templates.
- robots.txt support: sites that disallow `AuditEagleBot` are skipped (`AUDIT_IGNORE_ROBOTS=true` overrides).
- Unit tests for the scanner, robots parser and CSV parser (`npm test`).
- GitHub Actions workflow running tests, typecheck and build.

## [0.1.0] - 2026-10-20

### Added
- Real website scanner replacing the mock: fetches pages, detects technology, extracts contact links, with an SSRF guard.
- Gemini rating flows for design, technology and contact extraction.
- Google Sheets output with inline service-account JSON support.
- Typed `ResultRow`, `.env.example`, README.

### Fixed
- Circular `ResultRow` type and hidden build errors.
- "Download all" button is disabled while processing or when there are no results.
