# BulkEditCompatibilityEngine

Computes the set of shared editable fields across a heterogeneous selection of draft entities. When a user selects multiple campaigns or adsets with different objectives, this engine determines which fields are safely editable across all of them.

Source: `backend/src/services/draft/BulkEditCompatibilityEngine.ts`

## Problem It Solves

If a user selects 3 adsets — one with OUTCOME_SALES, one with OUTCOME_LEADS, one with OUTCOME_TRAFFIC — each has different valid optimization goals, destination types, and promoted object requirements. The engine computes the intersection: which fields exist on all three, which enum values are valid across all three, and which fields are editable (mutable) on all three.

## Usage

Called via `POST /api/drafts/bulk-edit/*` endpoints. The frontend sends the list of selected entity IDs, the engine computes compatible fields, and the UI renders a form with only those fields.

## Related Pages

- [[meta-field-registry]] — field definitions and compatibility maps used for intersection logic
- [[draft-system]] — part of the draft editing workflow
- [[objectives]] — different objectives have different valid field values
