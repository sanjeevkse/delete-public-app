# Accessibility Matrix Test Bed

- Run ID: `accessibility-matrix-test-bed-2026-03-28T20-58-29-756Z`
- Started At: `2026-03-28T20:58:29.759Z`
- Finished At: `2026-03-28T20:58:32.724Z`
- Passed: `20`
- Failed: `0`

## Scenarios
- [passed] Urban wildcard compiles to LOCAL_BODY and covers sample leaf
- [passed] Rural wildcard compiles to GRAM_PANCHAYAT and covers sample leaf
- [passed] Top-level wildcard compiles to GLOBAL unrestricted access
- [passed] Exact urban booth access resolves and includes sample leaf
- [passed] Exact rural booth access resolves and includes sample leaf
- [passed] MLA wildcard compiles to MLA_CONSTITUENCY and covers urban sample leaf
- [passed] Main-village wildcard compiles to MAIN_VILLAGE and covers rural sample leaf
- [passed] Explicit child after wildcard is rejected
- [passed] Duplicate access rows dedupe to one compiled scope
- [passed] Multiple access rows union includes both sampled urban leaves
- [passed] Urban scoped access excludes sampled rural leaf
- [passed] Rural scoped access excludes sampled urban leaf
- [passed] Invalid rural non-GP branch is rejected
- [passed] Urban exact leaf still resolves when pollingStationId is omitted
- [passed] GP with localBodyId is rejected
- [passed] Ambiguous urban ancestor-only geo input is rejected
- [passed] Optional rural hobaliId and pollingStationId can be omitted when leaf is unique
- [passed] Exact rural leaf resolves when optional hobaliId is present
- [passed] Multiple access rows across branches union includes one urban and one rural leaf
- [passed] Branch-mixed urban settlement with rural IDs does not resolve
