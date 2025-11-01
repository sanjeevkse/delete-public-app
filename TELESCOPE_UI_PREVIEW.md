# Telescope Dashboard Preview

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🕐 Telescope Monitor                                           │
│  [Purple gradient header]                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [Requests]  Exceptions                                         │
│  ───────────                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [All Methods ▼] [All Status ▼]     🔄 Refresh  🗑️ Clear All   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [GET] [200]                                      15ms    │   │
│  │ /api/users                                               │   │
│  │ ⏰ Nov 1, 2025, 10:30 AM  🌐 192.168.1.1  👤 User #5    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [POST] [201]                                     42ms    │   │
│  │ /api/posts                                               │   │
│  │ ⏰ Nov 1, 2025, 10:29 AM  🌐 192.168.1.2  👤 User #3    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [DELETE] [500]                                   123ms   │   │
│  │ /api/posts/123                                           │   │
│  │ ⏰ Nov 1, 2025, 10:28 AM  🌐 192.168.1.1  👤 User #5    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [◄ Prev] [1] [2] [3] ... [10] [Next ►]                       │
└─────────────────────────────────────────────────────────────────┘
```

## Request Detail Modal

When you click on a request:

```
┌─────────────────────────────────────────────────────────────────┐
│  Request Details                                             ×  │
│  [Purple gradient header]                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  General Information                                            │
│  ─────────────────────                                         │
│  Method:      [GET]                                            │
│  Status:      [200]                                            │
│  Duration:    15ms                                             │
│  Time:        Nov 1, 2025, 10:30:00 AM                        │
│  Path:        /api/users                                       │
│  Full URL:    http://localhost:3000/api/users?limit=10        │
│  IP Address:  192.168.1.1                                     │
│  User ID:     5                                               │
│                                                                 │
│  Query Parameters                                              │
│  ─────────────────────                                         │
│  {                                                             │
│    "limit": "10",                                             │
│    "offset": "0"                                              │
│  }                                                             │
│                                                                 │
│  Request Headers                                               │
│  ─────────────────────                                         │
│  {                                                             │
│    "content-type": "application/json",                        │
│    "authorization": "***REDACTED***",                         │
│    "user-agent": "Mozilla/5.0..."                            │
│  }                                                             │
│                                                                 │
│  Response Body                                                 │
│  ─────────────────────                                         │
│  {                                                             │
│    "success": true,                                           │
│    "data": {                                                  │
│      "users": [...],                                          │
│      "total": 50                                              │
│    }                                                           │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Exceptions Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Requests  [Exceptions]                                         │
│            ────────────                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [All Types ▼]                       🔄 Refresh  🗑️ Clear All   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ValidationError                                          │   │
│  │ Invalid user input: email is required                    │   │
│  │ ⏰ Nov 1, 2025, 10:25 AM  📄 userController.ts:45       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ TypeError                                                │   │
│  │ Cannot read property 'id' of undefined                   │   │
│  │ ⏰ Nov 1, 2025, 10:20 AM  📄 postService.ts:89          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Exception Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Exception Details                                           ×  │
│  [Purple gradient header]                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Exception Information                                          │
│  ─────────────────────                                         │
│  Type:        ValidationError                                  │
│  Message:     Invalid user input: email is required            │
│  Code:        VALIDATION_ERROR                                 │
│  Time:        Nov 1, 2025, 10:25:30 AM                        │
│  File:        /src/controllers/userController.ts              │
│  Line:        45                                               │
│                                                                 │
│  Stack Trace                                                   │
│  ─────────────────────                                         │
│  [Dark background with red text]                              │
│  ValidationError: Invalid user input: email is required       │
│      at validateUser (/src/utils/validator.ts:23:15)         │
│      at createUser (/src/controllers/userController.ts:45:5) │
│      at Layer.handle (/node_modules/express/lib/router...)   │
│      at next (/node_modules/express/lib/router/route.js...)  │
│      ...                                                       │
│                                                                 │
│  Context                                                       │
│  ─────────────────────                                         │
│  {                                                             │
│    "statusCode": 422,                                         │
│    "errorCode": "VALIDATION_ERROR",                           │
│    "path": "/api/users",                                      │
│    "method": "POST",                                          │
│    "userId": null                                             │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Color Scheme

**HTTP Methods:**

- GET: Blue background
- POST: Green background
- PUT: Orange background
- PATCH: Light red background
- DELETE: Pink background

**Status Codes:**

- 2xx (Success): Green
- 3xx (Redirect): Blue
- 4xx (Client Error): Orange
- 5xx (Server Error): Red

**UI Colors:**

- Primary: Purple gradient (#667eea → #764ba2)
- Background: Light gray (#f5f8fa)
- Text: Dark gray (#2d3748)
- Cards: White with shadow
- Code blocks: Dark background (#1a202c)

## Interactive Features

- **Hover Effects**: Cards lift up slightly on hover
- **Click**: Any card opens detailed modal
- **Auto-refresh**: Updates every 10 seconds
- **Filters**: Dropdown menus for quick filtering
- **Pagination**: Navigate through pages
- **Responsive**: Works on desktop, tablet, and mobile

## Browser Compatibility

Works on all modern browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers
