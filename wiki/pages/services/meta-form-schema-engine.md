# MetaFormSchemaEngine

Generates recursive form schemas for dynamic UI rendering. Given a campaign's objective and current field values, produces a schema that the frontend renders into editable forms.

Source: `backend/src/services/draft/MetaFormSchemaEngine.ts`

## How It Works

1. Takes entity type (campaign/adset/ad), current data, and objective
2. Reads field definitions from [[meta-field-registry]]
3. Filters fields by mutability (only mutable fields are editable)
4. Computes valid enum values based on objective (e.g. only show valid optimization goals)
5. Resolves conditional requirements (e.g. promoted_object required for OUTCOME_LEADS)
6. Returns a schema object the frontend's `SchemaField` component can render

## Frontend Integration

The schema is consumed by:
- `frontend/src/components/meta/SchemaField.tsx` — Recursive field renderer
- `frontend/src/components/meta/MetaForm.tsx` — Stateful form wrapper

Called via `POST /api/drafts/form-schema`.

## Related Pages

- [[meta-field-registry]] — field definitions
- [[components]] — SchemaField and MetaForm components
- [[draft-system]] — forms are used in the draft editing flow
