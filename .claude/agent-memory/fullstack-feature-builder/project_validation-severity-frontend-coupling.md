---
name: validation-severity-frontend-coupling
description: DraftValidationEngine ValidationError.severity now includes 'info'; frontend drafts panel filters by exact severity string so new severities must be rendered explicitly
metadata:
  type: project
---

`DraftValidationEngine.ValidationError.severity` supports `'error' | 'warning' | 'info'` (info added 2026-05-27 to make the past-start_time notice non-alarming for duplicated campaigns).

**Why:** Duplicated campaigns almost always have a past start_time (the source ran months ago). Surfacing that as a warning was alarming for expected behavior, so it was downgraded to `info` with a reassuring message and a 5-minute grace buffer.

**How to apply:**
- `isValid` / publish-gating only ever checks `severity === 'error'` (see `validateFullDraft`, `DraftPublishService` line ~153, `WideCreationService` lines ~304-327). Non-error severities (warning, info) never block publish. `WideCreationService` buckets any non-error into `warnings`.
- The frontend `drafts/[id]/page.tsx` `ValidationIssuesPanel` and `countIssues` filter by EXACT severity string (`=== "error"`, `=== "warning"`, `=== "info"`). Any NEW severity added to the registry must also be rendered explicitly in that panel, or it will be silently dropped from the UI. `countIssues` deliberately counts only error+warning so `info` does not inflate the warning badge.
- Budget floor messages divide the raw smallest-unit integer by 100 and `.toFixed(2)` for display (e.g. satang 5000 -> "50.00"). The stored value is still the raw integer; only the message is formatted.
