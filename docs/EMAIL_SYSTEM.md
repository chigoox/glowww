# Email System

Comprehensive multi-tenant email layer supporting templated + custom sends, suppression management, warm‑up caps, analytics, inbound capture, idempotency, retry/backoff, and exports.

## Overview
Components:
- Registry (`lib/email/registry.js`) – metadata & subject builders.
- Sender (`lib/email/send.js`) – orchestrates branding → render → provider → logging.
- Provider wrapper (`lib/email/provider/postmark.js`) – Postmark client with transient retry (3 attempts, jitter).
- Suppression (`/api/email/suppressions`) – CRUD for unsubscribe / manual blocks.
- Warm-up (`/api/email/warmup/stats`) – domain daily cap visibility.
- Messages (`/api/email/messages`, `/api/email/messages/[id]`) – list & detail (re-rendered HTML).
- Preview (`/api/email/templates/preview`) – render template without sending.
- Custom send (`/api/email/custom-send`) – arbitrary HTML with optional marketing unsubscribe headers.
- Inbound (`/api/email/inbound`) – webhook storage + list.
- Analytics (`/api/email/analytics/summary`) – per-site: totals, day series, template breakdown.
- Export (`/api/email/messages/export`) – CSV of recent messages.
- Idempotency (header `Idempotency-Key`) – prevents duplicate sends.

Firestore Collections:
- `emailMessages` – outbound log (status, counts, attempts, provider ids).
- `emailSuppression` – `{ email, scope, reason }`.
- `emailDailyStats` – warm-up counters (domain, date).
- `emailInbound` – captured inbound emails.
- `emailIdempotency` – key → message metadata for dedupe.

Statuses: `queued` → `sent` → (`delivered` / `opened` / `clicked`) or `bounced` / `complained`.

Event Processing: `/api/email/events` updates opensCount, clicksCount, status transitions.

## Endpoints Summary
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/api/email/send` | POST | Send registered template | Body: `{ to, templateKey, data, siteId?, tenantId?, overrideSubject? }` |
| `/api/email/custom-send` | POST | Send custom HTML | Body: `{ to, subject, html, text?, siteId?, marketing? }` |
| `/api/email/templates` | GET | List templates | key, audience, category |
| `/api/email/templates/preview` | POST | Render template preview | No send; validates requiredData |
| `/api/email/messages` | GET | List messages | Filters: `siteId,status,template,to,cursor,limit` |
| `/api/email/messages/[id]` | GET | Message detail + rendered HTML | Re-renders template safely |
| `/api/email/messages/export` | GET | CSV export | Query: `siteId,limit` |
| `/api/email/suppressions` | GET/POST/DELETE | Manage suppressions | Scopes: `site:{id}`, `platform-mkt` |
| `/api/email/warmup/stats` | GET | Domain usage vs cap | Does not increment |
| `/api/email/analytics/summary` | GET | Email analytics (30d) | Query: `siteId,days?` |
| `/api/email/inbound` | POST/GET | Inbound webhook + list | Header `x-inbound-secret` optional |

## Idempotency
Include header `Idempotency-Key: <uuid>` on `/send` or `/custom-send`. If key seen before, response returns previous `messageId`/`providerMessageId` with `reused:true`.

## Retry & Backoff
Transient Postmark error codes (sample set: 406, 407, 600, 601, 602) retried up to 3 attempts with incremental jitter (≈200ms * attempt + random 0‑150ms). Attempts count stored in message document.

## Suppression Scopes
- Site marketing/unsubscribes: `site:{siteId}`
- Platform marketing: `platform-mkt`
(Transactional templates skip suppression unless `canUnsubscribe` or category `marketing`.)

## Warm-up
`checkWarmupCap` enforces per-domain daily send limit; stats endpoint gives read-only count/cap so UI can show badge.

## Inbound
Generic webhook captures minimal fields; set `INBOUND_SECRET` to require `x-inbound-secret` header. Optional `STORE_INBOUND_RAW=1` to persist full payload (ensure PII policies).

## Security & Headers
- Internal key: set `EMAIL_INTERNAL_API_KEY` and require client to send `x-email-internal-key` for protected send endpoints.
- Unsubscribe tokens: HMAC-like token stored in unsubscribe link via `createUnsubToken`.
- Idempotency header: `Idempotency-Key` as above.
- Inbound secret: `x-inbound-secret`.

## Analytics Fields
Per message: `opensCount`, `clicksCount`, `status` transitions tracked by events route. Aggregation groups by day (ISO date) and templateKey.

## CSV Export Format
Columns: `id,to,subject,templateKey,status,sentAt,opens,clicks` (UTF-8, quoted subject only). Limit capped at 5000.

## UI Integration
- Manager Drawer (`SiteEmailManager.jsx`): Messages, Drafts, Suppressions, Inbound tabs; compose modal (template/custom); warm-up badge; suppression warning; message detail drawer; preview button; CSV export.
- Dashboard analytics modal: appended Email Analytics section with chart & template list.

## Example Requests
Template Send:
```bash
curl -X POST https://your.app/api/email/send \
  -H 'Content-Type: application/json' \
  -H 'x-email-internal-key: $EMAIL_INTERNAL_API_KEY' \
  -H 'Idempotency-Key: 123e4567-e89b-12d3-a456-426614174000' \
  -d '{"to":"user@example.com","templateKey":"account.verification","data":{"verificationUrl":"https://..."},"siteId":"SITE123"}'
```
Preview:
```bash
curl -X POST https://your.app/api/email/templates/preview \
  -H 'Content-Type: application/json' \
  -d '{"templateKey":"account.verification","data":{"verificationUrl":"https://..."},"siteId":"SITE123"}'
```
Export:
```bash
curl 'https://your.app/api/email/messages/export?siteId=SITE123&limit=500' -o emails.csv
```

## Future Enhancements (Suggested)
- Per-tenant dedicated server tokens / streams.
- Bounce & complaint automated suppression.
- Detailed engagement funnel (unique opens vs total).
- Rate limiting / quotas per plan.
- Webhook signature verification (HMAC) for inbound & events.
- Template versioning & test data sets.
- Bulk send batching / queueing.

---
Maintained as part of glowww email subsystem.
