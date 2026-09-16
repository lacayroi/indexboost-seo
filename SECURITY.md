# Security Policy

## Supported versions

Security fixes are currently maintained on the active v1.x release line.

## Reporting a vulnerability

Please do not open a public GitHub issue for suspected security vulnerabilities.

Instead, contact the maintainer privately through the contact method listed on the maintainer's GitHub profile and include:

- A clear description of the issue
- Affected file(s), endpoint(s), or workflow(s)
- Reproduction steps or proof of concept when available
- Expected impact
- Any suggested remediation

Please avoid including real API keys, access tokens, Shopify credentials, customer data, or other secrets in reports.

## Security-sensitive areas

IndexBoost SEO interacts with security-sensitive components including:

- Shopify OAuth sessions and webhooks
- Store content and theme write operations
- Google API credentials
- IndexNow keys
- Optional AI provider credentials
- PostgreSQL persistence
- User-provided URLs and externally fetched resources
- Billing and usage limits

Security review is especially welcome around credential handling, authorization boundaries, SSRF/input validation, webhook verification, logging, dependency risks, rate limiting, and queue concurrency.

## Current hardening

The project currently includes measures such as environment-based secret management, URL validation, external request timeouts, sensitive log masking, atomic quota updates, transaction-protected operations, non-root containers, CI checks, and Dependabot configuration.

Known limitations and planned hardening work are documented in `CHANGELOG.md` and the project roadmap.

## Disclosure

The maintainer will make a best effort to acknowledge valid reports, investigate impact, prepare a fix, and coordinate disclosure after a patched release is available.
