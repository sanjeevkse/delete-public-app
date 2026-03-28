# Full API Coverage Bed

Run:

```bash
npm run test:full-api-bed
```

What it does in one run:
- executes deterministic CRUD scenarios for stable resource APIs
- executes the geo and accessibility scenario suite
- executes the full route sweep across mounted APIs
- writes a single aggregate report plus the underlying suite reports

Suites included:
- `scripts/accessibilityMatrixTestBed.js`
- `scripts/crudApiTestBed.js`
- `scripts/geoApiTestBed.js`
- `scripts/allApiTestBed.js`

Aggregate reports:
- `artifacts/full-api-coverage-bed/<run-id>.json`
- `artifacts/full-api-coverage-bed/<run-id>.md`

Underlying reports:
- `artifacts/accessibility-matrix-test-bed/*`
- `artifacts/crud-api-test-bed/*`
- `artifacts/geo-api-test-bed/*`
- `artifacts/all-api-test-bed/*`

Notes:
- The CRUD suite targets endpoints with stable, deterministic payload requirements.
- The geo suite covers exact geo leaves, partial geo filters, and accessibility-sensitive flows.
- The route sweep still touches every mounted route even if a deterministic CRUD scenario is not available for that endpoint family.
