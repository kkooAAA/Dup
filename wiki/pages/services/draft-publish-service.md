# DraftPublishService

Publishes draft entities from the local PostgreSQL database to the Meta API. Handles the full campaign → adsets → ads creation sequence.

Source: `backend/src/services/draft/DraftPublishService.ts`

## Publish Flow

1. **Validate** — Run `DraftValidationEngine.validateFullDraft()` on the entire campaign tree. Abort if any errors.
2. **Set status** — Mark campaign as `PUBLISHING`
3. **Detect CBO** — Check if campaign uses Campaign Budget Optimization (see [[cbo]])
4. **Create/update campaign on Meta**:
   - If `metaId` exists: check if it still exists on Meta. If not, recreate.
   - If no `metaId`: create new campaign via `FacebookService`
5. **Create/update adsets** — For each adset in the campaign:
   - Strip immutable fields, sanitize targeting, handle promoted_object
   - Handle budget based on CBO status
   - Strip attribution_spec if not supported by objective
   - Create on Meta, store metaId
6. **Create/update ads** — For each ad in each adset:
   - Reference the creative from the source data
   - Create on Meta, store metaId
7. **Update status** — Mark as `PUBLISHED` or `FAILED`

## Key Details

- Account IDs are normalized with `act_` prefix
- Budget fields are stripped from adsets when campaign is CBO
- Non-CBO campaigns require `is_adset_budget_sharing_enabled: false`
- `attribution_spec` only sent for OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_APP_PROMOTION
- Thailand targeting enforces `age_min >= 20`

## Error Handling

If any entity fails to publish, the campaign status is set to `FAILED` with an error message. Entities that were already created remain on Meta (no rollback).

## Related Pages

- [[draft-validation-engine]] — runs before publish
- [[facebook-service]] — makes the actual API calls
- [[cbo]] — affects budget field handling
- [[meta-field-registry]] — sanitization utilities
