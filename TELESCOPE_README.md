# Telescope - API Request & Exception Monitor

A Laravel Telescope-inspired monitoring package for your Node.js/TypeScript application. Monitor API requests, responses, and exceptions in real-time with a beautiful web UI.

## Features

- 📊 **Request Logging**: Captures full request and response data including headers, body, query params
- 🐛 **Exception Tracking**: Logs exceptions with stack traces, file locations, and context
- 🎨 **Beautiful UI**: Clean, responsive dashboard similar to Laravel Telescope
- 🔍 **Filtering & Search**: Filter by method, status code, exception type
- 📄 **Pagination**: Handle thousands of entries efficiently
- 🔄 **Auto-refresh**: Dashboard auto-updates every 10 seconds
- 🗑️ **Data Management**: Clear old entries, automatic cleanup based on storage limits
- 🔐 **Privacy**: Automatically redacts sensitive data (passwords, tokens, etc.)

## Installation

The Telescope package is already integrated into your application. Just run the migration:

```bash
npx sequelize-cli db:migrate
```

## Configuration

Add the following environment variables to your `.env` file (all optional):

```env
# Enable/disable Telescope (default: true)
TELESCOPE_ENABLED=true

# Maximum number of entries to keep in database (default: 1000)
TELESCOPE_STORAGE_LIMIT=1000

# Maximum body size to capture in bytes (default: 100000 = 100KB)
TELESCOPE_MAX_BODY_SIZE=100000

# Capture request body (default: true)
TELESCOPE_CAPTURE_REQUEST_BODY=true

# Capture response body (default: true)
TELESCOPE_CAPTURE_RESPONSE_BODY=true

# Capture headers (default: true)
TELESCOPE_CAPTURE_HEADERS=true
```

## Usage

### Access the Dashboard

Once your application is running, access the Telescope dashboard at:

```
http://localhost:3000/telescope
```

### Dashboard Features

#### Requests Tab

- View all API requests with method, status code, duration, and timestamp
- Click on any request to see full details including:
  - Request headers, body, and query parameters
  - Response body and headers
  - IP address and user information
- Filter by HTTP method (GET, POST, PUT, etc.)
- Filter by status code
- Paginate through entries

#### Exceptions Tab

- View all exceptions with type, message, and timestamp
- Click on any exception to see:
  - Full stack trace
  - File and line number where error occurred
  - Exception context and related request information
- Filter by exception type
- Paginate through entries

#### Controls

- **Refresh**: Manually refresh the current view
- **Clear All**: Delete all entries (requests or exceptions)
- **Auto-refresh**: Dashboard automatically refreshes every 10 seconds

## How It Works

### Request Logging

1. The `telescopeMiddleware` intercepts all requests
2. Captures request data (method, headers, body, etc.)
3. Intercepts response to capture response data
4. Stores everything in `telescope_requests` table
5. Automatically cleans up old entries based on storage limit

### Exception Logging

1. The `errorHandler` catches all exceptions
2. Extracts stack trace, file location, and context
3. Stores exception in `telescope_exceptions` table
4. Links exception to the request that caused it

### Privacy & Security

- Sensitive fields are automatically redacted:
  - `password`, `token`, `secret`, `authorization`, `cookie`, `api_key`
- Large payloads are automatically truncated
- Configure what data to capture via environment variables

## Customization

### Exclude Paths

To exclude certain paths from being logged, modify `src/services/telescopeService.ts`:

```typescript
const defaultConfig: TelescopeConfig = {
  // ...
  excludePaths: ["/telescope", "/uploads", "/health"]
  // ...
};
```

### Adjust Storage Limits

Change the storage limit in your environment:

```env
TELESCOPE_STORAGE_LIMIT=5000  # Keep last 5000 entries
```

### Disable Telescope in Production

```env
TELESCOPE_ENABLED=false
```

## Database Tables

### `telescope_requests`

Stores API request and response data:

- Request method, path, full URL
- Status code and duration
- IP address and user agent
- Headers, query params, body
- Response body and headers
- User ID (if authenticated)
- Linked exception ID (if error occurred)

### `telescope_exceptions`

Stores exception details:

- Exception type and message
- Error code
- File path and line number
- Full stack trace
- Context data

## Performance Considerations

1. **Async Logging**: All logging happens asynchronously to not block requests
2. **Auto Cleanup**: Old entries are automatically deleted based on storage limit
3. **Efficient Queries**: Proper indexes on commonly filtered columns
4. **Failed Logging**: If logging fails, it fails silently without affecting your API
5. **Size Limits**: Large payloads are truncated to prevent database bloat

## Troubleshooting

### Telescope not showing requests

1. Check if `TELESCOPE_ENABLED=true` in your `.env`
2. Ensure migrations have been run
3. Check that middleware is registered in `src/app.ts`

### Dashboard not accessible

1. Verify the route is registered: `app.use("/telescope", telescopeRoutes)`
2. Check your server is running
3. Try accessing: `http://localhost:YOUR_PORT/telescope`

### Database errors

1. Run migrations: `npx sequelize-cli db:migrate`
2. Check database connection
3. Verify MySQL/MariaDB supports JSON columns

## API Endpoints

The following API endpoints are available:

- `GET /telescope/` - Dashboard UI
- `GET /telescope/api/requests` - List requests (with pagination/filters)
- `GET /telescope/api/requests/:uuid` - Get request details
- `GET /telescope/api/exceptions` - List exceptions (with pagination/filters)
- `GET /telescope/api/exceptions/:uuid` - Get exception details
- `DELETE /telescope/api/requests` - Clear all requests
- `DELETE /telescope/api/exceptions` - Clear all exceptions

## License

Part of your application - same license applies.
