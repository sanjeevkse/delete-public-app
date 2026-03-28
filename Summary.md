# Geo And Accessibility Frontend Handoff

## Purpose
This document explains the current geo and accessibility model expected by the backend.

Use this as the frontend contract for:
- profile geo
- user accessibility
- geo-backed create/update forms
- reports and list filters

## Core Rules
- Profile geo and accessibility geo are different concepts.
- Frontend should not send `geoUnitId`.
- Frontend sends geo fields.
- Backend resolves and stores the canonical geo leaf internally.
- Accessibility may use `-1` as a wildcard.
- Profile payloads must never use `-1`.

## Two Separate Models

### 1. Profile Geo
This represents the actual location of the user or record.

Examples:
- user profile location
- complaint geo
- schedule event geo
- event registration geo
- scheme application geo

This must resolve to one exact geo leaf.

### 2. Accessibility Geo
This represents what the user is allowed to see, filter, or manage.

Examples:
- user access scope
- role-based visibility
- filtered list access
- partial scope-based targeting

This may be broader than one exact geo leaf.

## Geo Hierarchy

### Common Levels
- `stateId`
- `districtId`
- `mpConstituencyId`
- `mlaConstituencyId`
- `talukId`
- `settlementType`

### Urban Branch
Use when `settlementType = URBAN`.

Fields:
- `governingBody`: `GBA | CC | CMC | TMC | TP`
- `localBodyId`
- `wardNumberId`
- `boothNumberId`
- `pollingStationId` optional

### Rural Branch
Use when `settlementType = RURAL`.

Fields:
- `governingBody`: `GP`
- `hobaliId` optional
- `gramPanchayatId`
- `mainVillageId`
- `subVillageId` optional
- `boothNumberId`
- `pollingStationId` optional

## Required vs Optional
The backend does not require every geo field in every request.
It requires enough fields to resolve one exact geo leaf for exact-record forms.

### Optional Fields
- `pollingStationId`
- `hobaliId`
- `subVillageId` in some rural cases

If optional fields are sent, they must match the final resolved geo leaf.

## Exact Geo Payload Examples

### Urban Exact Leaf
```json
{
  "stateId": 1,
  "districtId": 2,
  "mpConstituencyId": 27,
  "mlaConstituencyId": 150,
  "talukId": 7,
  "settlementType": "URBAN",
  "governingBody": "GBA",
  "localBodyId": 23,
  "wardNumberId": 25,
  "boothNumberId": 40,
  "pollingStationId": 11
}
```

### Rural Exact Leaf
```json
{
  "stateId": 1,
  "districtId": 2,
  "mpConstituencyId": 27,
  "mlaConstituencyId": 150,
  "talukId": 7,
  "settlementType": "RURAL",
  "governingBody": "GP",
  "gramPanchayatId": 50,
  "mainVillageId": 90,
  "subVillageId": 120,
  "boothNumberId": 40,
  "hobaliId": 15,
  "pollingStationId": 11
}
```

## Accessibility Rules
Accessibility supports wildcard input using `-1`.

Meaning of `-1`:
- all descendants under the last fixed parent

The backend compiles wildcard input into normalized access scope.
The backend does not store `-1` as database FK state.

## Accessibility Examples

### All under a state
```json
{
  "stateId": 1,
  "mpConstituencyId": -1
}
```
Meaning:
- all MPs, MLAs, wards, booths, villages under state `1`

### All under an urban local body
```json
{
  "stateId": 1,
  "mlaConstituencyId": 40,
  "settlementType": "URBAN",
  "governingBody": "GBA",
  "localBodyId": 23,
  "wardNumberId": -1
}
```
Meaning:
- all wards and booths under local body `23`

### All under a GP
```json
{
  "stateId": 1,
  "talukId": 7,
  "settlementType": "RURAL",
  "governingBody": "GP",
  "gramPanchayatId": 50,
  "mainVillageId": -1
}
```
Meaning:
- all villages, sub-villages, booths under GP `50`

### Exact urban booth access
```json
{
  "settlementType": "URBAN",
  "governingBody": "GBA",
  "localBodyId": 23,
  "wardNumberId": 25,
  "boothNumberId": 40
}
```

## Invalid Accessibility Payloads
These must be rejected by frontend validation if possible.

### Invalid: wildcard without a fixed parent
```json
{
  "wardNumberId": -1
}
```

### Invalid: child after wildcard
```json
{
  "mlaConstituencyId": 40,
  "wardNumberId": -1,
  "boothNumberId": 40
}
```

### Invalid: rural payload using urban field
```json
{
  "settlementType": "RURAL",
  "governingBody": "GP",
  "wardNumberId": 25
}
```

### Invalid: GP payload with urban local body field
```json
{
  "settlementType": "RURAL",
  "governingBody": "GP",
  "localBodyId": 23,
  "gramPanchayatId": 50
}
```

## Frontend UX Rules

### Profile Forms
- Never send `-1`
- Never send `geoUnitId`
- Send exact geo fields only
- Do not mix urban and rural branch fields

### Accessibility Forms
- `-1` is allowed
- `All` option in dropdowns should map to `-1`
- Only show `All` after a fixed parent is selected
- Do not allow a child selection after an `All` selection on its parent

### Filter Forms
- Partial geo filters are allowed
- Filters can be broad or narrow
- Reports/lists can filter using ancestor-level geo fields

## Recommended Lookup Flow

### Common
- `state -> mp -> mla -> taluk -> settlementType`

### Urban
- `governingBody -> localBody -> ward -> booth`

### Rural
- `hobali -> gramPanchayat -> mainVillage -> subVillage -> booth`

## What Frontend Should Send Now
For geo-bearing create/update APIs, frontend should send the full geo path when available, not only `wardNumberId` and `boothNumberId`.

This applies to:
- user profile create/update
- complaints
- schedule events
- event registrations
- scheme applications
- exact form-event accessibility rows

## What Backend Resolves
Backend resolves and stores exact geo internally for major geo-bearing APIs.

Frontend responsibility:
- provide correct geo inputs
- respect branch rules
- avoid ambiguous payloads

Backend responsibility:
- resolve exact leaf
- reject ambiguous geo
- reject invalid branch combinations
- normalize access wildcard scopes

## Read And Report Filters
Reports and geo-backed list APIs now support partial geo filtering using fields like:
- `stateId`
- `districtId`
- `mpConstituencyId`
- `mlaConstituencyId`
- `talukId`
- `settlementType`
- `governingBody`
- `localBodyId`
- `hobaliId`
- `gramPanchayatId`
- `mainVillageId`
- `subVillageId`
- `pollingStationId`
- `wardNumberId`
- `boothNumberId`

## Response Expectations
Backend responses for geo-backed APIs may include:
- stored geo ids
- `geoUnitId` in response
- enriched `geo` object

Frontend should treat backend response as the final resolved truth.

## What Frontend Must Stop Doing
- do not send `geoUnitId`
- do not use `-1` in profile payloads
- do not assume accessibility equals profile geo
- do not mix rural and urban branch fields
- do not send broad geo for exact-record create/update unless it resolves uniquely

## FE Checklist
1. Use full geo payloads for exact forms.
2. Use `-1` only in accessibility forms.
3. Keep profile geo and accessibility geo as separate UI states.
4. Drive dropdowns using branch-specific lookup flow.
5. Use backend response geo as source of truth after save.
