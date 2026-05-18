# Frontend Pages

The frontend is a Next.js App Router application. All pages require authentication except `/login`.

Source: `frontend/src/app/`

## Page Map

### `/login`
Facebook OAuth login page. Uses the Facebook JavaScript SDK v21.0 to authenticate, then sends the access token to `POST /api/auth/facebook` to get a JWT.

### `/dashboard`
Main dashboard after login. Shows overview widgets and quick actions.

### `/explorer`
Ad account explorer for browsing the Meta ad hierarchy:
- Select an ad account → view campaigns
- Expand a campaign → view adsets
- Expand an adset → view ads
- Actions: rename, bulk delete

Uses `adAccountApi` methods (getCampaigns, getAdSets, getAds).

### `/drafts`
Draft campaign management:
- List all draft campaigns
- Edit individual drafts via dynamic forms (powered by [[meta-form-schema-engine]])
- Validate drafts against Meta constraints
- Publish single or bulk-publish drafts to Meta
- Bulk edit shared fields across multiple drafts

### `/wide-create`
Wide creation wizard for bulk campaign structure generation:
- **StructureWizard** — Define template: number of campaigns, adsets per campaign, ads per adset, field defaults, naming patterns
- **TreeConfigurator** — Visual tree view to configure individual nodes before generating

Uses `useWideCreationStore` (Zustand) for state management.

### `/history`
Duplication history log. Shows past duplication and conversion operations with their status and details.

## Related Pages

- [[components]] — key UI components
- [[state-management]] — Zustand stores and API client
