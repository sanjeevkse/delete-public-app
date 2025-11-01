# Quick Start: Applying Audit Fields Exclusion to Controllers

## Simple Controller Example

Here's a before/after example for a typical controller:

### Before

```typescript
import type { Request, Response } from "express";
import { Op } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";
import Member from "../models/Member";

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );

  const { rows, count } = await Member.findAndCountAll({
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Members retrieved successfully");
});

export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findByPk(req.params.id);

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  return sendSuccess(res, member, "Member retrieved successfully");
});
```

### After

```typescript
import type { Request, Response } from "express";
import { Op } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import Member from "../models/Member";

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const { rows, count } = await Member.findAndCountAll({
    attributes: buildQueryAttributes({ includeAuditFields }),
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Members retrieved successfully");
});

export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const member = await Member.findByPk(req.params.id, {
    attributes: buildQueryAttributes({ includeAuditFields })
  });

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  return sendSuccess(res, member, "Member retrieved successfully");
});
```

## What Changed?

Only **3 changes** needed per controller:

### 1. Add Import

```typescript
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
```

### 2. Extract Flag from Query

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);
```

### 3. Apply to Query

```typescript
const result = await Model.findAll({
  attributes: buildQueryAttributes({ includeAuditFields })
  // ... other options
});
```

## Controller with Includes/Relations

If your controller already has custom attributes, you can merge them:

### Before

```typescript
const { rows, count } = await Community.findAndCountAll({
  include: [
    {
      model: MetaCommunityType,
      as: "communityType",
      attributes: ["id", "dispName", "description"]
    }
  ],
  limit,
  offset
});
```

### After

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);

const { rows, count } = await Community.findAndCountAll({
  attributes: buildQueryAttributes({ includeAuditFields }),
  include: [
    {
      model: MetaCommunityType,
      as: "communityType",
      attributes: ["id", "dispName", "description"]
    }
  ],
  limit,
  offset
});
```

## Controller with Custom Computed Fields

For controllers with complex attribute building (like postController):

```typescript
const buildCustomAttributes = (userId?: number, includeAuditFields?: boolean) => {
  const baseAttrs = buildQueryAttributes({ includeAuditFields });

  const customFields = [[sequelize.fn("COUNT", sequelize.col("reactions.id")), "reactionCount"]];

  if (!baseAttrs) {
    return { include: customFields };
  }

  const baseInclude = Array.isArray(baseAttrs) ? baseAttrs : (baseAttrs as any)?.include || [];
  return {
    ...(typeof baseAttrs === "object" && !Array.isArray(baseAttrs) ? baseAttrs : {}),
    include: [...baseInclude, ...customFields]
  };
};

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const { rows, count } = await Model.findAndCountAll({
    attributes: buildCustomAttributes(userId, includeAuditFields)
    // ... other options
  });
});
```

## Testing Your Changes

After implementing:

```bash
# Test default behavior (should exclude audit fields)
curl http://localhost:3000/api/your-endpoint

# Test with audit fields included
curl "http://localhost:3000/api/your-endpoint?includeAuditFields=true"
```

**Verify:**

- Without param: No `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `status` in response
- With param: All audit fields present in response

## Common Patterns

### Pattern 1: Simple List

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);
const items = await Model.findAll({
  attributes: buildQueryAttributes({ includeAuditFields })
});
```

### Pattern 2: Get by ID

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);
const item = await Model.findByPk(id, {
  attributes: buildQueryAttributes({ includeAuditFields })
});
```

### Pattern 3: With Where Clause

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);
const items = await Model.findAll({
  where: { active: true },
  attributes: buildQueryAttributes({ includeAuditFields })
});
```

### Pattern 4: With Relations

```typescript
const includeAuditFields = shouldIncludeAuditFields(req.query);
const items = await Model.findAll({
  attributes: buildQueryAttributes({ includeAuditFields }),
  include: [{ model: RelatedModel, as: "relation" }]
});
```

## Checklist

- [ ] Added import statement
- [ ] Extracted `includeAuditFields` flag
- [ ] Applied to all `findAll`, `findOne`, `findByPk`, `findAndCountAll` calls
- [ ] Tested without query param (audit fields excluded)
- [ ] Tested with `?includeAuditFields=true` (audit fields included)
- [ ] Updated endpoint documentation if applicable

## Need Help?

Refer to these files for complete examples:

- Simple: `src/controllers/businessController.ts`
- Complex: `src/controllers/postController.ts`
- With relations: `src/controllers/userController.ts`
- With computed: `src/controllers/eventController.ts`
