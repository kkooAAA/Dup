# Naming Templates

User-defined patterns for naming campaigns, ad sets, and ads during duplication and wide creation.

## Data Model

Stored in the `NamingTemplate` table:

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Template display name |
| `pattern` | String | Naming pattern with placeholders |
| `type` | String | Entity level this applies to |
| `isDefault` | Boolean | One default per type per user |

## API

CRUD via `template.controller.ts` and `/api/templates`:

| Method | Endpoint | Action |
|--------|----------|--------|
| `GET` | `/api/templates` | List user's templates |
| `POST` | `/api/templates` | Create (auto-unsets previous default if `isDefault`) |
| `PUT` | `/api/templates/:id` | Update |
| `DELETE` | `/api/templates/:id` | Delete |

## Default Handling

When creating or updating a template with `isDefault: true`, the controller automatically unsets the previous default for the same `type`. This ensures only one default template per entity type per user.

## Related Pages

- [[database-schema]] — NamingTemplate model
- [[wide-creation-service]] — uses templates for bulk naming
- [[routes]] — template endpoints
