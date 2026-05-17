# Destination Types

The `destination_type` field on adsets specifies where users are sent after clicking the ad. Valid values depend on the campaign objective.

## Valid Values by Objective

| Objective | Valid Destination Types |
|-----------|----------------------|
| OUTCOME_AWARENESS | UNDEFINED (must omit from payload) |
| OUTCOME_TRAFFIC | WEBSITE, APP, MESSENGER, WHATSAPP, INSTAGRAM_DIRECT |
| OUTCOME_ENGAGEMENT | WEBSITE, ON_POST, ON_VIDEO, ON_PAGE, ON_EVENT, FACEBOOK, INSTAGRAM_DIRECT |
| OUTCOME_LEADS | WEBSITE, ON_AD, MESSENGER, INSTAGRAM_DIRECT, WHATSAPP |
| OUTCOME_SALES | WEBSITE, APP, MESSENGER, WHATSAPP, SHOP_AUTOMATIC |
| OUTCOME_APP_PROMOTION | APP, UNDEFINED |

## Special Rules

- **UNDEFINED** means "no value" — it must be omitted from the payload entirely, never sent as `"UNDEFINED"`
- **OUTCOME_AWARENESS** only supports UNDEFINED → always omit destination_type
- **OUTCOME_APP_PROMOTION** must use `APP`
- **OUTCOME_ENGAGEMENT** infers destination_type from optimization_goal if not specified:
  - POST_ENGAGEMENT → ON_POST
  - VIDEO_VIEWS / THRUPLAY → ON_VIDEO
  - MESSAGES → FACEBOOK
  - else → WEBSITE

## Migration

When converting objectives, `migrateDestinationType()` in [[meta-field-registry]] checks if the current destination_type is valid for the target objective. If not, it falls back to the objective's default.

## Labels

| Value | Display Label |
|-------|-------------|
| UNDEFINED | Default |
| WEBSITE | Website |
| APP | App |
| MESSENGER | Messenger |
| WHATSAPP | WhatsApp |
| INSTAGRAM_DIRECT | Instagram DM |
| ON_AD | Instant Form |
| ON_POST | On Post |
| ON_VIDEO | On Video |
| ON_PAGE | On Page |
| ON_EVENT | On Event |
| FACEBOOK | Facebook |
| SHOP_AUTOMATIC | Shop |

## Related Pages

- [[objectives]] — objective-specific rules
- [[meta-field-registry]] — VALID_DESTINATION_TYPES map
- [[optimization-goals]] — engagement objective infers from optimization goal
