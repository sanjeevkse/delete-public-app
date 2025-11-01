import type { Request, Response, Express } from "express";
import type { FindAttributeOptions, ProjectionAlias, Transaction, WhereOptions } from "sequelize";
import { Op } from "sequelize";

import { ADMIN_ROLE_NAME } from "../config/rbac";
import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import { MAX_POST_IMAGE_COUNT, MAX_POST_VIDEO_COUNT } from "../middlewares/postUploadMiddleware";
import Post from "../models/Post";
import PostMedia from "../models/PostMedia";
import PostReaction from "../models/PostReaction";
import { MediaType, PostReactionType, PostUserReactionStatus } from "../types/enums";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";

type NormalizedPostMediaInput = {
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  durationSecond: number | null;
  positionNumber: number;
  caption: string | null;
};

const resolveTableName = (model: typeof PostReaction | typeof PostMedia | typeof Post): string => {
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

const buildCurrentUserReactionLiteral = (userId: number): LiteralValue =>
  sequelize.literal(`(
    SELECT pr.reaction
    FROM ${POST_REACTION_TABLE} AS pr
    WHERE pr.post_id = Post.id
      AND pr.user_id = ${sequelize.escape(userId)}
      AND pr.status = 1
    ORDER BY pr.updated_at DESC
    LIMIT 1
  )`);

const buildPostAttributes = (
  currentUserId?: number,
  includeAuditFields?: boolean,
  keepFields?: string[]
): FindAttributeOptions => {
  const baseAttrs = buildQueryAttributes({ includeAuditFields, keepFields });

  if (typeof currentUserId !== "number") {
    if (!baseAttrs) {
      return attributesWithReactionCounts;
    }
    // Merge base attributes with reaction counts
    const baseInclude = Array.isArray(baseAttrs) ? baseAttrs : (baseAttrs as any)?.include || [];
    return {
      ...(typeof baseAttrs === "object" && !Array.isArray(baseAttrs) ? baseAttrs : {}),
      include: [...baseInclude, ...reactionCountAttributes]
    };
  }

  const extraFields: Array<string | ProjectionAlias> = [
    ...reactionCountAttributes,
    [buildCurrentUserReactionLiteral(currentUserId), "currentUserReaction"]
  ];

  if (!baseAttrs) {
    return { include: extraFields };
  }

  // Merge base attributes with reaction counts and current user reaction
  const baseInclude = Array.isArray(baseAttrs) ? baseAttrs : (baseAttrs as any)?.include || [];
  return {
    ...(typeof baseAttrs === "object" && !Array.isArray(baseAttrs) ? baseAttrs : {}),
    include: [...baseInclude, ...extraFields]
  };
};

const formatPostForResponse = (post: Post, currentUserId?: number) => {
  const plainPost = post.get({ plain: true }) as Record<string, unknown>;

  if (typeof currentUserId === "number") {
    const rawReaction = plainPost.currentUserReaction as string | null | undefined;
    let status = PostUserReactionStatus.NO_REACTION;

    if (rawReaction === PostReactionType.LIKE) {
      status = PostUserReactionStatus.LIKE;
    } else if (rawReaction === PostReactionType.DISLIKE) {
      status = PostUserReactionStatus.DISLIKE;
    }

    plainPost.currentUserPostReaction = status;
  }

  if ("currentUserReaction" in plainPost) {
    delete (plainPost as { currentUserReaction?: unknown }).currentUserReaction;
  }

  return plainPost;
};

const authorAttributes: Array<string | ProjectionAlias> = [
  "id",
  "fullName",
  "contactNumber",
  "email",
  [sequelize.literal("`author->profile`.`profile_image_url`"), "profilePhoto"] as ProjectionAlias
];

const basePostInclude = [
  {
    association: "media",
    attributes: [
      "id",
      "mediaType",
      "mediaUrl",
      "thumbnailUrl",
      "mimeType",
      "durationSecond",
      "positionNumber",
      "caption",
      "createdAt"
    ],
    where: { status: 1 },
    required: false
  },
  {
    association: "author",
    attributes: authorAttributes,
    include: [
      {
        association: "profile",
        attributes: [],
        required: false
      }
    ],
    required: false
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

const parseSortDirection = (
  value: unknown,
  defaultDirection: "ASC" | "DESC" = "DESC"
): "ASC" | "DESC" => {
  if (typeof value !== "string") {
    return defaultDirection;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === "ASC" || normalized === "DESC") {
    return normalized;
  }
  return defaultDirection;
};

const parseLegacyMediaInput = (mediaInput: unknown): NormalizedPostMediaInput[] | null => {
  if (mediaInput === undefined || mediaInput === null) {
    return null;
  }

  let arrayInput: unknown[];

  if (typeof mediaInput === "string") {
    try {
      const parsed = JSON.parse(mediaInput);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected array");
      }
      arrayInput = parsed;
    } catch {
      throw new ApiError("media must be a JSON array", 400);
    }
  } else if (Array.isArray(mediaInput)) {
    arrayInput = mediaInput;
  } else {
    throw new ApiError("media must be an array", 400);
  }

  const normalized = arrayInput
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const {
        mediaType,
        mediaUrl,
        imageUrl,
        thumbnailUrl,
        mimeType,
        durationSecond,
        positionNumber,
        caption
      } = item as Record<string, unknown>;

      const resolvedUrl =
        typeof mediaUrl === "string" && mediaUrl.trim().length > 0
          ? mediaUrl.trim()
          : typeof imageUrl === "string" && imageUrl.trim().length > 0
            ? imageUrl.trim()
            : null;

      if (!resolvedUrl) {
        return null;
      }

      const normalizedType =
        typeof mediaType === "string" && mediaType.trim().length > 0
          ? (mediaType.trim().toUpperCase() as MediaType)
          : MediaType.PHOTO;

      const safeType =
        normalizedType === MediaType.PHOTO || normalizedType === MediaType.VIDEO
          ? normalizedType
          : MediaType.PHOTO;

      const normalizedThumbnail =
        typeof thumbnailUrl === "string" && thumbnailUrl.trim().length > 0
          ? thumbnailUrl.trim()
          : null;

      const normalizedMime =
        typeof mimeType === "string" && mimeType.trim().length > 0 ? mimeType.trim() : null;

      const normalizedDuration = parseOptionalNumber(durationSecond, "durationSecond") ?? null;
      const normalizedPosition = parseOptionalNumber(positionNumber, "positionNumber") ?? index + 1;

      const normalizedCaption =
        typeof caption === "string" && caption.trim().length > 0 ? caption.trim() : null;

      return {
        mediaType: safeType,
        mediaUrl: resolvedUrl,
        thumbnailUrl: normalizedThumbnail,
        mimeType: normalizedMime,
        durationSecond: normalizedDuration,
        positionNumber: normalizedPosition,
        caption: normalizedCaption
      } as NormalizedPostMediaInput;
    })
    .filter((value): value is NormalizedPostMediaInput => value !== null);

  return normalized;
};

const normalizePostMediaInput = (
  files: Express.Multer.File[] | undefined,
  mediaInput: unknown
): NormalizedPostMediaInput[] | null => {
  const uploadedFiles = Array.isArray(files) ? files : [];

  if (uploadedFiles.length > 0) {
    return uploadedFiles.map((file, index) => {
      const isPhoto = file.mimetype.startsWith("image/");
      const mediaType = isPhoto ? MediaType.PHOTO : MediaType.VIDEO;
      return {
        mediaType,
        mediaUrl: buildPublicUploadPath(file.path),
        thumbnailUrl: null,
        mimeType: file.mimetype,
        durationSecond: null,
        positionNumber: index + 1,
        caption: null
      } as NormalizedPostMediaInput;
    });
  }

  return parseLegacyMediaInput(mediaInput);
};

const fetchPostById = async (id: number, currentUserId?: number, includeAuditFields?: boolean) => {
  const post = await Post.findOne({
    where: { id, status: 1 },
    attributes: buildPostAttributes(currentUserId, includeAuditFields),
    include: basePostInclude
  });

  if (!post) {
    return null;
  }

  return formatPostForResponse(post, currentUserId);
};

const computePaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  pages: Math.ceil(total / limit)
});

const buildListAttributes = (
  currentUserId?: number,
  includeAuditFields?: boolean,
  keepFields?: string[]
): FindAttributeOptions => buildPostAttributes(currentUserId, includeAuditFields, keepFields);

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
  const locationText = req.body?.locationText || req.body?.location_text || null;
  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const media = normalizePostMediaInput(uploadedFiles, req.body?.media ?? req.body?.images);

  const createdPostId = await sequelize.transaction(async (transaction) => {
    const post = await Post.create(
      {
        userId,
        description,
        tags,
        latitude,
        longitude,
        locationText,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    if (media && media.length > 0) {
      await PostMedia.bulkCreate(
        media.map((item) => ({
          postId: post.id,
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          mimeType: item.mimeType,
          durationSecond: item.durationSecond,
          positionNumber: item.positionNumber,
          caption: item.caption,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        })),
        { transaction }
      );
    }

    return post.id;
  });

  const createdPost = await fetchPostById(createdPostId, userId);

  return sendCreated(res, createdPost, "Post created successfully");
});

export const getPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid post id");
  }

  const post = await fetchPostById(id, userId, includeAuditFields);

  if (!post) {
    return sendNotFound(res, "Post not found", "post");
  }

  return sendSuccess(res, post, "Post retrieved successfully");
});

export const listPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { page, limit, offset } = parsePagination(req);
  const sortDirection = parseSortDirection(req.query.sort);
  const includeAuditFields = shouldIncludeAuditFields(req.query);

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
    order: [["createdAt", sortDirection]],
    attributes: buildListAttributes(userId, includeAuditFields, ["createdAt"]),
    include: basePostInclude,
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);

  const posts = rows
    .map((post) => formatPostForResponse(post, userId))
    .map((post) => {
      const w = 400; //  + Math.floor(Math.random() * 200);
      const h = 300; //  + Math.floor(Math.random() * 200);
      const medias = (post.media as any)?.map((media: any) => ({
        ...media,
        mediaUrl: `https://picsum.photos/seed/${post.id}-${Math.random()
          .toString(36)
          .substring(2, 8)}/${w}/${h}`
      }));
      return { ...post, media: medias };
    });

  return sendSuccessWithPagination(res, posts, pagination, "Posts retrieved successfully");
});

export const listMyPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { page, limit, offset } = parsePagination(req);
  const sortDirection = parseSortDirection(req.query.sort);
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const { rows, count } = await Post.findAndCountAll({
    where: {
      status: 1,
      userId
    },
    limit,
    offset,
    order: [["createdAt", sortDirection]],
    attributes: buildListAttributes(userId, includeAuditFields, ["createdAt"]),
    include: basePostInclude,
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);

  const posts = rows.map((post) => formatPostForResponse(post, userId));

  return sendSuccessWithPagination(res, posts, pagination, "Your posts retrieved successfully");
});

export const updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid post id");
  }

  const post = await Post.findOne({ where: { id, status: 1 } });
  if (!post) {
    return sendNotFound(res, "Post not found", "post");
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    return sendForbidden(res, "You don't have permission to update this post");
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

  if (
    Object.prototype.hasOwnProperty.call(req.body, "locationText") ||
    Object.prototype.hasOwnProperty.call(req.body, "location_text")
  ) {
    updates.locationText = req.body.locationText || req.body.location_text || null;
  }

  updates.updatedBy = userId;

  await sequelize.transaction(async (transaction) => {
    await post.update(updates, { transaction });
  });

  const updated = await fetchPostById(post.id, userId);
  return sendSuccess(res, updated, "Post updated successfully");
});

export const deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid post id");
  }

  const post = await Post.findOne({ where: { id, status: 1 } });
  if (!post) {
    return sendNotFound(res, "Post not found", "post");
  }

  if (post.userId !== userId && !isAdmin(roles)) {
    return sendForbidden(res, "You don't have permission to delete this post");
  }

  await sequelize.transaction(async (transaction) => {
    await post.update({ status: 0, updatedBy: userId }, { transaction });
    await PostMedia.update(
      { status: 0, updatedBy: userId },
      { where: { postId: post.id }, transaction }
    );
    await PostReaction.update(
      { status: 0, updatedBy: userId },
      { where: { postId: post.id }, transaction }
    );
  });

  return sendNoContent(res);
});

export const addPostMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  const media = normalizePostMediaInput(uploadedFiles, req.body?.media ?? req.body?.images);

  if (!media || media.length === 0) {
    throw new ApiError("At least one media file is required", 400);
  }

  const [existingImageCount, existingVideoCount, existingMaxPositionRaw] = await Promise.all([
    PostMedia.count({
      where: { postId, status: 1, mediaType: MediaType.PHOTO }
    }),
    PostMedia.count({
      where: { postId, status: 1, mediaType: MediaType.VIDEO }
    }),
    PostMedia.max("positionNumber", {
      where: { postId, status: 1 }
    }) as Promise<number | null>
  ]);

  const newImageCount = media.filter((item) => item.mediaType === MediaType.PHOTO).length;
  const newVideoCount = media.filter((item) => item.mediaType === MediaType.VIDEO).length;

  if (existingImageCount + newImageCount > MAX_POST_IMAGE_COUNT) {
    throw new ApiError(`A post can include at most ${MAX_POST_IMAGE_COUNT} images`, 400);
  }

  if (existingVideoCount + newVideoCount > MAX_POST_VIDEO_COUNT) {
    throw new ApiError(`A post can include at most ${MAX_POST_VIDEO_COUNT} video`, 400);
  }

  const startingPosition = Number.isFinite(existingMaxPositionRaw ?? NaN)
    ? (existingMaxPositionRaw as number)
    : 0;

  await sequelize.transaction(async (transaction) => {
    await PostMedia.bulkCreate(
      media.map((item, index) => ({
        postId: post.id,
        mediaType: item.mediaType,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        mimeType: item.mimeType,
        durationSecond: item.durationSecond,
        positionNumber: startingPosition + index + 1,
        caption: item.caption,
        status: 1,
        createdBy: post.createdBy ?? userId,
        updatedBy: userId
      })),
      { transaction }
    );
  });

  const updated = await fetchPostById(post.id, userId);
  return sendCreated(res, updated, "Media added to post successfully");
});

export const removePostMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  const mediaIdsInput = req.body?.mediaIds ?? req.body?.ids ?? req.body?.imageIds;
  if (!Array.isArray(mediaIdsInput) || mediaIdsInput.length === 0) {
    throw new ApiError("mediaIds must be a non-empty array", 400);
  }

  const mediaIds = mediaIdsInput
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (mediaIds.length === 0) {
    throw new ApiError("mediaIds must contain valid numeric identifiers", 400);
  }

  await sequelize.transaction(async (transaction) => {
    await PostMedia.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          id: { [Op.in]: mediaIds },
          postId: post.id,
          status: 1
        },
        transaction
      }
    );
  });

  const updated = await fetchPostById(post.id, userId);
  return sendSuccess(res, updated, "Media removed from post successfully");
});

export const reactToPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid post id");
  }

  const reactionInput = req.body?.reaction;
  if (typeof reactionInput !== "string") {
    return sendBadRequest(res, "reaction is required");
  }

  const normalizedReaction = reactionInput.toUpperCase();
  const isNoReaction = normalizedReaction === PostUserReactionStatus.NO_REACTION;

  if (
    !isNoReaction &&
    normalizedReaction !== PostReactionType.LIKE &&
    normalizedReaction !== PostReactionType.DISLIKE
  ) {
    return sendBadRequest(res, "reaction must be LIKE, DISLIKE, or NO_REACTION");
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

    if (isNoReaction) {
      if (primaryReaction && primaryReaction.status === 1) {
        await primaryReaction.update(
          {
            status: 0,
            updatedBy: userId
          },
          { transaction }
        );
      }
    } else if (primaryReaction) {
      const updatePayload: Record<string, unknown> = {
        reaction: normalizedReaction as PostReactionType,
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
          reaction: normalizedReaction as PostReactionType,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );
    }
  });

  const counts = await getReactionCounts(id);

  return sendSuccess(
    res,
    {
      reaction: isNoReaction ? null : normalizedReaction,
      counts
    },
    isNoReaction ? "Reaction removed" : "Reaction recorded"
  );
});
