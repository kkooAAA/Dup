# MetaFieldRegistry

Single source of truth for all Meta field definitions, valid enums per objective, defaults, and migration logic. Every other service in the draft system imports from this registry.

Source: `backend/src/services/draft/MetaFieldRegistry.ts`

## Field Definitions

Three main field maps define the schema for each entity level:

- **CAMPAIGN_FIELDS** — name, objective, buying_type, status, daily_budget, lifetime_budget, bid_strategy, spend_cap, special_ad_categories, is_adset_budget_sharing_enabled
- **ADSET_FIELDS** — name, campaign_id, optimization_goal, billing_event, destination_type, promoted_object, targeting, daily_budget, lifetime_budget, bid_amount, bid_strategy, attribution_spec, start_time, end_time
- **AD_FIELDS** — name, adset_id, creative, status, tracking_specs

Each field has a `FieldConfig`:
- `mutability`: `'mutable'` or `'immutable'` — immutable fields cannot be changed after creation on Meta
- `required`: `true`, `false`, or `'conditional'` — conditional means depends on other field values
- `type`: `'string'` | `'number'` | `'enum'` | `'boolean'` | `'object'` | `'array'`
- `dependsOn`: fields that influence this field's valid values (e.g. optimization_goal depends on objective)
- `incompatibleWith`: mutually exclusive fields (e.g. daily_budget vs lifetime_budget)
- `readOnlyOnMeta`: field exists in data but can't be sent to Meta on create

## Objective Compatibility Maps

- **VALID_OPTIMIZATION_GOALS** — maps each of the [[objectives|6 objectives]] to their valid optimization goals
- **VALID_DESTINATION_TYPES** — maps each objective to valid destination types
- **PROMOTED_OBJECT_REQUIREMENTS** — which fields the promoted_object must contain per objective
- **ATTRIBUTION_SPEC_OBJECTIVES** — set of objectives that support attribution_spec (SALES, LEADS, APP_PROMOTION)
- **BID_CAP_STRATEGIES** — bid strategies that require a bid_amount value

## Defaults and Migration

- **OBJECTIVE_DEFAULTS** — safe default optimization_goal + billing_event + destination_type per objective
- **OPTIMIZATION_GOAL_MIGRATION** — maps optimization goals to their closest equivalent when converting between objectives (e.g. LANDING_PAGE_VIEWS → LINK_CLICKS)

## Utility Functions

| Function | Purpose |
|----------|---------|
| `stripReadOnlyFields()` | Remove fields Meta returns but rejects on create (id, account_id, effective_status, etc.) |
| `stripImmutableFields()` | Remove immutable fields from update payloads |
| `sanitizePromotedObject()` | Remove read-only sub-fields from promoted_object |
| `sanitizeTargeting()` | Remove read-only targeting fields, ensure geo_locations, enforce Thailand age_min >= 20 |
| `migrateOptimizationGoal()` | Migrate optimization_goal to valid value for target objective |
| `migrateDestinationType()` | Migrate destination_type to valid value for target objective |
| `detectImmutableConflicts()` | Compare draft vs source snapshot for immutable field changes |

## Read-Only Fields

Fields Meta returns in responses but rejects on create/update:
`id`, `account_id`, `effective_status`, `configured_status`, `created_time`, `updated_time`, `smart_pse_enabled`, `issues_info`, `recommendations`, `source_campaign_id`, `budget_remaining`, `budget_rebalance_flag`, `can_create_brand_lift_study`, `can_use_spend_cap`, `topline_id`, `source_campaign`

## Related Pages

- [[field-optimization-engine]] — consumes registry to build optimized payloads
- [[draft-validation-engine]] — uses registry for pre-publish validation
- [[meta-form-schema-engine]] — generates UI schemas from registry
- [[objectives]] — the 6 supported objectives
