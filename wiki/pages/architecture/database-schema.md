# Database Schema

PostgreSQL database managed by Prisma ORM. All models use `cuid()` primary keys and auto-managed `createdAt`/`updatedAt` timestamps.

## Models

### User

Core identity model. Linked to Facebook via OAuth.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `facebookId` | String | Unique, from FB OAuth |
| `email` | String? | Optional, from FB profile |
| `name` | String? | From FB profile |
| `accessToken` | String? | Long-lived FB token (~60 days) |

Has many: `DuplicateJob`, `FacebookAccount`, `NamingTemplate`, `DraftCampaign`, `DraftAdSet`, `DraftAd`

### FacebookAccount

Cached ad account metadata.

| Field | Type | Notes |
|-------|------|-------|
| `adAccountId` | String | Unique Meta ad account ID |
| `name` | String | Display name |
| `currency` | String? | Account currency |
| `timezoneName` | String? | Account timezone |
| `userId` | String | FK → User |

### DraftCampaign / DraftAdSet / DraftAd

Local editable copies of Meta campaign structures. See [[draft-system]] for lifecycle details.

Shared fields across all three:

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | FK → User |
| `adAccountId` | String | Meta ad account ID |
| `name` | String | Display name |
| `status` | DraftStatus | See enum below |
| `metaId` | String? | Populated after publish |
| `data` | Json | Full Meta field settings |
| `validationErrors` | Json? | From [[draft-validation-engine]] |

Relationships:
- `DraftCampaign` → has many `DraftAdSet` (cascade delete)
- `DraftAdSet` → has many `DraftAd` (cascade delete)
- `DraftCampaign` has `objective` (String?)

### DraftStatus Enum

`DRAFT` → `READY` → `PUBLISHING` → `PUBLISHED` | `FAILED`

Also: `VALIDATION_FAILED`, `ARCHIVED`

### DuplicateJob

History log for duplication/conversion operations.

| Field | Type | Notes |
|-------|------|-------|
| `type` | String | Operation type |
| `sourceId` | String | Original Meta object ID |
| `targetId` | String? | Created Meta object ID |
| `status` | String | Job status |
| `details` | Json? | Operation metadata |
| `error` | String? | Error message if failed |

### NamingTemplate

User-defined naming patterns for campaigns/adsets/ads. See [[naming-templates]].

### DraftPublishLog

Audit trail for publish operations. Stores the full request payload and Meta API response for debugging.

| Field | Type | Notes |
|-------|------|-------|
| `draftId` | String | Reference to draft entity |
| `draftType` | String | `CAMPAIGN`, `ADSET`, or `AD` |
| `payload` | Json? | Sent to Meta API |
| `response` | Json? | Meta API response |
| `error` | String? | Error details |

## Related Pages

- [[draft-system]] — draft lifecycle and services
- [[draft-publish-service]] — uses DraftPublishLog for audit trail
- [[naming-templates]] — NamingTemplate usage
