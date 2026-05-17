# API Routes

All backend routes are prefixed with `/api`. The Express server runs on port 5000 by default.

Source: `backend/src/routes/`

## Route Map

### Auth (`/api/auth`) — `auth.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/facebook` | Facebook OAuth login, returns JWT |

### Ad Accounts (`/api/adaccounts`) — `adAccount.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List user's ad accounts |
| GET | `/:id/campaigns` | List campaigns for an ad account |
| GET | `/campaigns/:id/adsets` | List adsets for a campaign |
| GET | `/adsets/:id/ads` | List ads for an adset |
| PATCH | `/update-name` | Rename a Meta object |
| POST | `/bulk-delete` | Delete multiple Meta objects |

### Duplication (`/api/duplicate`) — `duplication.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/campaign` | Duplicate a campaign (live on Meta) |
| POST | `/adset` | Duplicate an adset |
| POST | `/ad` | Duplicate an ad |
| POST | `/bulk` | Bulk duplicate multiple items |
| POST | `/convert-objective` | Convert campaign objective |
| POST | `/preview-conversion` | Preview conversion without creating |
| POST | `/optimize-duplicate` | Get optimized duplication payload |
| POST | `/optimize-conversion` | Get optimized conversion payload |
| GET | `/history` | Get duplication history |
| DELETE | `/history/:id` | Delete a history entry |
| POST | `/sync` | Clean up history |

### Drafts (`/api/drafts`) — `draft.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/duplicate` | Import campaign to draft |
| GET/PATCH/DELETE | `/campaigns/:id` | Campaign CRUD |
| GET/PATCH/DELETE | `/adsets/:id` | AdSet CRUD |
| GET/PATCH/DELETE | `/ads/:id` | Ad CRUD |
| POST | `/campaigns/:id/publish` | Publish a draft to Meta |
| POST | `/campaigns/bulk-publish` | Bulk publish drafts |
| POST | `/bulk-edit/*` | Bulk edit shared fields |
| POST | `/form-schema` | Get dynamic form schema |

### Templates (`/api/templates`) — `template.routes.ts`

Standard CRUD for reusable templates.

### Wide Creation (`/api/wide-creation`) — `wideCreation.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/validate` | Validate template structure |
| POST | `/generate` | Generate drafts from template |
| POST | `/bulk-apply` | Apply changes across tree |
| POST | `/tree` | Get tree view |

## Related Pages

- [[controllers]] — handler functions for each route
- [[api-client]] — frontend methods that call these routes
