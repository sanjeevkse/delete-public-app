# Accessibility Matrix Test Bed

- Run ID: `accessibility-matrix-test-bed-2026-03-28T20-17-32-053Z`
- Started At: `2026-03-28T20:17:32.058Z`
- Finished At: `2026-03-28T20:17:34.982Z`
- Passed: `10`
- Failed: `0`

## Scenarios
- [passed] Urban wildcard compiles to LOCAL_BODY and covers sample leaf
- [passed] Rural wildcard compiles to GRAM_PANCHAYAT and covers sample leaf
- [passed] Top-level wildcard compiles to GLOBAL unrestricted access
- [passed] Exact urban booth access resolves and includes sample leaf
- [passed] Explicit child after wildcard is rejected
- [passed] Invalid rural non-GP branch is rejected
- [passed] GP with localBodyId is rejected
- [passed] Ambiguous urban ancestor-only geo input is rejected
- [passed] Optional rural hobaliId and pollingStationId can be omitted when leaf is unique
- [passed] Branch-mixed urban settlement with rural IDs does not resolve
