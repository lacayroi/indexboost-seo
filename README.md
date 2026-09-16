# IndexBoost SEO

IndexBoost SEO is an open-source Shopify SEO automation toolkit focused on faster indexing, technical SEO maintenance, structured data, AI-assisted metadata, and search-engine submission workflows.

It is designed for merchants, developers, and SEO practitioners who want a transparent, self-hostable foundation for automating repetitive Shopify SEO tasks while keeping control of their data and infrastructure.

## What it does

IndexBoost SEO currently includes:

- Google Indexing API submission workflows
- IndexNow submission for compatible search engines
- Automatic URL submission from Shopify webhooks
- Manual and bulk URL submission
- Indexing queue, retries, quota tracking, and submission logs
- SEO title and meta description management
- XML sitemap visibility and HTML sitemap generation
- robots.txt editing
- Broken-link scanning
- 301 redirect management
- Product structured-data / JSON-LD generation
- Image alt-text optimization workflows
- Index health monitoring
- `llms.txt` generation for AI/search discovery workflows
- AI-assisted SEO title and meta-description generation
- Billing-aware feature limits for Shopify app deployments

See [CHANGELOG.md](./CHANGELOG.md) for the current release scope and known limitations.

## Why open source?

SEO automation often requires privileged access to store content, themes, URLs, API credentials, and third-party services. IndexBoost SEO is open source so maintainers and users can inspect how these workflows behave, review security-sensitive code, contribute fixes, and adapt the project to their own infrastructure.

The project aims to be useful both as a deployable Shopify SEO application and as a reference implementation for developers building indexing and technical-SEO automation.

## Architecture

IndexBoost SEO is built with:

- TypeScript
- Remix / React
- Shopify App Bridge and Polaris
- Shopify Admin GraphQL API
- Prisma ORM
- PostgreSQL for production deployments
- Google APIs
- IndexNow
- Anthropic API for optional AI SEO features
- Docker for production deployment

Core application areas include authentication, Shopify webhooks, indexing services, queue processing, SEO utilities, billing-aware plan controls, and audit/logging workflows.

## Security model

Security is a first-class concern because the application can handle Shopify sessions, API credentials, store URLs, webhook payloads, third-party API calls, and user-controlled content.

Current safeguards include:

- Environment-variable based secret management
- `.env` files excluded from version control
- HTTP/HTTPS URL validation for submission workflows
- External request timeouts
- Sensitive-value masking in production logs
- Atomic quota and AI-credit updates
- Transaction-wrapped cleanup flows
- Non-root Docker runtime
- Dependency update automation with Dependabot
- CI checks through GitHub Actions

Known security work is tracked openly in [CHANGELOG.md](./CHANGELOG.md). Please report vulnerabilities according to [SECURITY.md](./SECURITY.md) rather than opening a public issue.

## Quick start

### Prerequisites

You will need:

- Node.js 20.19+ or 22.12+
- npm
- A Shopify Partner account and development store
- Shopify CLI
- PostgreSQL for production deployments

Optional integrations require their own credentials, such as Google Indexing API and Anthropic.

### Install

```bash
git clone https://github.com/lacayroi/indexboost-seo.git
cd indexboost-seo
npm install
cp .env.example .env
```

Fill in the required values in `.env`, then run:

```bash
npm run dev
```

For production database setup:

```bash
npm run setup:prod
```

Build the application with:

```bash
npm run build
```

## Environment variables

Use [.env.example](./.env.example) as the source of truth. Never commit real credentials.

Important variables include:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `SCOPES`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY` for optional AI features
- `SHOPIFY_BILLING_TEST`
- `NODE_ENV`
- `LOG_LEVEL`

## Development

Useful commands:

```bash
npm run dev
npm run build
npm run lint
npm run setup
npm run setup:prod
npm run smoke:postgres
```

The default branch currently tracks the v1.0 release line.

## Contributing

Contributions are welcome. Please read [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md) before opening a pull request.

Good contribution areas include:

- Security hardening
- Automated tests
- Indexing-provider integrations
- Shopify API compatibility updates
- SEO audit rules
- Accessibility and UI improvements
- Documentation
- Performance and queue reliability

Please use GitHub Issues for reproducible bugs and feature proposals. Security reports must follow [SECURITY.md](./SECURITY.md).

## Roadmap

Near-term priorities include:

- Encrypting stored third-party credentials at rest
- Rate limiting for app/API routes
- Stronger automated test coverage
- Safer distributed queue processing
- Improved indexing diagnostics
- More transparent provider/error reporting
- Additional technical SEO audit rules
- Security review of dependency and secret-handling paths

## Open-source maintenance

The repository is maintained by `lacayroi`. The maintainer is responsible for release preparation, issue triage, security fixes, dependency updates, and ongoing feature development.

For the Codex for Open Source program, the project is particularly interested in using AI-assisted maintenance for code review, security analysis, test generation, issue triage, documentation, and release-quality checks.

## License

IndexBoost SEO is released under the MIT License. See [LICENSE](./LICENSE).

## Acknowledgements

The project was originally bootstrapped from Shopify's Remix app template and has since been extended with IndexBoost SEO-specific indexing, technical SEO, AI, queueing, billing, and operational workflows.
