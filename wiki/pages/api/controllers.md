# Controllers

Express request handlers that bridge routes to services. Each controller file groups related endpoints.

Source: `backend/src/controllers/`

## Controller Map

### adAccount.controller.ts
Handles ad account browsing and management. Reads from Meta API via [[facebook-service]], supports rename and bulk delete.

### auth.controller.ts
Facebook OAuth flow. Receives a Facebook access token from the frontend, validates it, creates/updates the user in PostgreSQL, and returns a JWT.

### draft.controller.ts
Full draft lifecycle management. The largest controller — handles:
- Importing campaigns as drafts
- CRUD for draft campaigns, adsets, ads
- Publishing (single and bulk)
- Bulk editing
- Form schema generation (delegates to [[meta-form-schema-engine]])

### duplication.controller.ts
Live duplication and conversion operations:
- Single/bulk duplication (delegates to [[facebook-service]] + [[field-optimization-engine]])
- Objective conversion (delegates to [[objective-conversion-service]])
- Optimize payloads for preview

### template.controller.ts
CRUD for reusable templates stored in PostgreSQL.

### wideCreation.controller.ts
Wide creation operations:
- Template validation
- Draft generation from templates (delegates to [[wide-creation-service]])
- Bulk field application
- Tree view rendering

## Related Pages

- [[routes]] — route definitions that map to these controllers
- [[overview]] — architecture showing controller layer
