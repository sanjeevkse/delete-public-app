# 🔭 Telescope Quick Start Guide

Get up and running with Telescope in 3 simple steps!

## Step 1: Run the Migration

Create the database tables for Telescope:

```bash
npx sequelize-cli db:migrate
```

This will create two tables:

- `telescope_requests` - Stores API request/response logs
- `telescope_exceptions` - Stores exception logs

## Step 2: Configure (Optional)

Add environment variables to your `.env` file if you want to customize:

```env
# Enable/disable Telescope (default: true)
TELESCOPE_ENABLED=true

# How many entries to keep (default: 1000)
TELESCOPE_STORAGE_LIMIT=1000
```

See `.env.telescope.example` for all available options.

## Step 3: Start Your Application

```bash
npm run dev
```

## Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000/telescope
```

(Replace `3000` with your actual port number)

## What You'll See

### Requests Tab

- Every API call to your application
- Request method, path, status code, duration
- Click any request to see full details:
  - Request headers, body, query params
  - Response body and headers
  - User info, IP address

### Exceptions Tab

- All errors and exceptions
- Exception type, message, timestamp
- Click any exception to see:
  - Full stack trace
  - File and line number
  - Context about what caused it

## Features at a Glance

- ✅ Auto-refreshes every 10 seconds
- ✅ Filter by method, status code, exception type
- ✅ Pagination for large datasets
- ✅ One-click to clear all logs
- ✅ Automatic cleanup of old entries
- ✅ Privacy: Sensitive data (passwords, tokens) automatically redacted

## Testing It Out

1. Make some API calls to your application
2. Refresh the Telescope dashboard
3. Click on any request to see detailed information
4. Try causing an error to see exception tracking

## Disable in Production

In production, you can disable Telescope by setting:

```env
TELESCOPE_ENABLED=false
```

Or simply don't run the migration on production databases.

## Need Help?

See the full documentation in `TELESCOPE_README.md`

---

**Pro Tip**: Keep Telescope open in a separate browser tab while developing to monitor your API in real-time!
