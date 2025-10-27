# API Response Standardization Guide

This guide explains how to use the standardized API response utilities in your project.

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Available Functions](#available-functions)
- [Migration Guide](#migration-guide)
- [Usage Examples](#usage-examples)

## 🎯 Overview

The API response utilities provide a consistent, standardized format for all API responses across your application, following RESTful best practices.

**Location:** `src/utils/apiResponse.ts`

## 📦 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Success with Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "message": "Optional success message",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }  // Optional
  }
}
```

## 🛠 Available Functions

### Success Responses

| Function | Status | Description |
|----------|--------|-------------|
| `sendSuccess(res, data, message?, statusCode?)` | 200 | Standard success response |
| `sendCreated(res, data, message?)` | 201 | Resource created successfully |
| `sendNoContent(res)` | 204 | No content (typically for DELETE) |
| `sendSuccessWithPagination(res, data, pagination, message?)` | 200 | Success with pagination metadata |

### Error Responses

| Function | Status | Error Code | Description |
|----------|--------|------------|-------------|
| `sendBadRequest(res, message?)` | 400 | BAD_REQUEST | Invalid request |
| `sendUnauthorized(res, message?)` | 401 | UNAUTHORIZED | Authentication required |
| `sendForbidden(res, message?)` | 403 | FORBIDDEN | Insufficient permissions |
| `sendNotFound(res, message?, resource?)` | 404 | NOT_FOUND | Resource not found |
| `sendConflict(res, message?, resource?)` | 409 | CONFLICT | Resource conflict |
| `sendValidationError(res, message?, details?)` | 422 | VALIDATION_ERROR | Validation failed |
| `sendError(res, code, message, statusCode?, details?)` | Custom | Custom | Generic error response |

### Utility Functions

| Function | Description |
|----------|-------------|
| `parsePaginationParams(page?, limit?, defaultLimit?, maxLimit?)` | Parse and validate pagination parameters |
| `calculatePagination(total, page, limit)` | Calculate pagination metadata |

## 🔄 Migration Guide

### Step 1: Import the utilities

```typescript
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination,
} from "../utils/apiResponse";
```

### Step 2: Replace response patterns

#### Simple GET request

**Before:**
```typescript
res.json(user);
```

**After:**
```typescript
return sendSuccess(res, user, "User retrieved successfully");
```

---

#### POST request (Create)

**Before:**
```typescript
res.status(201).json(newUser);
```

**After:**
```typescript
return sendCreated(res, newUser, "User created successfully");
```

---

#### DELETE request

**Before:**
```typescript
res.status(204).send();
```

**After:**
```typescript
return sendNoContent(res);
```

---

#### Not Found Error

**Before:**
```typescript
throw new ApiError("User not found", 404);
```

**After (Option 1 - Direct response):**
```typescript
return sendNotFound(res, "User not found", "user");
```

**After (Option 2 - Still throw error, handled by middleware):**
```typescript
throw new ApiError("User not found", 404, "USER_NOT_FOUND");
```

---

#### Validation Error

**Before:**
```typescript
throw new ApiError("Validation failed", 422);
```

**After:**
```typescript
const validationErrors = [
  { field: "email", message: "Invalid email" },
  { field: "password", message: "Too short" }
];
return sendValidationError(res, "Validation failed", validationErrors);
```

---

#### List with Pagination

**Before:**
```typescript
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 10;
const offset = (page - 1) * limit;

const users = await User.findAll({ offset, limit });
const total = await User.count();

res.json({
  users,
  page,
  limit,
  total
});
```

**After:**
```typescript
// Parse pagination params
const { page, limit, offset } = parsePaginationParams(
  req.query.page as string,
  req.query.limit as string,
  10,   // default limit
  100   // max limit
);

// Fetch data
const users = await User.findAll({ offset, limit });
const total = await User.count();

// Calculate pagination metadata
const pagination = calculatePagination(total, page, limit);

// Send response
return sendSuccessWithPagination(res, users, pagination, "Users retrieved successfully");
```

## 💡 Usage Examples

### Example 1: User Login

```typescript
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendBadRequest(res, "Email and password are required");
  }

  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  const isValidPassword = await user.comparePassword(password);
  
  if (!isValidPassword) {
    return sendUnauthorized(res, "Invalid credentials");
  }

  const token = generateToken(user);

  return sendSuccess(res, { user, token }, "Login successful");
});
```

### Example 2: Create Post with Validation

```typescript
export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;

  // Validation
  const errors = [];
  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!content) errors.push({ field: "content", message: "Content is required" });

  if (errors.length > 0) {
    return sendValidationError(res, "Validation failed", errors);
  }

  // Create post
  const post = await Post.create({ title, content, userId: req.user.id });

  return sendCreated(res, post, "Post created successfully");
});
```

### Example 3: List Posts with Pagination

```typescript
export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  // Parse pagination parameters
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  // Fetch posts
  const { rows: posts, count: total } = await Post.findAndCountAll({
    offset,
    limit,
    order: [["createdAt", "DESC"]]
  });

  // Calculate pagination
  const pagination = calculatePagination(total, page, limit);

  return sendSuccessWithPagination(res, posts, pagination, "Posts retrieved successfully");
});
```

### Example 4: Update Post

```typescript
export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const post = await Post.findByPk(id);

  if (!post) {
    return sendNotFound(res, `Post with ID ${id} not found`, "post");
  }

  // Check ownership
  if (post.userId !== req.user.id) {
    return sendForbidden(res, "You don't have permission to update this post");
  }

  await post.update(updates);

  return sendSuccess(res, post, "Post updated successfully");
});
```

### Example 5: Delete Post

```typescript
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const post = await Post.findByPk(id);

  if (!post) {
    return sendNotFound(res, `Post with ID ${id} not found`, "post");
  }

  await post.destroy();

  return sendNoContent(res);
});
```

### Example 6: Check Duplicate

```typescript
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, username } = req.body;

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { username }]
    }
  });

  if (existingUser) {
    return sendConflict(res, "User with this email or username already exists", "user");
  }

  const user = await User.create(req.body);

  return sendCreated(res, user, "User registered successfully");
});
```

## 🎨 Best Practices

1. **Always return responses** - Use `return sendSuccess(...)` to prevent execution continuing
2. **Use specific error functions** - Use `sendNotFound`, `sendValidationError`, etc. instead of generic `sendError`
3. **Provide meaningful messages** - Help API consumers understand what happened
4. **Include error codes** - Makes it easier for frontend to handle specific errors
5. **Use pagination for lists** - Always paginate list endpoints to improve performance
6. **Validate max limits** - Prevent clients from requesting too many records at once

## 🔍 Testing Responses

You can now easily test your API responses have the correct structure:

```typescript
// Success response
expect(response.body).toHaveProperty("success", true);
expect(response.body).toHaveProperty("data");
expect(response.body).toHaveProperty("message");

// Pagination response
expect(response.body).toHaveProperty("pagination");
expect(response.body.pagination).toHaveProperty("page");
expect(response.body.pagination).toHaveProperty("limit");
expect(response.body.pagination).toHaveProperty("total");
expect(response.body.pagination).toHaveProperty("totalPages");

// Error response
expect(response.body).toHaveProperty("success", false);
expect(response.body).toHaveProperty("error");
expect(response.body.error).toHaveProperty("code");
expect(response.body.error).toHaveProperty("message");
```

## 📚 Additional Resources

- See `src/utils/apiResponse.examples.ts` for more examples
- Updated error handler: `src/middlewares/errorHandler.ts`
- Response utilities: `src/utils/apiResponse.ts`
