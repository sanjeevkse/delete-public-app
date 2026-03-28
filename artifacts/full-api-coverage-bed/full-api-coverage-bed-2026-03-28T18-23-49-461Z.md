# Full API Coverage Bed

- Run ID: `full-api-coverage-bed-2026-03-28T18-23-49-461Z`
- Started At: `2026-03-28T18:23:49.462Z`
- Finished At: `2026-03-28T18:23:50.843Z`

## CRUD API scenarios

- Script: `scripts/crudApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/crud-api-test-bed/crud-api-test-bed-2026-03-28T18-23-49-537Z.json`
- MD Report: `artifacts/crud-api-test-bed/crud-api-test-bed-2026-03-28T18-23-49-537Z.md`
- Summary: `passed=6, failed=4, skipped=0`

## Geo and accessibility scenarios

- Script: `scripts/geoApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/geo-api-test-bed/geo-api-test-bed-2026-03-28T18-23-50-569Z.json`
- MD Report: `artifacts/geo-api-test-bed/geo-api-test-bed-2026-03-28T18-23-50-569Z.md`
- Summary: `passed=0, failed=0, skipped=0`

```text
TypeError: fetch failed
    at node:internal/deps/undici/undici:13510:13
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Object.request (/Users/rish6ix/personal/Feed/scripts/geoApiTestBed.js:97:24)
    at async loginViaOtp (/Users/rish6ix/personal/Feed/scripts/geoApiTestBed.js:263:3)
    at async main (/Users/rish6ix/personal/Feed/scripts/geoApiTestBed.js:377:26) {
  [cause]: Error: connect ECONNREFUSED 127.0.0.1:8081
      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
    errno: -61,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 8081
  }
}
```

## All route sweep

- Script: `scripts/allApiTestBed.js`
- Exit Code: `1`
- JSON Report: `artifacts/all-api-test-bed/all-api-test-bed-2026-03-28T18-23-50-748Z.json`
- MD Report: `artifacts/all-api-test-bed/all-api-test-bed-2026-03-28T18-23-50-748Z.md`
- Summary: `total=309, passed=0, reachable4xx=0, soft404=0, failed=0`

```text
TypeError: fetch failed
    at node:internal/deps/undici/undici:13510:13
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Object.request (/Users/rish6ix/personal/Feed/scripts/allApiTestBed.js:178:24)
    at async loginViaOtp (/Users/rish6ix/personal/Feed/scripts/allApiTestBed.js:194:3)
    at async main (/Users/rish6ix/personal/Feed/scripts/allApiTestBed.js:602:26) {
  [cause]: Error: connect ECONNREFUSED 127.0.0.1:8081
      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
    errno: -61,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 8081
  }
}
```
