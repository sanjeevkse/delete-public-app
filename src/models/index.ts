import AuditLog from "./AuditLog";
import Event from "./Event";
import EventMedia from "./EventMedia";
import EventRegistration from "./EventRegistration";
import MetaPermission from "./MetaPermission";
import MetaPermissionGroup from "./MetaPermissionGroup";
import MetaUserRole from "./MetaUserRole";
import Post from "./Post";
import PostImage from "./PostImage";
import PostReaction from "./PostReaction";
import RolePermission from "./RolePermission";
import User from "./User";
import UserOtp from "./UserOtp";
import UserProfile from "./UserProfile";
import UserRole from "./UserRole";
import UserToken from "./UserToken";

const establishAssociations = (): void => {
  AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(AuditLog, { foreignKey: "userId", as: "auditLogs" });

  Event.hasMany(EventMedia, { foreignKey: "eventId", as: "media" });
  EventMedia.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  Event.hasMany(EventRegistration, { foreignKey: "eventId", as: "registrations" });
  EventRegistration.belongsTo(Event, { foreignKey: "eventId", as: "event" });
  EventRegistration.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(EventRegistration, { foreignKey: "userId", as: "eventRegistrations" });

  MetaUserRole.belongsToMany(MetaPermission, {
    through: RolePermission,
    foreignKey: "roleId",
    otherKey: "permissionId",
    as: "permissions"
  });
  MetaPermission.belongsToMany(MetaUserRole, {
    through: RolePermission,
    foreignKey: "permissionId",
    otherKey: "roleId",
    as: "roles"
  });
  MetaPermission.belongsTo(MetaPermissionGroup, {
    foreignKey: "permissionGroupId",
    as: "group"
  });
  MetaPermissionGroup.hasMany(MetaPermission, {
    foreignKey: "permissionGroupId",
    as: "permissions"
  });
  RolePermission.belongsTo(MetaUserRole, { foreignKey: "roleId", as: "role" });
  RolePermission.belongsTo(MetaPermission, { foreignKey: "permissionId", as: "permission" });

  Post.belongsTo(User, { foreignKey: "userId", as: "author" });
  User.hasMany(Post, { foreignKey: "userId", as: "posts" });

  Post.hasMany(PostImage, { foreignKey: "postId", as: "images" });
  PostImage.belongsTo(Post, { foreignKey: "postId", as: "post" });

  Post.hasMany(PostReaction, { foreignKey: "postId", as: "reactions" });
  PostReaction.belongsTo(Post, { foreignKey: "postId", as: "post" });
  PostReaction.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(PostReaction, { foreignKey: "userId", as: "postReactions" });

  User.hasOne(UserProfile, { foreignKey: "userId", as: "profile" });
  UserProfile.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(UserToken, { foreignKey: "userId", as: "tokens" });
  UserToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.belongsToMany(MetaUserRole, {
    through: UserRole,
    foreignKey: "userId",
    otherKey: "roleId",
    as: "roles"
  });
  MetaUserRole.belongsToMany(User, {
    through: UserRole,
    foreignKey: "roleId",
    otherKey: "userId",
    as: "users"
  });
  UserRole.belongsTo(User, { foreignKey: "userId", as: "user" });
  UserRole.belongsTo(MetaUserRole, { foreignKey: "roleId", as: "role" });
};

establishAssociations();

export {
  AuditLog,
  Event,
  EventMedia,
  EventRegistration,
  MetaPermission,
  MetaPermissionGroup,
  MetaUserRole,
  Post,
  PostImage,
  PostReaction,
  RolePermission,
  User,
  UserOtp,
  UserProfile,
  UserRole,
  UserToken
};
