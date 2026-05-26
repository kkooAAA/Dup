---
name: targeting-schema-rendering
description: Where ad set targeting fields (region/city/postal/detailed/custom audience) are defined and rendered in AdSpawn
metadata:
  type: project
---

Ad set targeting fields are NOT hand-written form components. They are schema-driven.

- Backend defines them in `backend/src/services/draft/MetaFormSchemaEngine.ts` as part of the adSet `targeting` object schema:
  - `geo_locations` (object) → `regions`, `cities`, `zips` are each `type: 'array'` of objects whose user-editable identifier field is `key` (Region Key, City Key, Zip Key). `countries` is `type: 'tags'`.
  - `flexible_spec` ("Detailed Targeting (Include)") and `exclusions` ("Detailed Targeting (Exclude)") are arrays of objects whose user-editable identifier field is `id`.
  - `custom_audiences` and `excluded_custom_audiences` are arrays of objects with a user-editable `id`.
- Frontend renders them recursively via `frontend/src/components/meta/SchemaField.tsx` (`SchemaFieldRenderer` → `ArrayField`/`ObjectField`/`StringField`). The stateful wrapper is `frontend/src/components/meta/MetaForm.tsx`.
- On the drafts detail page `frontend/src/app/drafts/[id]/page.tsx`, the schema-driven `MetaForm` lives in the "Full Schema" tab (the "Edit Form" tab `renderAdSetForm()` only has goal/budget/promoted_object/schedule, NO targeting). So targeting bugs are in the SchemaField/MetaForm path.

**How to apply:** To add/change a targeting field, edit MetaFormSchemaEngine; the UI auto-renders. There is no dedicated TargetingEditor/GeoPicker component. See [[arrayfield-react-key-focus]] for the focus pitfall in these array fields.
