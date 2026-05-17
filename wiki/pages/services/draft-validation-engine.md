# DraftValidationEngine

Pre-publish validation engine that checks all draft entities against Meta API constraints before allowing publication.

Source: `backend/src/services/draft/DraftValidationEngine.ts`

## What It Validates

- **Campaign level**: required fields present, valid objective, budget consistency, special_ad_categories
- **AdSet level**: optimization_goal valid for objective, destination_type valid for objective, promoted_object has required fields, targeting is valid, budget fields correct for CBO/non-CBO
- **Ad level**: creative present, required fields filled

## Output

```typescript
{
  isValid: boolean
  campaignErrors: ValidationError[]
  adSetErrors: Record<adSetId, ValidationError[]>
  adErrors: Record<adId, ValidationError[]>
}
```

Each `ValidationError` has `field`, `message`, and `severity` ('error' | 'warning').

## Usage

Called by [[draft-publish-service]] before publishing, and can be called independently via the draft form schema endpoint for real-time validation in the UI.

## Related Pages

- [[meta-field-registry]] — source of validation rules
- [[draft-publish-service]] — calls this before publish
- [[draft-system]] — part of the draft lifecycle
