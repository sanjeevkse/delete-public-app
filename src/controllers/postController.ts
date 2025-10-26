import type { Request, Response, Express } from "express";
import type { FindAttributeOptions, Transaction, WhereOptions } from "sequelize";
import { Op } from "sequelize";

import { ADMIN_ROLE_NAME } from "../config/rbac";
import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import Post from "../models/Post";
import PostImage from "../models/PostImage";
import PostReaction from "../models/PostReaction";
import { PostReactionType } from "../types/enums";
import asyncHandler from "../utils/asyncHandler";

type NormalizedImageInput = {
  imageUrl: string;
  caption: string | null;
};

const resolveTableName = (model: typeof PostReaction | typeof PostImage | typeof Post): string => {
  const raw = model.getTableName();
  return typeof raw === "string" ? raw : raw.tableName;
};

const POST_REACTION_TABLE = resolveTableName(PostReaction);

const buildReactionCountLiteral = (reaction: PostReactionType) =>
  sequelize.literal(`(
    SELECT COUNT(*)
    FROM ${POST_REACTION_TABLE} AS pr
    WHERE pr.post_id = Post.id
      AND pr.reaction = ${sequelize.escape(reaction)}
      AND pr.status = 1
  )`);

type LiteralValue = ReturnType<typeof sequelize.literal>;

const reactionCountAttributes: Array<[LiteralValue, string]> = [
  [buildReactionCountLiteral(PostReactionType.LIKE), "likesCount"],
  [buildReactionCountLiteral(PostReactionType.DISLIKE), "dislikesCount"]
] as const;

const attributesWithReactionCounts: FindAttributeOptions = {
  include: reactionCountAttributes
};

const basePostInclude = [
  {
    association: "images",
    attributes: ["id", "imageUrl", "caption", "createdAt"],
    where: { status: 1 },
    required: false
  },
  {
    association: "author",
    attributes: ["id", "fullName", "contactNumber", "email"]
  }
];

const isAdmin = (roles: string[]): boolean => {
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  return normalizedRoles.includes(ADMIN_ROLE_NAME.toLowerCase());
};

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? "1", 10);
  const limit = Number.parseInt((req.query.limit as string) ?? "20", 10);

  const safePage = Number.isNaN(page) || page <= 0 ? 1 : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? 20 : Math.min(limit, 100);

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

const normalizeTagsInput = (tagsInput: unknown): string | null => {
  if (tagsInput === undefined) {
    return null;
  }

  if (tagsInput === null) {
    return null;
  }

  if (Array.isArray(tagsInput)) {
    const normalized = tagsInput
      .map((value) => (typeof value === "string" ? value.trim() : String(value)))
      .filter((value) => value.length > 0);
    return normalized.length > 0 ? normalized.join(",") : null;
  }

  if (typeof tagsInput === "string") {
    const trimmed = tagsInput.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  throw new ApiError("tags must be a string or an array of strings", 400);
};

const parseRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new ApiError(`${field} is required`, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(`${field} cannot be empty`, 400);
  }
  return trimmed;
};

const parseRequiredNumber = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw new ApiError(`${field} must be a valid number`, 400);
  }
  return numberValue;
};

const parseOptionalNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return undefined;
  }
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw new ApiError(`${field} must be a valid number`, 400);
  }
  return numberValue;
};

const normalizeCaptionsInput = (captionsInput: unknown, count: number): Array<string | null> => {
  if (captionsInput === undefined || captionsInput === null) {
    return Array(count).fill(null);
  }

  let values: unknown[] = [];

  if (Array.isArray(captionsInput)) {
    values = captionsInput;
  } else if (typeof captionsInput === "string") {
    try {
      const parsed = JSON.parse(captionsInput);
      values = Array.isArray(parsed) ? parsed : [captionsInput];
    } catch {
      values = [captionsInput];
    }
  }

  return Array.from({ length: count }, (_, index) => {
    const raw = values[index];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
};

const parseLegacyImagesInput = (imagesInput: unknown): NormalizedImageInput[] | null => {
  if (imagesInput === undefined) {
    return null;
  }

  let arrayInput: unknown[];

  if (typeof imagesInput === "string") {
    try {
      const parsed = JSON.parse(imagesInput);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected array");
      }
      arrayInput = parsed;
    } catch {
      throw new ApiError("images must be a JSON array", 400);
    }
  } else if (Array.isArray(imagesInput)) {
    arrayInput = imagesInput;
  } else {
    throw new ApiError("images must be an array", 400);
  }

  const normalized = arrayInput
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { imageUrl, caption } = item as {
        imageUrl?: unknown;
        caption?: unknown;
      };

      if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
        return null;
      }

      return {
        imageUrl: imageUrl.trim(),
        caption: typeof caption === "string" && caption.trim().length > 0 ? caption.trim() : null
      };
    })
    .filter((value): value is NormalizedImageInput => value !== null);

  return normalized;
};

const normalizeImagesInput = (
  files: Express.Multer.File[] | undefined,
  imagesInput: unknown,
  captionsInput: unknown
): NormalizedImageInput[] | null => {
  const uploadedFiles = Array.isArray(files) ? files : [];

  if (uploadedFiles.length > 0) {
    const captions = normalizeCaptionsInput(captionsInput, uploadedFiles.length);
    return uploadedFiles.map((file, index) => ({
      imageUrl: buildPublicUploadPath(file.path),
      caption: captions[index] ?? null
    }));
  }

  return parseLegacyImagesInput(imagesInput);
};

const fetchPostById = async (id: number) => {
  return Post.findOne({
    where: { id, status: 1 },
    attributes: attributesWithReactionCounts,
    include: basePostInclude
  });
};

const computePaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  pages: Math.ceil(total / limit)
});

const buildListAttributes = (): FindAttributeOptions => attributesWithReactionCounts;

const getReactionCounts = async (postId: number) => {
  const [likes, dislikes] = await Promise.all([
    PostReaction.count({
      where: { postId, reaction: PostReactionType.LIKE, status: 1 }
    }),
    PostReaction.count({
      where: { postId, reaction: PostReactionType.DISLIKE, status: 1 }
    })
  ]);
  return {
    likesCount: likes,
    dislikesCount: dislikes
  };
};

export const createPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const description = parseRequiredString(req.body?.description, "description");
  const latitude = parseRequiredNumber(req.body?.latitude, "latitude");
  const longitude = parseRequiredNumber(req.body?.longitude, "longitude");
  const tags = normalizeTagsInput(req.body?.tags);
  const uploadedFiles = Array.isArray(req.files)
    ? (req.files as Express.Multer.File[])
    : undefined;
  const images = normalizeImagesInput(uploadedFiles, req.body?.images, req.body?.captions);

  const createdPostId = await sequelize.transaction(async (transaction) => {
    const post = await Post.create(
      {
        userId,
        description,
        tags,
        latitude,
        longitude,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    if (images && images.length > 0) {
      await PostImage.bulkCreate(
        images.map((image) => ({
          postId: post.id,
          imageUrl: image.imageUrl,
          caption: image.caption,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        })),
        { transaction }
      );
    }

    return post.id;
  });

  const createdPost = await fetchPostById(createdPostId);

  res.status(201).json(createdPost);
});

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid post id", 400);
  }

  const post = await fetchPostById(id);

  if (!post) {
    throw new ApiError("Post not found", 404);
  }

  res.json(post);
});

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req);

  const where: WhereOptions = {
    status: 1
  };

  const searchTerm = (req.query.search as string | undefined)?.trim();
  if (searchTerm) {
    where.description = { [Op.like]: `%${searchTerm}%` };
  }

  const tagsFilter = (req.query.tags as string | undefined)?.trim();
  if (tagsFilter) {
    where.tags = { [Op.like]: `%${tagsFilter}%` };
  }

  const latitudeFilter = parseOptionalNumber(req.query.latitude, "latitude");
  if (latitudeFilter !== undefined) {
    where.latitude = latitudeFilter;
  }

  const longitudeFilter = parseOptionalNumber(req.query.longitude, "longitude");
  if (longitudeFilter !== undefined) {
    where.longitude = longitudeFilter;
  }

  const { rows, count } = await Post.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    attributes: buildListAttributes(),
    include: basePostInclude,
    distinct: true
  });

  res.json({
    data: rows,
    meta: computePaginationMeta(count, page, limit)
  });
});

export const listMyPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { page, limit, offset } = parsePagination(req);

  const { rows, count } = await Post.findAndCountAll({
    where: {
      status: 1,
      userId
    },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    attributes: buildListAttributes(),
    include: basePostInclude,
    distinct: true
  });

  res.json({
    data: rows,
    meta: computePaginationMeta(count, page, limit)
  });
});

export const updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid post id", 400);
  }

  const post = await Post.findOne({ where: { id, status: 1 } });
  if (!post) {
    throw new ApiError("Post not found", 404);
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const updates: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    updates.description = parseRequiredString(req.body.description, "description");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "tags")) {
    updates.tags = normalizeTagsInput(req.body.tags);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "latitude")) {
    updates.latitude = parseRequiredNumber(req.body.latitude, "latitude");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "longitude")) {
    updates.longitude = parseRequiredNumber(req.body.longitude, "longitude");
  }

  updates.updatedBy = userId;

  await sequelize.transaction(async (transaction) => {
    await post.update(updates, { transaction });
  });

  const updated = await fetchPostById(post.id);
  res.json(updated);
});

export const deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid post id", 400);
  }

  const post = await Post.findOne({ where: { id, status: 1 } });
  if (!post) {
    throw new ApiError("Post not found", 404);
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  await sequelize.transaction(async (transaction) => {
    await post.update({ status: 0, updatedBy: userId }, { transaction });
    await PostImage.update(
      { status: 0, updatedBy: userId },
      { where: { postId: post.id }, transaction }
    );
    await PostReaction.update(
      { status: 0, updatedBy: userId },
      { where: { postId: post.id }, transaction }
    );
  });

  res.status(204).send();
});

export const addPostImages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const postId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    throw new ApiError("Invalid post id", 400);
  }

  const post = await Post.findOne({ where: { id: postId, status: 1 } });
  if (!post) {
    throw new ApiError("Post not found", 404);
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const images = normalizeImagesInput(uploadedFiles, req.body?.images, req.body?.captions);

  if (!images || images.length === 0) {
    throw new ApiError("At least one image is required", 400);
  }

  await sequelize.transaction(async (transaction) => {
    await PostImage.bulkCreate(
      images.map((image) => ({
        postId: post.id,
        imageUrl: image.imageUrl,
        caption: image.caption,
        status: 1,
        createdBy: post.createdBy ?? userId,
        updatedBy: userId
      })),
      { transaction }
    );
  });

  const updated = await fetchPostById(post.id);
  res.status(201).json(updated);
});

export const removePostImages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const postId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    throw new ApiError("Invalid post id", 400);
  }

  const post = await Post.findOne({ where: { id: postId, status: 1 } });
  if (!post) {
    throw new ApiError("Post not found", 404);
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const imageIdsInput = req.body?.imageIds ?? req.body?.ids;
  if (!Array.isArray(imageIdsInput) || imageIdsInput.length === 0) {
    throw new ApiError("imageIds must be a non-empty array", 400);
  }

  const imageIds = imageIdsInput
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (imageIds.length === 0) {
    throw new ApiError("imageIds must contain valid numeric identifiers", 400);
  }

  await sequelize.transaction(async (transaction) => {
    await PostImage.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          id: { [Op.in]: imageIds },
          postId: post.id,
          status: 1
        },
        transaction
      }
    );
  });

  const updated = await fetchPostById(post.id);
  res.json(updated);
});

export const reactToPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid post id", 400);
  }

  const reactionInput = req.body?.reaction;
  if (typeof reactionInput !== "string") {
    throw new ApiError("reaction is required", 400);
  }

  const normalizedReaction = reactionInput.toUpperCase() as PostReactionType;
  if (
    normalizedReaction !== PostReactionType.LIKE &&
    normalizedReaction !== PostReactionType.DISLIKE
  ) {
    throw new ApiError("reaction must be LIKE or DISLIKE", 400);
  }

  await sequelize.transaction(async (transaction: Transaction) => {
    const post = await Post.findOne({
      where: { id, status: 1 },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const reactions = await PostReaction.findAll({
      where: { postId: id, userId },
      order: [["createdAt", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const [primaryReaction, ...duplicates] = reactions;

    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map((duplicate) => duplicate.id);
      await PostReaction.update(
        { status: 0, updatedBy: userId },
        {
          where: { id: duplicateIds },
          transaction
        }
      );
    }

    if (primaryReaction) {
      const updatePayload: Record<string, unknown> = {
        reaction: normalizedReaction,
        status: 1,
        updatedBy: userId
      };

      if (primaryReaction.createdBy === null) {
        updatePayload.createdBy = userId;
      }

      await primaryReaction.update(updatePayload, { transaction });
    } else {
      await PostReaction.create(
        {
          postId: id,
          userId,
          reaction: normalizedReaction,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );
    }
  });

  const counts = await getReactionCounts(id);

  res.json({
    message: "Reaction recorded",
    reaction: normalizedReaction,
    counts
  });
});
