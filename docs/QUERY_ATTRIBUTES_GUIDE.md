# Query Attributes Utility - Audit Fields Control

## Overview

This utility provides a standardized way to exclude audit fields from query results by default, while still allowing them to be included when needed via query parameters.

## Excluded Fields (by default)

The following fields are excluded from all query results by default:
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`
- `status`

## Usage

### Basic Usage in Controllers

```typescript
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";

// In your controller endpoint
export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const includeAuditFields = shouldIncludeAuditFields(req.query);
  
  const { rows, count } = await Model.findAndCountAll({
    attributes: buildQueryAttributes({ includeAuditFields }),
    // ... other query options
  });
  
  // ... rest of the code
});
```

### Including Audit Fields via API

Users can include audit fields by adding any of these query parameters:
- `?includeAuditFields=true`
- `?includeAudit=true`
- `?withAudit=true`

**Examples:**
```bash
# Default - excludes audit fields
GET /api/users

# Include audit fields
GET /api/users?includeAuditFields=true

# Works with other query parameters
GET /api/users?search=john&includeAuditFields=true

# Include audit fields in a single item
GET /api/users/123?includeAuditFields=true
```

### Advanced Usage

#### Excluding Additional Fields

```typescript
const attributes = buildQueryAttributes({
  includeAuditFields: false,
  exclude: ['internalNotes', 'deletedAt']
});
```

#### Including Computed Fields

```typescript
const attributes = buildQueryAttributes({
  includeAuditFields: false,
  include: [
    [sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount']
  ]
});
```

#### Combining with Existing Attribute Logic

For complex attribute building (like in postController):

```typescript
const buildPostAttributes = (
  currentUserId?: number,
  includeAuditFields?: boolean
): FindAttributeOptions => {
  const baseAttrs = buildQueryAttributes({ includeAuditFields });
  
  // Merge with your custom attributes
  const customFields = [
    [sequelize.literal('...'), 'customField']
  ];
  
  const baseInclude = Array.isArray(baseAttrs) ? baseAttrs : (baseAttrs as any)?.include || [];
  return {
    ...(typeof baseAttrs === 'object' && !Array.isArray(baseAttrs) ? baseAttrs : {}),
    include: [
      ...baseInclude,
      ...customFields
    ]
  };
};
```

## Updated Controllers

The following controllers have been updated to support this feature:

### User Controller
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID

### Business Controller
- `GET /api/businesses` - List businesses
- `GET /api/businesses/:id` - Get business by ID

### Post Controller
- `GET /api/posts` - List all posts
- `GET /api/posts/my` - List my posts
- `GET /api/posts/:id` - Get post by ID

## API Response Examples

### Without Audit Fields (Default)

```json
GET /api/businesses

{
  "success": true,
  "data": [
    {
      "id": 1,
      "businessName": "Tech Corp",
      "businessTypeId": 5,
      "pan": "ABCDE1234F",
      "gstin": "22ABCDE1234F1Z5",
      "contactNumber": "+919876543210",
      "email": "contact@techcorp.com"
    }
  ],
  "pagination": { ... }
}
```

### With Audit Fields

```json
GET /api/businesses?includeAuditFields=true

{
  "success": true,
  "data": [
    {
      "id": 1,
      "businessName": "Tech Corp",
      "businessTypeId": 5,
      "pan": "ABCDE1234F",
      "gstin": "22ABCDE1234F1Z5",
      "contactNumber": "+919876543210",
      "email": "contact@techcorp.com",
      "status": 1,
      "createdBy": 42,
      "createdAt": "2025-10-15T10:30:00.000Z",
      "updatedBy": 42,
      "updatedAt": "2025-10-20T14:20:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

## Implementation Checklist for New Controllers

When implementing this in new controllers:

1. **Import the utilities:**
   ```typescript
   import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
   ```

2. **Extract the flag from query params:**
   ```typescript
   const includeAuditFields = shouldIncludeAuditFields(req.query);
   ```

3. **Apply to your query:**
   ```typescript
   const result = await Model.findAll({
     attributes: buildQueryAttributes({ includeAuditFields }),
     // ... other options
   });
   ```

4. **Update API documentation:**
   - Add note about `includeAuditFields` query parameter
   - Document which fields are excluded by default

## Benefits

1. **Cleaner API Responses**: Reduces payload size by excluding unnecessary fields
2. **Flexibility**: Audit fields available when needed for debugging or auditing
3. **Consistency**: Standardized approach across all endpoints
4. **Security**: Internal audit fields not exposed by default
5. **Performance**: Smaller payloads mean faster API responses

## Backward Compatibility

This change is **backward compatible** because:
- Existing API calls continue to work without modification
- Clients that need audit fields can opt-in with query parameters
- No breaking changes to existing endpoints

## Testing

Test both scenarios for each updated endpoint:

```bash
# Without audit fields (default)
curl http://localhost:3000/api/users

# With audit fields
curl http://localhost:3000/api/users?includeAuditFields=true

# Combined with other parameters
curl "http://localhost:3000/api/users?search=john&page=2&includeAuditFields=true"
```
