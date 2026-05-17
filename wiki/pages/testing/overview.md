# Testing Strategy

The backend has comprehensive test coverage (98.85% statements, 99.38% lines) covering the draft services.

Source: `backend/tests/`

## Running Tests

```bash
cd backend
npm test              # All tests (1267 tests, ~1s)
npm run test:watch    # Watch mode
npm run test:coverage # With v8 coverage
npm run test:drift    # Live Meta API validation (requires META_ACCESS_TOKEN)
```

## Test Categories

### Unit Tests (`tests/unit/`)
- **Field matrix tests** — Verify field definitions in [[meta-field-registry]] are correct and consistent
- **Conversion matrix tests** — Verify all objective-to-objective conversions produce valid payloads
- **Form schema tests** — Verify [[meta-form-schema-engine]] generates correct schemas for each objective
- **Bulk edit tests** — Verify [[bulk-edit-compatibility-engine]] computes correct field intersections
- **Publish tests** — Verify [[draft-publish-service]] produces valid Meta API payloads
- **Draft service tests** — Verify draft CRUD operations

### Contract Tests (`tests/contracts/`)
Verify the shape of Meta API payloads. Each contract test checks that the payload produced for a specific objective matches the expected structure (correct fields present, no invalid fields, correct types).

### Integration Tests (`tests/integration/`)
Full pipeline tests: optimize → validate → check contract. Ensure the complete flow from raw Meta data to publishable payload works correctly.

### Snapshot Tests (`tests/snapshots/`)
Payload stability snapshots. If a code change alters the shape of a payload, the snapshot test fails, alerting you to review the change.

### Drift Tests (`tests/drift/`)
Live Meta API validation:
- **Registry consistency** — Verify that [[meta-field-registry]] definitions match what Meta actually accepts
- **Live drift detection** — Send payloads to Meta with `validation_only: true` to detect API changes
- Requires `META_ACCESS_TOKEN` and `META_AD_ACCOUNT_ID` in `.env`

### Fixtures (`tests/fixtures/`)
Shared realistic test data for all 6 objectives. Used across all test categories.

## Auto-Generation

Tests auto-generate from `MetaFieldRegistry` definitions. Adding a new objective or field to the registry automatically creates corresponding test cases. This ensures registry changes are always tested.

## Coverage Scope

Coverage is scoped to `src/services/draft/**` (configured in `vitest.config.ts`).

## Related Pages

- [[meta-field-registry]] — test generation source
- [[field-optimization-engine]] — primary target of integration tests
- [[meta-api-constraints]] — drift tests validate against these
