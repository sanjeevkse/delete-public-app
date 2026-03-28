# All API Test Bed

Run:

```bash
npm run test:all-api-bed
```

What it does:
- inventories every mounted route from `src/routes`
- discovers live DB context and logs in through OTP
- hits every endpoint once in a single run
- uses a real payload for key auth/notification endpoints
- uses route-existence smoke payloads for the rest

Result buckets:
- `passed`: route returned `2xx/3xx`
- `reachable4xx`: route returned `4xx` other than `404`
- `soft404`: route returned `404` on a dynamic path with sample IDs
- `failed`: route returned `5xx` or request execution failed

Reports:
- `artifacts/all-api-test-bed/<run-id>.json`
- `artifacts/all-api-test-bed/<run-id>.md`

Notes:
- This bed is intended to verify that every API route is reachable in one run.
- It is not a replacement for feature-specific happy-path tests.
- Dynamic endpoints with placeholder IDs may land in `soft404` even when the route is correct.
