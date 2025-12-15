```markdown
PR 5 — UX polish, RBAC, audit trail, scheduling, observability

What this PR adds
- Audit logs table + server helper (src/lib/audit/logAction.ts).
- Schedule table + endpoints for integration schedules (POST/GET).
- Webhook receiver endpoint for BigCommerce (basic skeleton).
- Sentry initialization helper for server/worker.
- Worker: initialize Sentry.
- Metrics endpoint (/api/metrics) returning simple JSON metrics.
- Small accessible UI components: ConfirmDialog, MappingPresetSelector, ConnectorDetailsDrawer, RecentRunsPanel.
- DB migrations: audit_logs and integration_schedules SQL scripts.

Environment variables added
- SENTRY_DSN (optional): configure Sentry DSN for error reporting.
- SENTRY_TRACES_SAMPLE_RATE (optional): traces sampling rate (e.g. 0.1)
- METRICS_ENABLED (optional): enable metrics endpoint (if you want to restrict it)

Notes & Next steps
- Run DB migrations before deploying worker or using schedules.
- The schedules table is a storage of cron expressions; a separate scheduler (cron job, worker task) should poll integration_schedules and enqueue connector-sync jobs. I can implement a scheduler loop in the worker as a separate follow-up if you want.
- Webhook endpoint should validate signatures using provider secrets; implement HMAC verification in production.
- The UI components are minimal and intended to be drop-in; style and behavior can be extended to match your app.
```
