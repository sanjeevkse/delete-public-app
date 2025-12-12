# Admin Panel Documentation

## Overview

The Admin Panel is a modern, web-based dashboard for managing system users, roles, permissions, and permission groups. It's built with **Express.js**, **EJS**, and **Bootstrap 5**, providing a professional UI for administrative tasks.

## Access

- **URL**: `http://localhost:3001/admin`
- **Authentication**: Requires JWT token (via `/api/auth/login`)
- **Port**: Same as the main API (3001)

## Features

### 1. **Dashboard** (`/admin`)

The main admin dashboard provides:

- **Statistics Cards**: Display counts of Users, Roles, Permissions, and Permission Groups
- **Quick Actions**: Direct links to all management sections
- **System Status**: Shows database, API, and server health
- **Recent Users**: List of the 5 most recently created users
- **Real-time Clock**: Live server time display

### 2. **User Management** (`/admin/users`)

Manage application users with features:

- List all users with pagination
- View user details
- Create new users
- Edit user information
- Change user status (active/inactive)
- Assign/unassign roles to users
- Delete users

### 3. **Role Management** (`/admin/roles`)

Manage system roles with features:

- List all roles
- View role details
- Create new roles
- Edit role information
- Assign permissions to roles
- Delete roles
- Manage role hierarchies

### 4. **Permission Management** (`/admin/permissions`)

Manage system permissions with features:

- List all permissions
- View permission details
- Create new permissions
- Edit permission information
- Delete permissions
- Organize permissions by resource type

### 5. **Permission Groups** (`/admin/permission-groups`)

Manage permission groups for organizing related permissions:

- List all permission groups
- Create new groups
- Edit group details
- Assign permissions to groups
- Delete groups

## Architecture

### File Structure

```
src/
├── controllers/
│   └── adminDashboardController.ts      # Dashboard controller
├── routes/
│   └── adminRoutes.ts                   # Admin routes
└── middleware/
    └── authMiddleware.ts                # Authentication check

views/
├── layout.ejs                           # Main layout template
└── admin/
    ├── dashboard.ejs                    # Dashboard page
    ├── users/
    │   ├── list.ejs                     # Users list
    │   ├── create.ejs                   # Create user form
    │   └── edit.ejs                     # Edit user form
    ├── roles/
    │   ├── list.ejs                     # Roles list
    │   ├── create.ejs                   # Create role form
    │   └── edit.ejs                     # Edit role form
    ├── permissions/
    │   ├── list.ejs                     # Permissions list
    │   ├── create.ejs                   # Create permission form
    │   └── edit.ejs                     # Edit permission form
    ├── permission-groups/
    │   ├── list.ejs                     # Permission groups list
    │   ├── create.ejs                   # Create group form
    │   └── edit.ejs                     # Edit group form
    ├── role-permissions/
    │   └── mapper.ejs                   # Role-permission mapper
    └── sidebar/
        └── index.ejs                    # Sidebar management

public/
└── css/
    └── admin.css                        # Admin-specific styles
```

### Database Models Used

The admin panel uses the following Sequelize models:

1. **User** - Application users
2. **MetaUserRole** - System roles
3. **MetaPermission** - System permissions
4. **MetaPermissionGroup** - Permission groups
5. **UserRole** - User-role associations
6. **RolePermission** - Role-permission associations

### Routes

All routes are prefixed with `/admin` and require authentication.

| Route                    | Method | Description            |
| ------------------------ | ------ | ---------------------- |
| `/`                      | GET    | Admin dashboard        |
| `/users`                 | GET    | List users             |
| `/users`                 | POST   | Create user            |
| `/users/:id`             | GET    | Get user details       |
| `/users/:id`             | PUT    | Update user            |
| `/users/:id`             | DELETE | Delete user            |
| `/roles`                 | GET    | List roles             |
| `/roles`                 | POST   | Create role            |
| `/roles/:id`             | GET    | Get role details       |
| `/roles/:id`             | PUT    | Update role            |
| `/roles/:id`             | DELETE | Delete role            |
| `/permissions`           | GET    | List permissions       |
| `/permissions`           | POST   | Create permission      |
| `/permissions/:id`       | GET    | Get permission details |
| `/permissions/:id`       | PUT    | Update permission      |
| `/permissions/:id`       | DELETE | Delete permission      |
| `/permission-groups`     | GET    | List permission groups |
| `/permission-groups`     | POST   | Create group           |
| `/permission-groups/:id` | GET    | Get group details      |
| `/permission-groups/:id` | PUT    | Update group           |
| `/permission-groups/:id` | DELETE | Delete group           |

## Authentication & Authorization

### Authentication

- All admin routes are protected by the `authenticate()` middleware
- Users must have a valid JWT token in the Authorization header
- Token is obtained via the `/api/auth/login` endpoint

### Authorization

The admin panel respects the role-based access control (RBAC) system:

- Super admin users have access to all admin pages
- Role-based access can be restricted per route
- Permission checks can be enforced at the controller level

## Design & UI

### Technology Stack

- **Frontend Framework**: Bootstrap 5
- **Icons**: Font Awesome 6.4.0
- **Template Engine**: EJS
- **CSS**: Custom CSS with professional styling
- **Colors**:
  - Primary: `#667eea` (Purple)
  - Secondary: `#764ba2` (Deep Purple)
  - Bootstrap utility colors for status indicators

### Sidebar Navigation

The sidebar provides quick navigation to all admin sections:

- Dashboard
- User Management
- Role Management
- Permission Management
- Permission Groups
- Sidebar Settings

### Responsive Design

- Desktop-first approach
- Responsive breakpoints for tablets and mobile devices
- Collapsible sidebar on smaller screens
- Touch-friendly buttons and forms

## Usage Examples

### Accessing the Dashboard

1. Login to the application via `/api/auth/login`
2. Navigate to `http://localhost:3001/admin`
3. You'll see the dashboard with system statistics and quick actions

### Creating a New Role

1. Click "Manage Roles" on the dashboard or use the sidebar
2. Click "Create New Role" button
3. Fill in role details (name, description)
4. Click "Create"
5. Assign permissions to the role as needed

### Assigning Roles to Users

1. Go to User Management
2. Click "Edit" on the desired user
3. In the roles section, select roles to assign
4. Click "Save"

### Managing Permissions

1. Go to Permission Management
2. Create, edit, or delete permissions
3. Permissions can be organized by resource type (e.g., "users", "roles", "reports")

## Configuration

### Environment Variables

The admin panel inherits configuration from `config/env.ts`:

- `NODE_ENV`: Development, staging, or production
- `PORT`: Server port (default 3001)
- `DB_*`: Database connection settings
- `JWT_SECRET`: Secret for JWT token validation

### Customization

#### Changing Colors

Edit the CSS variables in `views/layout.ejs`:

```css
:root {
  --primary: #667eea; /* Primary color */
  --secondary: #764ba2; /* Secondary color */
  --sidebar-width: 260px; /* Sidebar width */
}
```

#### Adding New Admin Pages

1. Create a new controller method
2. Add a route in `adminRoutes.ts`
3. Create EJS template in `views/admin/`
4. Add navigation link in the sidebar
5. Build and restart the server

## API Integration

The admin panel can integrate with the REST API endpoints:

```typescript
// Example: Fetch users from API
const response = await fetch("/api/users", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});
```

All data operations should go through the existing REST API endpoints when possible, maintaining consistency with the backend logic.

## Performance Considerations

- **Pagination**: List pages implement pagination to handle large datasets
- **Lazy Loading**: User and role lists load on demand
- **Caching**: Consider caching role and permission lists (currently stateless)
- **Query Optimization**: Use database indexes on frequently queried fields

## Security Features

- **Authentication Required**: All routes protected by JWT authentication
- **CSRF Protection**: Consider enabling CSRF middleware
- **Input Validation**: All form inputs should be validated
- **SQL Injection Prevention**: Using Sequelize ORM prevents SQL injection
- **XSS Protection**: EJS automatically escapes template output

## Troubleshooting

### Dashboard Not Loading

- Verify you're logged in with a valid JWT token
- Check browser console for JavaScript errors
- Verify database connection is active

### 404 Errors on Admin Pages

- Ensure EJS templates exist in `views/admin/`
- Check that routes are properly configured in `adminRoutes.ts`
- Restart the server after adding new routes

### Style Issues

- Clear browser cache (Cmd+Shift+R on Mac)
- Verify Bootstrap CDN is accessible
- Check browser console for CSS errors

### Database Errors

- Verify database is running and accessible
- Check database credentials in environment variables
- Review database logs for connection errors

## Future Enhancements

- [ ] Audit logging for admin actions
- [ ] Admin activity timeline
- [ ] Bulk operations (create/delete multiple users)
- [ ] Export data to CSV/Excel
- [ ] Admin reports and analytics
- [ ] Two-factor authentication for admin accounts
- [ ] Session management and device tracking
- [ ] Admin dashboard customization
- [ ] Email notifications for admin actions
- [ ] Advanced search and filtering

## Support & Development

### Building from Source

```bash
npm run build   # Compile TypeScript
npm start       # Start with nodemon
npm run dev     # Development mode
```

### Testing

```bash
npm test        # Run test suite
npm run test:admin  # Run admin-specific tests
```

### Deployment

```bash
npm run build    # Build for production
npm start        # Start server
# Use process manager like PM2:
pm2 start dist/server.js
```

## Related Documentation

- [Authentication](../README.md#authentication)
- [Role-Based Access Control](../DATABASE_POLICY.md)
- [API Documentation](../API_TEST_RESULTS.md)
- [Database Schema](../Dump20251210.sql)
