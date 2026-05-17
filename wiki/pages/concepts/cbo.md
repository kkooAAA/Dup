# Campaign Budget Optimization (CBO)

CBO determines whether the budget is managed at the campaign level or the adset level. This is one of the most important distinctions in the duplication/conversion flow because it affects which budget fields are valid on which entity.

## Rules

**CBO enabled** (`is_adset_budget_sharing_enabled: true` or campaign has `daily_budget`/`lifetime_budget`):
- Budget fields (`daily_budget`, `lifetime_budget`) live on the **campaign**
- Budget fields must be **stripped from adsets** — Meta rejects them

**CBO disabled** (non-CBO):
- Budget fields live on **adsets**
- Campaign must include `is_adset_budget_sharing_enabled: false` on creation
- Each adset must have either `daily_budget` or `lifetime_budget`

## Detection

`DraftPublishService` detects CBO by checking if the campaign data has `daily_budget` or `lifetime_budget` set, or if `is_adset_budget_sharing_enabled` is explicitly true.

## Impact on Duplication

The [[field-optimization-engine]] handles CBO-aware optimization:
- When optimizing adsets for a CBO campaign: strips `daily_budget` and `lifetime_budget` from adset payload
- When optimizing adsets for a non-CBO campaign: ensures adset has a budget field

## Common Gotcha

Budget fields being `daily_budget` and `lifetime_budget` are `incompatibleWith` each other — you can only have one on any given entity. The registry enforces this via the `incompatibleWith` field config.

## Related Pages

- [[meta-field-registry]] — CBO field definitions
- [[field-optimization-engine]] — CBO-aware optimization
- [[draft-publish-service]] — CBO detection during publish
- [[overview]] — architecture context
