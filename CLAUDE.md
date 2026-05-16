# AdsDuplicator - Project Context

## Architecture

Full-stack Meta Ads duplication/conversion tool.

- **Backend**: Express.js + TypeScript, Prisma + PostgreSQL, Meta Marketing API v21.0
- **Frontend**: Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Zustand

## Key Backend Services (`backend/src/services/draft/`)

| File | Purpose |
|------|---------|
| `MetaFieldRegistry.ts` | Single source of truth for all Meta field definitions, valid enums per objective, defaults, migration logic |
| `FieldOptimizationEngine.ts` | Transforms raw Meta data into valid duplication/conversion payloads (strips read-only, resolves budget conflicts, validates promoted_object) |
| `MetaFormSchemaEngine.ts` | Generates recursive form schemas for dynamic UI rendering (campaign/adset/ad) |
| `DraftValidationEngine.ts` | Pre-publish validation against Meta constraints |
| `DraftPublishService.ts` | Publishes draft entities to Meta API |
| `BulkEditCompatibilityEngine.ts` | Computes shared editable fields across heterogeneous selections |
| `DraftCampaignService.ts` | Campaign CRUD + conversion logic |

## Meta API Constraints

- All new objects created as `status: PAUSED`
- CBO campaigns: budget lives at campaign level, adset budget fields must be stripped
- `promoted_object` required for: OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION
- `attribution_spec` only valid for: OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_APP_PROMOTION
- `is_adset_budget_sharing_enabled: false` required on campaign creation (as of 2026-05)
- Bid cap strategies (COST_CAP, LOWEST_COST_WITH_BID_CAP, BID_CAP) require `bid_amount`
- `UNDEFINED` destination_type = "no value" (returns fallback, not treated as migration)

## Testing (`backend/tests/`)

Run tests:
```bash
cd backend
npm test              # All tests (760+ auto-generated, ~400ms)
npm run test:watch    # Watch mode
npm run test:coverage # With v8 coverage
npm run test:drift    # Live Meta API validation (requires META_ACCESS_TOKEN in .env)
```

Test structure:
```
tests/
├── unit/           # Field matrix, conversion matrix, form schema, bulk edit
├── contracts/      # Meta API payload shape contracts
├── integration/    # Full optimize→validate→contract pipeline
├── snapshots/      # Payload stability snapshots
├── drift/          # Registry consistency + live Meta API drift detection
└── fixtures/       # Shared realistic test data for all 6 objectives
```

Tests auto-generate from `MetaFieldRegistry` definitions — adding a new objective/field to the registry automatically creates test cases.

## 6 Supported Objectives

OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT, OUTCOME_TRAFFIC, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION

## Frontend Dynamic Form System

- `frontend/src/components/meta/SchemaField.tsx` — Recursive renderer
- `frontend/src/components/meta/MetaForm.tsx` — Stateful form wrapper
- Backend endpoint: `POST /api/drafts/form-schema` (returns recursive schema)

## Environment Variables (backend/.env)

```
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=...
FB_APP_ID=...
FB_APP_SECRET=...
META_ACCESS_TOKEN=...      # For live drift tests
META_AD_ACCOUNT_ID=...     # For live drift tests
```

## Common Tasks

- **Add new objective**: Update `MetaFieldRegistry.ts` (VALID_OPTIMIZATION_GOALS, VALID_DESTINATION_TYPES, OBJECTIVE_DEFAULTS, PROMOTED_OBJECT_REQUIREMENTS). Tests auto-generate.
- **Add new field**: Add to CAMPAIGN_FIELDS/ADSET_FIELDS/AD_FIELDS in registry. Update form schema engine if UI needed.
- **Fix Meta API drift**: Run `npm run test:drift`, check which validation fails, update registry accordingly.
