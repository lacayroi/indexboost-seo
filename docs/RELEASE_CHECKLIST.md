# IndexBoost SEO — Release Checklist

**App:** IndexBoost SEO (Shopify Embedded App)  
**Last Updated:** 2026-05-20  
**Release Version:** ___  
**Release Date:** ___  
**Release Engineer:** ___  
**Reviewer / Approver:** ___  
**Environment:** Production / Staging (circle one)  

---

## How to Use This Checklist

- Complete every section in order — do not skip sections.
- Mark `[x]` when an item is verified and passing.
- Mark `[BLOCKED]` if an item is blocked by an external dependency — note the blocker inline.
- Mark `[N/A]` only when a section genuinely does not apply to this release (e.g. no DB migrations this release).
- Do not mark release as ready until ALL Critical items are checked.
- Items marked **[MUST]** are release blockers. Do not deploy without these.

---

## 1. Pre-Release Code Checks

- [ ] **[MUST]** TypeScript: 0 type errors
  ```bash
  npm run tsc --noEmit
  ```
  Result: ___

- [ ] **[MUST]** Lint: 0 lint errors
  ```bash
  npm run lint
  ```
  Result: ___

- [ ] **[TODO]** No automated test suite exists for this project. This is a known gap.
  - Unit tests for billing callbacks, webhook HMAC validation, plan guards, and queue retry logic should be added before the next major release.
  - Track as: **TODO — add test suite (Jest + @shopify/shopify-app-remix test utilities)**

- [ ] **[MUST]** Production build passes without errors
  ```bash
  npm run build
  ```
  Result: ___

- [ ] **[MUST]** No secrets committed to the repository
  ```bash
  git grep -r "SHOPIFY_API_SECRET\|ANTHROPIC_API_KEY\|DATABASE_URL\|GOOGLE_CLIENT_SECRET" \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    -- ':!*.env*' ':!*.example*'
  ```
  Expected: No matches. Actual result: ___

- [ ] `package.json` version field is bumped to the new release version
  - Previous version: ___
  - New version: ___

- [ ] `CHANGELOG.md` is updated with the new version, release date, and a summary of changes
  - [ ] Breaking changes are documented (if any)
  - [ ] New features are documented
  - [ ] Bug fixes are documented
  - [ ] The "Unreleased" section has been moved to the new version heading

---

## 2. Database

- [ ] **[MUST]** No pending migrations exist
  ```bash
  npx prisma migrate status
  ```
  Expected: "All migrations have been applied." Actual: ___

- [ ] **[MUST]** No schema drift between Prisma schema and the database
  ```bash
  npx prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-database-schema-datasource-url $DATABASE_URL
  ```
  Expected: No differences. Actual: ___

- [ ] **[MUST]** Database backup taken before running migrations
  - Backup taken at: ___
  - Backup location: ___
  - Backup verified (can be restored): [ ]

- [ ] **[MUST]** New migration(s) tested on staging database first
  - Staging migration result: ___
  - Staging app smoke test after migration: [ ] Pass / [ ] Fail

- [ ] Migration deploy command is ready and confirmed
  ```bash
  npx prisma migrate deploy
  ```
  (Or via the `prisma:prod:migrate-deploy` npm script if defined in `package.json`)

- [ ] Rollback plan for database migration is documented (can the migration be reversed? Is it destructive?)
  - Migration is reversible: [ ] Yes / [ ] No
  - If not reversible, rollback requires restoring from backup (confirm backup exists above)

---

## 3. Docker

- [ ] **[MUST]** `docker build` completes without errors
  ```bash
  docker build -t indexboost-seo:release-{version} .
  ```
  Build result: ___

- [ ] **[MUST]** Container starts successfully and HEALTHCHECK passes
  ```bash
  docker run --env-file .env -p 3000:3000 --name indexboost-test indexboost-seo:release-{version}
  docker inspect indexboost-test --format='{{.State.Health.Status}}'
  ```
  Expected: `healthy`. Actual: ___

- [ ] **[MUST]** Container runs as a non-root user (security requirement)
  ```bash
  docker run --rm indexboost-seo:release-{version} whoami
  ```
  Expected: A non-root user (e.g. `node` or `appuser`). Actual: ___

- [ ] `docker-compose.postgres.yml` starts without error and PostgreSQL health check passes
  ```bash
  docker compose -f docker-compose.postgres.yml up -d
  docker compose -f docker-compose.postgres.yml ps
  ```
  Postgres health status: ___

- [ ] Docker image is tagged correctly and pushed to the container registry
  - Registry: ___
  - Image tag: ___
  - Push confirmed: [ ]

---

## 4. Shopify App Configuration

- [ ] **[MUST]** `shopify.app.toml` configuration is valid
  ```bash
  npx shopify app config validate
  ```
  Result: ___

- [ ] **[MUST]** All required webhooks are declared in `shopify.app.toml` and are delivering successfully
  - Check the Shopify Partner Dashboard → App → Webhooks
  - [ ] `products/create` — delivering
  - [ ] `products/update` — delivering
  - [ ] `products/delete` — delivering
  - [ ] `collections/create` — delivering
  - [ ] `collections/update` — delivering
  - [ ] `collections/delete` — delivering
  - [ ] `pages/create` — delivering
  - [ ] `pages/update` — delivering
  - [ ] `pages/delete` — delivering
  - [ ] `articles/create` — delivering
  - [ ] `articles/update` — delivering
  - [ ] `articles/delete` — delivering
  - [ ] `app/uninstalled` — delivering
  - [ ] `app/scopes_update` — delivering
  - [ ] `customers/data_request` (GDPR) — delivering
  - [ ] `customers/redact` (GDPR) — delivering
  - [ ] `shop/redact` (GDPR) — delivering

- [ ] **[MUST]** OAuth flow tested on a development store end-to-end
  - Test store: ___
  - OAuth result: [ ] Pass / [ ] Fail

- [ ] **[MUST]** Embedded app loads correctly inside Shopify Admin
  - No blank page on load: [ ]
  - No console errors on load: [ ]
  - Session token is obtained successfully: [ ]

- [ ] App Bridge navigation works (no full page reloads when changing routes)
  - Tested routes: ___

- [ ] Polaris CSS styles load correctly (no unstyled components)

---

## 5. Billing

- [ ] **[MUST]** `SHOPIFY_BILLING_TEST` is set to `false` in the production environment
  - Confirm: `grep SHOPIFY_BILLING_TEST .env.production` (or check your secrets manager)
  - Value: ___

- [ ] **[MUST]** Shopify subscription charge flow tested on a development store
  - [ ] Free → Pro upgrade: charge amount $9.95/mo confirmed
  - [ ] Pro → Business upgrade: charge amount $19.95/mo confirmed
  - [ ] Old subscription cancelled on upgrade confirmed
  - [ ] Shop plan updated in DB after each upgrade confirmed

- [ ] **[MUST]** Upgrade Free → Pro confirmed working end-to-end
  - Test result: [ ] Pass / [ ] Fail
  - Test store: ___

- [ ] **[MUST]** Upgrade Pro → Business confirmed working end-to-end
  - Test result: [ ] Pass / [ ] Fail

- [ ] Cancel subscription confirmed working end-to-end
  - Plan resets to FREE: [ ]
  - Test result: [ ] Pass / [ ] Fail

- [ ] **[MUST]** Billing callback (return URL) works correctly
  - Callback URL is reachable from Shopify: [ ]
  - Plan is updated in DB after callback: [ ]

---

## 6. Webhooks

- [ ] **[MUST]** `app/uninstalled` webhook handler deletes all shop data
  - Tested on: ___
  - Sessions deleted: [ ]
  - Shop record deleted (or marked inactive): [ ]
  - Queue jobs cancelled: [ ]
  - Active subscription cancelled: [ ]

- [ ] **[MUST]** `customers/data_request` GDPR webhook returns HTTP 200
  - Test method: Shopify CLI / Partner Dashboard test delivery
  - Response status: ___
  - Response body confirms no PII stored: [ ]

- [ ] **[MUST]** `customers/redact` GDPR webhook returns HTTP 200
  - Response status: ___

- [ ] **[MUST]** `shop/redact` GDPR webhook deletes all shop data and returns HTTP 200
  - Response status: ___
  - All shop data deleted verified: [ ]

- [ ] **[MUST]** `products/create` webhook triggers a queue job
  - Test result: [ ] Pass / [ ] Fail

- [ ] **[MUST]** Webhook HMAC validation is active
  - Confirmed by sending a request with an invalid HMAC → received 401: [ ]
  - Shopify library is used for HMAC validation (not custom implementation): [ ]

---

## 7. Queue

- [ ] **[MUST]** Queue worker processes jobs successfully in the production environment
  - Triggered a product/create webhook and confirmed job ran to completion: [ ]
  - Log entry shows success: [ ]

- [ ] Retry with exponential backoff confirmed
  - Simulated a failing job and confirmed retry intervals increase: [ ]
  - Max attempt limit respected: [ ]

- [ ] Daily Google Indexing API quota reset confirmed working
  - Quota counter resets at midnight UTC: [ ]
  - Paused jobs resume after reset: [ ]

- [ ] Permanent failure is logged correctly
  - After max retries, job status is `FAILED_PERMANENT` (or equivalent): [ ]
  - Failure reason and attempt count are visible in the Logs page: [ ]

---

## 8. Security

- [ ] **[MUST]** No secrets committed in any `.ts` or `.tsx` file
  ```bash
  git grep -r "SHOPIFY_API_SECRET\|ANTHROPIC_API_KEY\|DATABASE_URL\|sk-ant-\|refresh_token" \
    --include="*.ts" --include="*.tsx"
  ```
  Expected: No matches. Result: ___

- [ ] **[MUST]** `SHOPIFY_API_SECRET` does not appear in any TypeScript source file
  - Verified: [ ]

- [ ] No `console.log` statements print credential values (API keys, tokens, secrets)
  ```bash
  git grep -n "console.log.*secret\|console.log.*token\|console.log.*api_key\|console.log.*password" \
    --include="*.ts" --include="*.tsx"
  ```
  Expected: No matches. Result: ___

- [ ] **[MUST]** Docker container runs as non-root user
  - Verified in section 3: [ ]

- [ ] Server-side plan enforcement is active (plan not trusted from client request body)
  - Tested: Pro/Business features reject requests from lower-plan shops at the API level: [ ]

- [ ] Session token validation is active on all authenticated routes
  - Tested: Unauthenticated request to a protected route returns redirect to OAuth: [ ]

---

## 9. GDPR Compliance

- [ ] **[MUST]** All 3 GDPR webhooks are registered in `shopify.app.toml`
  - `customers/data_request`: [ ]
  - `customers/redact`: [ ]
  - `shop/redact`: [ ]

- [ ] **[MUST]** No customer PII (name, email, address) is stored in the database
  - Review all Prisma models — confirm no PII fields exist: [ ]
  - If PII must be stored (e.g. email for alerts), confirm `customers/redact` and `shop/redact` delete it: [ ]

- [ ] **[MUST]** `shop/redact` deletes ALL shop data
  - Tables checked: `Session`, `Shop`, `ShopSettings`, `IndexQueue`, `IndexLog`, Google credentials table
  - All confirmed deleted: [ ]

- [ ] GDPR compliance was verified using the GDPR test cases (TC-018, TC-019, TC-029): [ ]

---

## 10. Post-Deploy Verification

Run these checks immediately after deploying to production.

- [ ] **[MUST]** Health endpoint returns HTTP 200
  ```bash
  curl -f https://{app-domain}/healthz
  ```
  Result: ___

- [ ] **[MUST]** Application logs show successful startup (no errors on startup)
  ```bash
  docker logs {container-name} | tail -50
  ```
  Startup errors: None / _(list any)_ ___

- [ ] **[MUST]** Queue worker is running and picking up jobs
  - Evidence (log line showing worker active): ___

- [ ] **[MUST]** Test store can install the app (fresh install on a clean development store)
  - Test store: ___
  - Install result: [ ] Pass / [ ] Fail

- [ ] **[MUST]** Billing flow works in production
  - Upgrade Free → Pro tested: [ ] Pass / [ ] Fail
  - (Use a real Shopify development store charge with `SHOPIFY_BILLING_TEST=false`)

- [ ] Embedded app loads inside Shopify Admin on production
  - No blank page: [ ]
  - No JS console errors: [ ]
  - Navigation works: [ ]

- [ ] Rollback procedure is confirmed ready (see Rollback section)

---

## 11. Rollback Plan

> Complete this section BEFORE deploying. Do not deploy if rollback is not ready.

- [ ] Previous Docker image tag noted:
  - Previous stable image tag: ___

- [ ] Database backup location confirmed:
  - Backup path / URL: ___
  - Backup timestamp: ___
  - Backup size (sanity check): ___

- [ ] Rollback tested in staging environment
  - Rollback test result: [ ] Pass / [ ] Fail / [ ] Not tested (explain why): ___

- [ ] Rollback command is ready and documented:
  ```bash
  # Example rollback command — update with actual values before release:
  docker pull registry/{image}:{previous-tag}
  docker stop {container-name}
  docker rm {container-name}
  docker run -d --env-file .env.production \
    --name {container-name} \
    -p 3000:3000 \
    registry/{image}:{previous-tag}
  ```
  - Actual rollback command for this release: documented in `ROLLBACK_PLAN.md`: [ ]

- [ ] If DB migration is included in this release, database restore command is ready:
  ```bash
  # Restore from backup — update with actual backup file path:
  pg_restore -d $DATABASE_URL /path/to/backup.dump
  ```
  - Restore command for this release: documented in `ROLLBACK_PLAN.md`: [ ]

- [ ] Team is notified of rollback procedure and who has permission to execute it
  - On-call engineer: ___
  - Rollback authorization: ___

---

## 12. Final Sign-off

| Section | Checked By | Date | Status |
|---------|------------|------|--------|
| 1. Pre-Release Code Checks | | | |
| 2. Database | | | |
| 3. Docker | | | |
| 4. Shopify App Configuration | | | |
| 5. Billing | | | |
| 6. Webhooks | | | |
| 7. Queue | | | |
| 8. Security | | | |
| 9. GDPR Compliance | | | |
| 10. Post-Deploy Verification | | | |
| 11. Rollback Plan | | | |

**Release Approved By:** ___  
**Approval Date:** ___  
**Deployed At:** ___  
**Deployed By:** ___  

> If any **[MUST]** item is not checked, the release is BLOCKED. Do not deploy until all **[MUST]** items are resolved.
