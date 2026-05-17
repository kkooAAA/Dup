# FieldOptimizationEngine

Transforms raw Meta API data into valid duplication or conversion payloads. Acts as the pipeline between fetching data from Meta and creating new objects.

Source: `backend/src/services/draft/FieldOptimizationEngine.ts`

## What It Does

For each entity level (campaign, adset, ad), the engine:

1. **Strips read-only fields** — Removes fields like `id`, `account_id`, `effective_status` that Meta returns but rejects on create
2. **Forces status to PAUSED** — All new objects start paused to prevent accidental spend
3. **Resolves budget conflicts** — Handles CBO vs non-CBO budget placement (see [[cbo]])
4. **Validates promoted_object** — Ensures correct fields per objective (see [[promoted-object]])
5. **Migrates optimization goals** — When converting objectives, maps goals to valid equivalents (see [[optimization-goals]])
6. **Handles destination_type** — Validates/migrates per objective rules (see [[destination-types]])
7. **Strips attribution_spec** — Removes for objectives that don't support it
8. **Applies overrides** — Merges user-provided field overrides on top of optimized values

## Output

Returns an `OptimizationResult` containing:
- `fields` — Array of `OptimizedField` objects, each with action (kept/removed/transformed/locked/auto_mapped/added), reason, and editability
- `payload` — Clean payload ready to send to Meta API
- `warnings` — Non-blocking issues
- `errors` — Blocking issues that prevent creation

## Key Methods

- `optimizeCampaignForDuplication(sourceData, overrides?)` — For duplicating campaigns
- `optimizeAdSetForDuplication(sourceData, objective, isCBO, overrides?)` — For duplicating adsets (budget handling depends on CBO)
- `optimizeAdForDuplication(sourceData, overrides?)` — For duplicating ads
- `optimizeCampaignForConversion(sourceData, targetObjective, overrides?)` — For objective conversion
- `optimizeAdSetForConversion(sourceData, targetObjective, isCBO, overrides?)` — For converting adsets to new objective

## Dependencies

Imports all field definitions, compatibility maps, and utility functions from [[meta-field-registry]].

## Related Pages

- [[meta-field-registry]] — source of truth for all field rules
- [[objective-conversion-service]] — uses this engine for live conversions
- [[draft-publish-service]] — uses registry utilities for publish payloads
