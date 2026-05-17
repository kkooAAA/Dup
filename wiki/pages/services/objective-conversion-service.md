# ObjectiveConversionService

Handles live campaign objective conversion — transforms a campaign from one objective to another and creates the new entities directly on Meta.

Source: `backend/src/services/objectiveConversion.service.ts`

## How It Works

1. **Fetch** the source campaign, its adsets, and their ads from Meta
2. **Transform campaign**: change objective, apply new name
3. **Transform each adset**:
   - Migrate `optimization_goal` using the migration map (e.g. LANDING_PAGE_VIEWS → LINK_CLICKS)
   - Set `billing_event` (always IMPRESSIONS)
   - Migrate `destination_type` to a valid value for the target objective
   - Rebuild `promoted_object` based on target objective requirements
   - Strip or keep `attribution_spec` based on target objective
   - Sanitize targeting (enforce Thailand age_min >= 20)
4. **Transform each ad**: reference the creative from the source ad
5. **Create** all transformed entities on Meta (campaign → adsets → ads)

## Legacy Objective Mapping

The service handles legacy Meta objectives (pre-ODAX) via `LEGACY_OBJECTIVE_MAP`:

| Legacy | Maps to |
|--------|---------|
| REACH | OUTCOME_AWARENESS |
| BRAND_AWARENESS | OUTCOME_AWARENESS |
| LINK_CLICKS | OUTCOME_TRAFFIC |
| POST_ENGAGEMENT | OUTCOME_ENGAGEMENT |
| CONVERSIONS | OUTCOME_SALES |
| PRODUCT_CATALOG_SALES | OUTCOME_SALES |
| LEAD_GENERATION | OUTCOME_LEADS |
| APP_INSTALLS | OUTCOME_APP_PROMOTION |

## Preview Mode

`getPreview()` runs the full transformation logic but returns the result without creating anything on Meta. This lets the UI show users exactly what will change before they commit.

## Objective Defaults

Each objective has safe defaults (defined in both this service and [[meta-field-registry]]):

| Objective | Default Optimization Goal | Default Destination Type |
|-----------|--------------------------|------------------------|
| OUTCOME_AWARENESS | REACH | UNDEFINED (omit) |
| OUTCOME_TRAFFIC | LINK_CLICKS | WEBSITE |
| OUTCOME_ENGAGEMENT | POST_ENGAGEMENT | WEBSITE |
| OUTCOME_LEADS | LEAD_GENERATION | WEBSITE |
| OUTCOME_SALES | OFFSITE_CONVERSIONS | WEBSITE |
| OUTCOME_APP_PROMOTION | APP_INSTALLS | APP |

All defaults use `billing_event: IMPRESSIONS`.

## Related Pages

- [[field-optimization-engine]] — similar transformation logic for duplication
- [[meta-field-registry]] — source of valid enums and migration maps
- [[objectives]] — the 6 supported objectives
- [[duplication-controller]] — routes that invoke this service
