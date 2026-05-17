# State Management

The frontend uses Zustand for state management with two stores.

## useAppStore (`store/useAppStore.ts`)

Global application state:

| State | Type | Purpose |
|-------|------|---------|
| `user` | `User \| null` | Logged-in user info |
| `adAccounts` | `AdAccount[]` | User's Meta ad accounts |
| `selectedAccount` | `AdAccount \| null` | Currently active ad account |
| `sidebarCollapsed` | `boolean` | Sidebar toggle state |

Actions: `setUser`, `setAdAccounts`, `setSelectedAccount`, `toggleSidebar`

## useWideCreationStore (`store/useWideCreationStore.ts`)

Wide creation template state. Holds the template structure being built in the [[wide-creation-service|wide creation wizard]]:
- Template metadata (name, ad account)
- Campaign nodes with their fields
- AdSet nodes with inheritance config
- Ad nodes
- Naming patterns

## API Client (`services/api.ts`)

Not a Zustand store, but the centralized API layer. Axios instance with:
- JWT auth interceptor (reads from localStorage)
- 401 auto-redirect to `/login?reason=token_expired`
- API methods grouped by domain:
  - `authApi` — loginWithFacebook
  - `adAccountApi` — getAdAccounts, getCampaigns, getAdSets, getAds, updateName, bulkDelete
  - `duplicationApi` — duplicateCampaign, duplicateAdSet, duplicateAd, duplicateBulk, convertObjective, previewConversion, optimizeDuplicate, optimizeConversion
  - `templateApi` — CRUD for templates
  - `wideCreationApi` — validate, generate, bulkApply, tree
  - `draftApi` — full draft CRUD, publish, bulk operations, form schema

## Related Pages

- [[frontend-pages]] — pages that consume these stores
- [[frontend-components]] — components that render from store state
