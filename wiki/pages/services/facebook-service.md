# FacebookService

Wrapper around the Meta Graph API v21.0. All interactions with Facebook/Meta go through this service.

Source: `backend/src/services/facebook.service.ts`

## Responsibilities

- Authenticated HTTP requests to the Graph API (GET, POST, DELETE)
- Fetching campaigns, adsets, ads for an ad account
- Creating campaigns, adsets, ads on Meta
- Updating and deleting Meta objects
- Checking object existence
- Handling pagination for list endpoints

## Usage Pattern

```typescript
const fbService = new FacebookService(accessToken);

// Fetch
const campaign = await fbService.get(`/${campaignId}`, { fields: '...' });

// List
const adSets = await fbService.getAdSets(campaignId);
const ads = await fbService.getAds(adSetId);

// Create
const newId = await fbService.createCampaign(adAccountId, payload);

// Check
const exists = await fbService.checkExistence(metaId);
```

## Key Constraint

The Facebook app must be in **Live mode** to create ads with `object_story_spec`. Development mode only allows `creative_id` references.

## Related Pages

- [[overview]] — architecture diagram showing Meta API integration
- [[meta-api-constraints]] — full list of API constraints
- [[objective-conversion-service]] — uses this service for conversion operations
- [[draft-publish-service]] — uses this service to publish drafts to Meta
