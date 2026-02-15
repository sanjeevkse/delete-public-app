import type { Response } from "express";
import { Op } from "sequelize";

import sequelize from "../config/database";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import Post from "../models/Post";
import PostMedia from "../models/PostMedia";
import PostReaction from "../models/PostReaction";
import UserProfile from "../models/UserProfile";
import { MediaType, PostReactionType } from "../types/enums";
import asyncHandler from "../utils/asyncHandler";
import { sendForbidden, sendSuccess } from "../utils/apiResponse";
import { getUserAccessList } from "../services/userAccessibilityService";

const pickQueryValue = (
  query: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
  }
  return undefined;
};

const parsePositiveInt = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return Math.trunc(num);
};

const parseWardBoothFilter = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  const normalized = Math.trunc(num);
  if (normalized === -1) return -1;
  if (normalized <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return normalized;
};

const formatDateKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const buildLastNDates = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    dates.push(formatDateKey(d));
  }
  return dates;
};

const hasGlobalAccess = (userAccessList: any[]): boolean => {
  if (userAccessList.length === 0) return true;
  return userAccessList.some(
    (access) => access.wardNumberId === -1 && access.boothNumberId === -1
  );
};

const canAccessRequested = (
  userAccessList: any[],
  wardNumberId?: number,
  boothNumberId?: number
): boolean => {
  if (userAccessList.length === 0) return true;

  return userAccessList.some((access) => {
    const wardOk =
      wardNumberId === undefined ||
      access.wardNumberId === -1 ||
      access.wardNumberId === wardNumberId;
    const boothOk =
      boothNumberId === undefined ||
      access.boothNumberId === -1 ||
      access.boothNumberId === boothNumberId;
    return wardOk && boothOk;
  });
};

const buildProfileWhereFromAccess = (userAccessList: any[]): Record<string, any> | null => {
  if (userAccessList.length === 0) {
    return null;
  }

  const conditions: Array<Record<string, any>> = [];

  for (const access of userAccessList) {
    const ward = access.wardNumberId ?? null;
    const booth = access.boothNumberId ?? null;

    if (ward === -1 && booth === -1) {
      return null;
    }

    if (ward !== null && ward !== -1 && (booth === null || booth === -1)) {
      conditions.push({ wardNumberId: ward });
      continue;
    }

    if (ward !== null && ward !== -1 && booth !== null && booth !== -1) {
      conditions.push({ wardNumberId: ward, boothNumberId: booth });
      continue;
    }

    if ((ward === null || ward === -1) && booth !== null && booth !== -1) {
      conditions.push({ boothNumberId: booth });
    }
  }

  if (conditions.length === 0) {
    return { id: { [Op.in]: [] } };
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { [Op.or]: conditions };
};

const buildAuthorProfileInclude = (profileWhere?: Record<string, any>) => {
  if (!profileWhere) return undefined;
  return [
    {
      association: "author",
      attributes: [],
      required: true,
      include: [
        {
          association: "profile",
          attributes: [],
          required: true,
          where: profileWhere
        }
      ]
    }
  ];
};

const buildPostIncludeForMedia = (profileWhere?: Record<string, any>) => {
  const include: any = [
    {
      association: "post",
      attributes: [],
      required: true,
      where: { status: 1 }
    }
  ];

  if (profileWhere) {
    include[0].include = [
      {
        association: "author",
        attributes: [],
        required: true,
        include: [
          {
            association: "profile",
            attributes: [],
            required: true,
            where: profileWhere
          }
        ]
      }
    ];
  }

  return include;
};

const buildPostIncludeForReactions = buildPostIncludeForMedia;

/**
 * Get posts report with statistics, graphs, and reactions breakdown
 * GET /reports/posts
 */
export const getPostsReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const queryParams = (req.query || {}) as Record<string, unknown>;

  const wardRaw = pickQueryValue(queryParams, ["wardNumberId", "ward_number_id"]);
  const boothRaw = pickQueryValue(queryParams, ["boothNumberId", "booth_number_id"]);
  const daysRaw = pickQueryValue(queryParams, ["days"]);

  const wardNumberId = parseWardBoothFilter(wardRaw, "wardNumberId");
  const boothNumberId = parseWardBoothFilter(boothRaw, "boothNumberId");
  const days = parsePositiveInt(daysRaw, "days") ?? 7;

  const requestedWard = wardNumberId !== undefined && wardNumberId !== -1 ? wardNumberId : undefined;
  const requestedBooth =
    boothNumberId !== undefined && boothNumberId !== -1 ? boothNumberId : undefined;

  const userAccessList = await getUserAccessList(userId);
  const canAccessAll = hasGlobalAccess(userAccessList);

  if ((requestedWard !== undefined || requestedBooth !== undefined) && !canAccessAll) {
    const allowed = canAccessRequested(userAccessList, requestedWard, requestedBooth);
    if (!allowed) {
      return sendForbidden(res, "You don't have access to the requested ward/booth");
    }
  }

  let profileWhere: Record<string, any> | null = null;
  if (requestedWard !== undefined || requestedBooth !== undefined) {
    profileWhere = {
      ...(requestedWard !== undefined ? { wardNumberId: requestedWard } : {}),
      ...(requestedBooth !== undefined ? { boothNumberId: requestedBooth } : {})
    };
  } else if (!canAccessAll) {
    profileWhere = buildProfileWhereFromAccess(userAccessList);
  }

  const authorProfileInclude = buildAuthorProfileInclude(profileWhere ?? undefined);
  const postIncludeForMedia = buildPostIncludeForMedia(profileWhere ?? undefined);
  const postIncludeForReactions = buildPostIncludeForReactions(profileWhere ?? undefined);

  const buildReactionUserInclude = (profileFilter?: Record<string, any>) => {
    if (!profileFilter) return undefined;
    return [
      {
        association: "user",
        attributes: [],
        required: true,
        include: [
          {
            association: "profile",
            attributes: [],
            required: true,
            where: profileFilter
          }
        ]
      }
    ];
  };

  const reactionUserInclude = buildReactionUserInclude(profileWhere ?? undefined);
  const reactionIncludes =
    reactionUserInclude && reactionUserInclude.length > 0
      ? [...postIncludeForReactions, ...reactionUserInclude]
      : postIncludeForReactions;

  const today = new Date();
  const todayRange = { [Op.between]: [startOfDay(today), endOfDay(today)] };
  const rangeStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  const rangeEnd = endOfDay(today);

  const postWhereBase = { status: 1 };
  const deletedPostWhereBase = { status: 0 };

  const postCountOptions: any = {
    where: postWhereBase
  };
  const deletedPostCountOptions: any = {
    where: deletedPostWhereBase
  };

  if (authorProfileInclude) {
    postCountOptions.include = authorProfileInclude;
    deletedPostCountOptions.include = authorProfileInclude;
  }

  const postsLastDaysOptions: any = {
    attributes: [
      [sequelize.fn("DATE", sequelize.col("Post.created_at")), "date"],
      [sequelize.fn("COUNT", sequelize.col("Post.id")), "count"]
    ],
    where: {
      status: 1,
      createdAt: { [Op.between]: [rangeStart, rangeEnd] }
    },
    group: [sequelize.fn("DATE", sequelize.col("Post.created_at"))],
    raw: true
  };

  if (authorProfileInclude) {
    postsLastDaysOptions.include = authorProfileInclude;
  }

  const [
    totalPosts,
    deletedPosts,
    todayPosts,
    photos,
    videos,
    blockedUsers,
    postsLastDaysRaw,
    totalPeople,
    reactionUserStats
  ] = await Promise.all([
    Post.count(postCountOptions),
    Post.count(deletedPostCountOptions),
    Post.count({
      ...postCountOptions,
      where: { ...postWhereBase, createdAt: todayRange }
    }),
    PostMedia.count({
      where: { status: 1, mediaType: MediaType.PHOTO },
      include: postIncludeForMedia
    }),
    PostMedia.count({
      where: { status: 1, mediaType: MediaType.VIDEO },
      include: postIncludeForMedia
    }),
    UserProfile.count({
      where: {
        postsBlocked: true,
        status: 1,
        ...(profileWhere ?? {})
      }
    }),
    Post.findAll(postsLastDaysOptions),
    UserProfile.count({
      where: {
        status: 1,
        ...(profileWhere ?? {})
      }
    }),
    PostReaction.findAll({
      attributes: [
        "userId",
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              `CASE WHEN PostReaction.reaction = ${sequelize.escape(
                PostReactionType.LIKE
              )} THEN 1 ELSE 0 END`
            )
          ),
          "hasLike"
        ],
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              `CASE WHEN PostReaction.reaction = ${sequelize.escape(
                PostReactionType.DISLIKE
              )} THEN 1 ELSE 0 END`
            )
          ),
          "hasDislike"
        ]
      ],
      where: { status: 1 },
      include: reactionIncludes,
      group: ["PostReaction.user_id"],
      raw: true
    })
  ]);

  const safeTotalPosts = Number(totalPosts) || 0;
  const safeTotalPeople = Number(totalPeople) || 0;
  let likeUsers = 0;
  let dislikeOnlyUsers = 0;

  for (const row of reactionUserStats as Array<any>) {
    const hasLike = Number(row.hasLike) === 1;
    const hasDislike = Number(row.hasDislike) === 1;
    if (hasLike) {
      likeUsers += 1;
    } else if (hasDislike) {
      dislikeOnlyUsers += 1;
    }
  }

  const neutral = Math.max(safeTotalPeople - (likeUsers + dislikeOnlyUsers), 0);

  const dateKeys = buildLastNDates(days);
  const countsByDate = new Map<string, number>();
  for (const row of postsLastDaysRaw as Array<any>) {
    const dateValue = row.date ? String(row.date) : "";
    const dateKey = dateValue.length >= 10 ? dateValue.slice(0, 10) : dateValue;
    const countValue = Number(row.count) || 0;
    if (dateKey) {
      countsByDate.set(dateKey, countValue);
    }
  }

  const postsLastDays = dateKeys.map((date) => ({
    date,
    count: countsByDate.get(date) ?? 0
  }));

  const totalReactions = safeTotalPeople;
  const percentage = (value: number): number => {
    if (totalReactions <= 0) return 0;
    return Math.round((value / totalReactions) * 100);
  };

  const reportData = {
    filters: {
      wardNumberId: requestedWard ?? null,
      boothNumberId: requestedBooth ?? null,
      days
    },
    stats: {
      totalPosts: safeTotalPosts,
      deletedPosts: Number(deletedPosts) || 0,
      blockedUsers: Number(blockedUsers) || 0,
      photos: Number(photos) || 0,
      videos: Number(videos) || 0,
      todayPosts: Number(todayPosts) || 0
    },
    postsLastDays,
    reactions: {
      likes: likeUsers,
      dislikes: dislikeOnlyUsers,
      neutral,
      totalPeople: safeTotalPeople,
      percentages: {
        likes: percentage(likeUsers),
        dislikes: percentage(dislikeOnlyUsers),
        neutral: percentage(neutral)
      }
    }
  };

  return sendSuccess(res, reportData, "Post report retrieved successfully");
});
