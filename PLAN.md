# Implementation Plan - Facebook Ads Duplicator

## Status: Core Complete

All core features are implemented and tested. The system handles duplication, objective conversion, bulk editing, and dynamic form rendering with 760+ automated tests.

---

## Completed

### 1. Project Foundation
- [x] Backend: Express.js + TypeScript + Prisma + PostgreSQL
- [x] Frontend: Next.js (App Router) + Tailwind + shadcn/ui + Zustand
- [x] Facebook OAuth 2.0 authentication
- [x] Meta Marketing API v21.0 integration

### 2. Core Duplication Engine
- [x] Campaign/AdSet/Ad duplication with `status: PAUSED`
- [x] Deep duplication (campaign → all child adsets → all child ads)
- [x] Bulk duplication (multiple items at once)
- [x] Creative ID reuse for social proof preservation
- [x] Naming pattern templates

### 3. Objective Conversion System
- [x] Full N×N objective conversion (all 30 pairs across 6 objectives)
- [x] Field optimization engine (strips incompatible fields, migrates goals/destinations)
- [x] Promoted object handling per objective requirements
- [x] Attribution spec support (SALES, LEADS, APP_PROMOTION only)
- [x] Budget conflict resolution (CBO vs adset-level)
- [x] Bid strategy dependency validation

### 4. Meta Field Registry (`MetaFieldRegistry.ts`)
- [x] Complete field definitions (campaign, adset, ad) with types, labels, mutability
- [x] Valid optimization goals per objective
- [x] Valid destination types per objective
- [x] Objective defaults (goal, billing_event, destination_type)
- [x] Promoted object requirements map
- [x] Migration functions (goal, destination_type)
- [x] Read-only field stripping
- [x] Targeting/promoted_object sanitization

### 5. Dynamic Form Schema System
- [x] `MetaFormSchemaEngine` — recursive schema generator (campaign/adset/ad)
- [x] `SchemaField.tsx` — recursive renderer (string, number, enum, object, array, etc.)
- [x] `MetaForm.tsx` — stateful form with dependency resolution + cascade invalidation
- [x] Full targeting sub-schema (geo, age, gender, platforms, placements, audiences)
- [x] Context-aware options (optimization goals adapt to selected objective)
- [x] `POST /api/drafts/form-schema` endpoint

### 6. Bulk Edit System
- [x] `BulkEditCompatibilityEngine` — fingerprinting + shared field computation
- [x] Compatibility detection across heterogeneous selections
- [x] Schema generation for editable common fields
- [x] Validation + apply logic

### 7. Automated Testing (760+ tests)
- [x] **Unit**: Field matrix, conversion matrix, form schema, bulk edit
- [x] **Contracts**: Meta API payload shape validation
- [x] **Integration**: Full optimize → validate → contract pipeline (72 combinations)
- [x] **Snapshots**: Payload stability detection
- [x] **Drift**: Registry consistency + live Meta API `validation_only=true`
- [x] Auto-generation from registry definitions
- [x] Coverage: FieldOptimizationEngine 94%, BulkEditCompatibilityEngine 95%

### 8. Frontend UI
- [x] Explorer page with tree-view (campaign → adset → ad)
- [x] Duplicate modal with options
- [x] Objective conversion modal (3-step wizard)
- [x] Bulk edit modal
- [x] Draft editor with tabs (Edit Form, Full Schema, Summary, Raw JSON)
- [x] Drafts list page
- [x] Wide Creation page with structure wizard + tree configurator

### 9. Wide Creation System
- [x] `WideCreationService` — template validation + draft generation with inheritance
- [x] Template → Drafts pipeline (campaigns × adSets × ads)
- [x] 3-level inheritance resolution (template defaults → campaign → adSet)
- [x] Naming pattern system with variables ({index}, {objective}, {parent}, etc.)
- [x] Bulk field application with cascade-to-children option
- [x] Full Meta constraint validation (goals, destinations, promoted_object, budgets, bid)
- [x] Generated drafts are standard — compatible with all existing workflows
- [x] 161 auto-generated tests (unit + integration + contract validation)
- [x] Frontend: Quick structure generator, manual campaign config, tree configurator
- [x] Frontend: Inline editing, bulk selection, expand/collapse, bulk field application

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/adaccounts` | List ad accounts |
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/adsets/:campaignId` | List ad sets |
| GET | `/api/ads/:adsetId` | List ads |
| POST | `/api/duplicate` | Duplicate items |
| POST | `/api/duplicate/preview-conversion` | Preview objective conversion |
| POST | `/api/duplicate/convert-objective` | Execute conversion (bulk) |
| POST | `/api/drafts/form-schema` | Get dynamic form schema |
| GET | `/api/drafts` | List drafts |
| GET | `/api/drafts/:id` | Get draft |
| PUT | `/api/drafts/:id` | Update draft |
| POST | `/api/drafts/:id/publish` | Publish draft to Meta |
| POST | `/api/wide-creation/validate` | Validate template structure |
| POST | `/api/wide-creation/generate` | Generate drafts from template |
| POST | `/api/wide-creation/bulk-apply` | Bulk update fields with cascade |
| POST | `/api/wide-creation/tree` | Get tree structure for campaigns |

---

## Maintenance Guide

### Adding a New Objective
1. Add to `VALID_OPTIMIZATION_GOALS` in `MetaFieldRegistry.ts`
2. Add to `VALID_DESTINATION_TYPES`
3. Add to `OBJECTIVE_DEFAULTS`
4. Add to `PROMOTED_OBJECT_REQUIREMENTS`
5. Add fixture in `tests/fixtures/meta-entities.ts`
6. Run `npm test` — new tests auto-generate

### Detecting Meta API Changes
```bash
npm run test:drift
```
If a test fails, Meta has changed their validation. Update the registry accordingly.

### Adding a New Field
1. Add to `CAMPAIGN_FIELDS`, `ADSET_FIELDS`, or `AD_FIELDS` in registry
2. If editable in UI: add to `MetaFormSchemaEngine` schema generator
3. If affects optimization: add handling in `FieldOptimizationEngine`
4. Run `npm test` — contract tests will catch shape violations
