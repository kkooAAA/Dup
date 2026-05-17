# WideCreationService

Enables bulk creation of campaign structures from templates. Users define a template specifying N campaigns × M adsets × K ads, configure naming patterns and field inheritance, then generate all drafts at once.

Source: `backend/src/services/draft/WideCreationService.ts`

## Template Structure

```typescript
WideCreationTemplate {
  name: string
  adAccountId: string
  defaults?: { campaign, adSet, ad }  // shared default field values
  namingPattern?: { campaign, adSet, ad }  // e.g. "{objective}_{index:02d}"
  campaigns: WideCampaignNode[]
}

WideCampaignNode {
  fields: Record<string, any>
  adSetCount: number
  adSets?: WideAdSetNode[]
}

WideAdSetNode {
  fields: Record<string, any>
  inherit?: Record<string, 'campaign' | 'template' | 'custom'>
  adCount: number
  ads?: WideAdNode[]
}
```

## Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wide-creation/validate` | POST | Validate template structure against Meta constraints |
| `/api/wide-creation/generate` | POST | Generate all draft entities from template |
| `/api/wide-creation/bulk-apply` | POST | Apply field changes across generated tree |
| `/api/wide-creation/tree` | POST | Get tree view of generated structure |

## Key Features

- **Field inheritance** — AdSet fields can inherit from campaign or template defaults
- **Naming patterns** — Template-based naming with index variables
- **Validation** — Uses [[field-optimization-engine]] to validate each entity
- **Bulk generation** — Creates DraftCampaign/DraftAdSet/DraftAd records in PostgreSQL

## Frontend

The wizard UI lives in `frontend/src/components/wide-create/`:
- **StructureWizard** — Define the template structure (counts, fields)
- **TreeConfigurator** — Visual tree view to configure individual nodes

State managed by `useWideCreationStore` (Zustand).

## Related Pages

- [[draft-system]] — generated drafts follow the same lifecycle
- [[meta-field-registry]] — field definitions for validation
- [[field-optimization-engine]] — entity optimization during generation
