# Geo API Test Bed

Single-run geo regression harness for the rebuilt geo architecture.

## Command

```bash
npm run test:geo-bed
```

## What it covers

- profile update with:
  - legacy `wardNumberId` + `boothNumberId`
  - full urban geo leaf
  - full rural geo leaf
- complaint create with:
  - legacy ward/booth
  - full geo leaf
- event create
- event registration with:
  - legacy ward/booth
  - full geo leaf
- event registrations list with partial geo filters
- schedule event create with full geo leaf
- schedule event list with partial geo filters
- scheme application create with full geo leaf
- scheme application list with partial geo filters
- form event create/update with geo accessibility payloads
- users report with partial geo filters
- public events report with partial geo filters
- posts report with partial geo filters
- form event report with legacy ward/booth filters
- targeted notification with partial geo accesses

## Discovery

The harness discovers valid runtime ids directly from the database:

- admin user contact
- sample urban geo leaf
- sample rural geo leaf
- first active form
- first active scheme
- supporting meta ids like complaint type, event type, color, role, sector, government level

It also creates a fresh public user via OTP login for self-profile and user-facing flows.

## Requirements

- local API server running on `PORT` from `.env`
- database reachable from `.env`
- `MASTER_OTP` available in `.env`

## Output

Every run writes:

- `artifacts/geo-api-test-bed/<run-id>.json`
- `artifacts/geo-api-test-bed/<run-id>.md`

These include scenario-level status, HTTP codes, and failures.

## Notes

- This is a geo-focused test bed, not a complete backend test suite.
- It covers the geo-bearing APIs and report/filter flows touched by the ideal geo implementation.
- `form event report` is still tested through legacy ward/booth filters because submissions are not fully geo-unit-native yet.
