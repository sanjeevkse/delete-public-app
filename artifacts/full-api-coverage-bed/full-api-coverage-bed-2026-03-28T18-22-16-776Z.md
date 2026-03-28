# Full API Coverage Bed

- Run ID: `full-api-coverage-bed-2026-03-28T18-22-16-776Z`
- Started At: `2026-03-28T18:22:16.777Z`
- Finished At: `2026-03-28T18:22:17.124Z`

## CRUD API scenarios

- Script: `scripts/crudApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/crud-api-test-bed/crud-api-test-bed-2026-03-28T18-22-16-829Z.json`
- MD Report: `artifacts/crud-api-test-bed/crud-api-test-bed-2026-03-28T18-22-16-829Z.md`
- Summary: `passed=0, failed=0, skipped=0`

```text
Error: Discovery failed: missing admin user, permission, or MLA constituency
    at discoverContext (/Users/rish6ix/personal/Feed/scripts/crudApiTestBed.js:197:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (/Users/rish6ix/personal/Feed/scripts/crudApiTestBed.js:219:17)
```

## Geo and accessibility scenarios

- Script: `scripts/geoApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/geo-api-test-bed/geo-api-test-bed-2026-03-28T18-22-16-923Z.json`
- MD Report: `artifacts/geo-api-test-bed/geo-api-test-bed-2026-03-28T18-22-16-923Z.md`
- Summary: `passed=0, failed=0, skipped=0`

```text
Error: Discovery failed: required admin user, geo leaves, form, scheme, or public role are missing
    at discoverContext (/Users/rish6ix/personal/Feed/scripts/geoApiTestBed.js:235:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (/Users/rish6ix/personal/Feed/scripts/geoApiTestBed.js:365:17)
```

## All route sweep

- Script: `scripts/allApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/all-api-test-bed/all-api-test-bed-2026-03-28T18-22-17-059Z.json`
- MD Report: `artifacts/all-api-test-bed/all-api-test-bed-2026-03-28T18-22-17-059Z.md`
- Summary: `total=309, passed=0, reachable4xx=0, soft404=0, failed=0`

```text
Error: Could not discover required admin/public users
    at discoverContext (/Users/rish6ix/personal/Feed/scripts/allApiTestBed.js:333:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (/Users/rish6ix/personal/Feed/scripts/allApiTestBed.js:590:17)
```
