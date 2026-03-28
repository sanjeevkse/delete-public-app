# Accessibility Matrix Test Bed

- Run ID: `accessibility-matrix-test-bed-2026-03-28T19-09-19-345Z`
- Started At: `2026-03-28T19:09:19.518Z`
- Finished At: `2026-03-28T19:09:20.772Z`
- Passed: `7`
- Failed: `3`

## Scenarios
- [failed] Urban wildcard compiles to LOCAL_BODY and covers sample leaf
  error: GeoPolitical is not associated to GeoUnitScope!
- [failed] Rural wildcard compiles to GRAM_PANCHAYAT and covers sample leaf
  error: GeoPolitical is not associated to GeoUnitScope!
- [passed] Top-level wildcard compiles to GLOBAL unrestricted access
- [failed] Exact urban booth access resolves and includes sample leaf
  error: GeoPolitical is not associated to GeoUnitScope!
- [passed] Explicit child after wildcard is rejected
- [passed] Invalid rural non-GP branch is rejected
- [passed] GP with localBodyId is rejected
- [passed] Ambiguous urban ancestor-only geo input is rejected
- [passed] Optional rural hobaliId and pollingStationId can be omitted when leaf is unique
- [passed] Branch-mixed urban settlement with rural IDs does not resolve
