# Data Flows

## 1. Live Duplication Flow

```
User selects campaign(s) → Frontend POST /api/duplicate/campaign
→ DuplicationController → FacebookService.get() (fetch source)
→ FieldOptimizationEngine.optimizeCampaignForDuplication()
→ FacebookService.createCampaign() (create on Meta)
→ Repeat for adsets and ads (deep copy)
→ Return new Meta IDs to frontend
```

The source campaign is fetched, its fields are optimized (read-only stripped, status forced to PAUSED, budget conflicts resolved), and a new campaign is created directly on Meta. If deep duplication is enabled, adsets and ads are also cloned.

## 2. Objective Conversion Flow

```
User selects campaign + target objective
→ Frontend POST /api/duplicate/convert-objective
→ DuplicationController → ObjectiveConversionService
→ Fetch source campaign + adsets + ads from Meta
→ Transform campaign: change objective, apply defaults
→ Transform adsets: migrate optimization_goal, destination_type,
   rebuild promoted_object, sanitize targeting
→ Transform ads: reference new creative
→ Create all on Meta as new entities
→ Return new campaign ID
```

Key transformation logic: [[optimization-goals]] are migrated via `OPTIMIZATION_GOAL_MIGRATION` map. [[destination-types]] are validated per objective. [[promoted-object]] is rebuilt based on target objective requirements.

## 3. Draft System Flow

```
User clicks "Save as Draft" → POST /api/drafts/duplicate
→ DraftService.duplicateCampaignToDraft()
→ Fetch full campaign tree from Meta
→ Store in PostgreSQL as DraftCampaign/DraftAdSet/DraftAd

User edits draft → PATCH /api/drafts/campaigns/:id
→ Update in PostgreSQL

User publishes → POST /api/drafts/campaigns/:id/publish
→ DraftPublishService.publishCampaign()
→ DraftValidationEngine.validateFullDraft()
→ If valid: create campaign → adsets → ads on Meta (sequential)
→ Update draft status to PUBLISHED with Meta IDs
```

## 4. Wide Creation Flow

```
User builds template in wizard → Frontend state (Zustand)
→ POST /api/wide-creation/validate
→ WideCreationService.validate() — check all fields

→ POST /api/wide-creation/generate
→ WideCreationService.generate()
→ Resolve naming patterns, inherit fields from parent levels
→ Create DraftCampaign/DraftAdSet/DraftAd records in PostgreSQL
→ Return tree of draft IDs

User reviews in tree configurator → PATCH individual drafts
→ POST /api/drafts/campaigns/:id/publish (same publish flow)
```

## 5. Bulk Operations

- **Bulk Duplicate**: `POST /api/duplicate/bulk` — duplicate multiple items in one request
- **Bulk Edit**: `POST /api/drafts/bulk-edit/*` — edit shared fields across multiple selected drafts, powered by [[bulk-edit-compatibility-engine]]
- **Bulk Publish**: `POST /api/drafts/campaigns/bulk-publish` — publish multiple draft campaigns sequentially
- **Bulk Delete**: `POST /api/adaccounts/bulk-delete` — delete multiple Meta objects
