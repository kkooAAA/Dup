# Meta API Constraints

Critical rules enforced by the Meta Marketing API v21.0 that the system must respect.

## Entity Creation

- All new objects must be created with `status: PAUSED` to prevent accidental ad spend
- Read-only fields (id, account_id, effective_status, etc.) must be stripped from create payloads
- Immutable fields (objective, buying_type) cannot be changed after creation — must recreate the entity

## Budget Rules

- [[cbo|CBO campaigns]]: budget at campaign level, adset budget fields must be stripped
- Non-CBO campaigns: require `is_adset_budget_sharing_enabled: false` on creation
- `daily_budget` and `lifetime_budget` are mutually exclusive on any entity

## Promoted Object

- `promoted_object` required for:
  - OUTCOME_LEADS → `page_id`
  - OUTCOME_SALES → `pixel_id` (+ `custom_event_type`)
  - OUTCOME_APP_PROMOTION → `application_id`
- See [[promoted-object]] for details

## Attribution Spec

- `attribution_spec` only valid for: OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_APP_PROMOTION
- Must be stripped for all other objectives

## Destination Type

- `UNDEFINED` means "omit from payload" — never send as a string value
- OUTCOME_AWARENESS: only supports UNDEFINED (always omit)
- OUTCOME_APP_PROMOTION: must be `APP`
- OUTCOME_ENGAGEMENT: inferred from optimization_goal when not specified
- See [[destination-types]] for full matrix

## Bid Strategy

- Bid cap strategies (COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS) require `bid_amount`

## Targeting

- Thailand targeting requires `age_min >= 20`
- `geo_locations` must have at least one entry
- Default targeting: `{ geo_locations: { countries: ['TH'] }, age_min: 20 }`

## Creative

- `object_story_spec` requires `page_id` at the top level
- FB App must be in **Live mode** to create ads with `object_story_spec`
- Development mode only allows `creative_id` references

## Read-Only Fields (must strip)

`id`, `account_id`, `effective_status`, `configured_status`, `created_time`, `updated_time`, `smart_pse_enabled`, `issues_info`, `recommendations`, `source_campaign_id`, `budget_remaining`, `budget_rebalance_flag`, `can_create_brand_lift_study`, `can_use_spend_cap`, `topline_id`, `source_campaign`

## Related Pages

- [[meta-field-registry]] — where all these rules are encoded
- [[field-optimization-engine]] — enforces these constraints during optimization
- [[draft-validation-engine]] — validates drafts against these constraints
- [[facebook-service]] — makes the API calls
