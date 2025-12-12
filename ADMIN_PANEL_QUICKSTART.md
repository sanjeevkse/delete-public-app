# Admin Panel Quick Start Guide

## 1. Installation

EJS has been added to `package.json`. Install dependencies:

```bash
npm install
```

## 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3001`

## 3. Access the Admin Panel

1. **Login first** via the API:

   ```bash
   # Using curl
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```

   Or use Postman with the provided `feed-backend.postman_collection.json`

2. **Copy the JWT token** from the response

3. **Set the token in your browser** (or use Postman):
   - Add to Authorization header: `Bearer <token>`
   - Or save to localStorage: `localStorage.setItem('token', '<token>')`

4. **Open the Admin Dashboard**:
   ```
   http://localhost:3001/admin
   ```

## 4. Navigate the Admin Panel

### Dashboard (`/admin`)

- View system statistics (users, roles, permissions, groups)
- Quick action buttons for all management sections
- System status and recent users list

### Users (`/admin/users`)

- View all users
- Create new users
- Edit user information
- Assign roles to users
- Change user status

### Roles (`/admin/roles`)

- Manage system roles
- Create/edit/delete roles
- Assign permissions to roles
- View role details

### Permissions (`/admin/permissions`)

- Manage system permissions
- Create/edit/delete permissions
- Organize permissions by resource

### Permission Groups (`/admin/permission-groups`)

- Organize permissions into groups
- Create/edit/delete groups
- Manage group permissions

## 5. Common Tasks

### Create a New User

1. Go to **Users** section
2. Click **"Create User"** button
3. Fill in:
   - Email
   - First Name
   - Last Name
   - Password (will be hashed)
   - Status (active/inactive)
4. Click **"Create"**
5. Optionally assign roles on the next page

### Assign a Role to a User

1. Go to **Users**
2. Find and click **"Edit"** on the user
3. Scroll to **"Roles"** section
4. Select roles to assign
5. Click **"Save"**

### Create a New Role

1. Go to **Roles**
2. Click **"Create Role"** button
3. Enter:
   - Role Name (e.g., "Editor", "Reviewer")
   - Description
4. Click **"Create"**
5. Go to role details to assign permissions

### Add Permissions to a Role

1. Go to **Roles**
2. Click on the role name
3. Click **"Manage Permissions"**
4. Check permissions to assign
5. Click **"Save"**

## 6. Architecture Overview

```
Admin Panel Flow:
─────────────────

Browser (http://localhost:3001/admin)
    ↓
    ├─→ Express.js App (app.ts)
    │    ├─→ Auth Middleware (check JWT)
    │    └─→ Admin Routes (adminRoutes.ts)
    │         ├─→ Dashboard Controller
    │         ├─→ User Controller
    │         ├─→ Role Controller
    │         ├─→ Permission Controller
    │         └─→ Permission Group Controller
    │
    ├─→ EJS View Engine (views/admin/)
    │    ├─→ layout.ejs (main template)
    │    ├─→ dashboard.ejs
    │    ├─→ users/list.ejs
    │    ├─→ roles/list.ejs
    │    └─→ ...
    │
    └─→ Bootstrap 5 UI
         ├─→ Responsive Design
         ├─→ Font Awesome Icons
         └─→ Custom CSS Styling
```

## 7. File Locations

| File                                          | Purpose                   |
| --------------------------------------------- | ------------------------- |
| `src/routes/adminRoutes.ts`                   | Admin routes definition   |
| `src/controllers/adminDashboardController.ts` | Dashboard logic           |
| `views/layout.ejs`                            | Main layout template      |
| `views/admin/dashboard.ejs`                   | Dashboard page            |
| `views/admin/users/`                          | User management templates |
| `views/admin/roles/`                          | Role management templates |
| `src/models/User.ts`                          | User model                |
| `src/models/MetaUserRole.ts`                  | Role model                |
| `src/models/MetaPermission.ts`                | Permission model          |

## 8. API Endpoints Used

The admin panel uses these internal API endpoints:

| Endpoint               | Method         | Purpose               |
| ---------------------- | -------------- | --------------------- |
| `/api/users`           | GET/POST       | User operations       |
| `/api/users/:id`       | GET/PUT/DELETE | User details          |
| `/api/roles`           | GET/POST       | Role operations       |
| `/api/roles/:id`       | GET/PUT/DELETE | Role details          |
| `/api/permissions`     | GET/POST       | Permission operations |
| `/api/permissions/:id` | GET/PUT/DELETE | Permission details    |

## 9. Troubleshooting

### "Cannot GET /admin"

- Make sure you're logged in (have valid JWT token)
- Check the token is sent in Authorization header
- Verify EJS views exist in `views/admin/`

### Styles not loading

- Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
- Check if Bootstrap CDN is accessible
- Verify public static file serving is working

### Data not showing

- Check browser console (F12) for JavaScript errors
- Verify database connection in server logs
- Check that API endpoints return data

### 500 Error

- Check server logs for the error message
- Verify database is running
- Check database connection credentials

## 10. Production Deployment

Before deploying to production:

1. **Build TypeScript**:

   ```bash
   npm run build
   ```

2. **Run migrations** (if needed):

   ```bash
   npm run migrate
   ```

3. **Set environment variables**:

   ```bash
   export NODE_ENV=production
   export JWT_SECRET=<your-secret>
   export DB_HOST=<your-db-host>
   # ... other env vars
   ```

4. **Start server** (use PM2):
   ```bash
   pm2 start dist/server.js --name "admin-api"
   pm2 save
   ```

## 11. Development Tips

### Hot Reload

Nodemon is configured to automatically reload on file changes:

```bash
npm start  # Watches for changes
```

### TypeScript Checking

```bash
npm run build  # Checks for TypeScript errors
```

### Run Tests

```bash
npm test  # Run test suite
```

## 12. Support & Next Steps

For more detailed information, see:

- [Full Admin Panel Documentation](./ADMIN_PANEL.md)
- [API Documentation](./API_TEST_RESULTS.md)
- [Database Schema](./Dump20251210.sql)
- [README](./README.md)

## 13. Key Technologies

- **Node.js/Express** - Server framework
- **TypeScript** - Type-safe JavaScript
- **EJS** - Template engine
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icon library
- **Sequelize** - ORM for database
- **JWT** - Authentication tokens

---

**Ready to use!** The admin panel is now fully integrated with your Express.js application.
