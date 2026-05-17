# Promoted Object

The `promoted_object` field on adsets tells Meta what the ad is promoting. Different objectives require different promoted object fields.

## Requirements by Objective

| Objective | Required Fields |
|-----------|----------------|
| OUTCOME_AWARENESS | None |
| OUTCOME_TRAFFIC | None |
| OUTCOME_ENGAGEMENT | None |
| OUTCOME_LEADS | `page_id` |
| OUTCOME_SALES | `pixel_id` (+ typically `custom_event_type`) |
| OUTCOME_APP_PROMOTION | `application_id` |

Defined in `PROMOTED_OBJECT_REQUIREMENTS` in [[meta-field-registry]].

## Sanitization

`sanitizePromotedObject()` removes read-only sub-fields (`id`, `smart_pse_enabled`) that Meta returns but rejects on create. Returns `undefined` if the object is empty after sanitization.

## During Objective Conversion

When converting between objectives, the promoted_object may need to be rebuilt. For example:
- Converting from OUTCOME_AWARENESS (no promoted_object) to OUTCOME_LEADS requires adding `page_id`
- Converting from OUTCOME_SALES (has pixel_id) to OUTCOME_AWARENESS requires removing the promoted_object entirely

The [[field-optimization-engine]] and [[objective-conversion-service]] handle this transformation.

## Related Pages

- [[objectives]] — which objectives require what
- [[meta-field-registry]] — PROMOTED_OBJECT_REQUIREMENTS map
- [[field-optimization-engine]] — promoted_object handling during optimization
