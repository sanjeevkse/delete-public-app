import AuditLog from "./AuditLog";
import Business from "./Business";
import Community from "./Community";
import Event from "./Event";
import EventMedia from "./EventMedia";
import EventRegistration from "./EventRegistration";
import FamilyMember from "./FamilyMember";
import GeoPolitical from "./GeoPolitical";
import Member from "./Member";
import MetaBusinessType from "./MetaBusinessType";
import MetaBoothNumber from "./MetaBoothNumber";
import MetaCommunityType from "./MetaCommunityType";
import MetaMlaConstituency from "./MetaMlaConstituency";
import MetaPermission from "./MetaPermission";
import MetaPermissionGroup from "./MetaPermissionGroup";
import MetaRelationType from "./MetaRelationType";
import MetaUserRole from "./MetaUserRole";
import MetaWardNumber from "./MetaWardNumber";
import Job from "./Job";
import Post from "./Post";
import PostMedia from "./PostMedia";
import PostReaction from "./PostReaction";
import RolePermission from "./RolePermission";
import Scheme from "./Scheme";
import User from "./User";
import UserOtp from "./UserOtp";
import UserProfile from "./UserProfile";
import UserRole from "./UserRole";
import UserToken from "./UserToken";
import TelescopeRequest from "./TelescopeRequest";
import TelescopeException from "./TelescopeException";
import TelescopeQuery from "./TelescopeQuery";

const establishAssociations = (): void => {
  AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(AuditLog, { foreignKey: "userId", as: "auditLogs" });

  Business.belongsTo(MetaBusinessType, { foreignKey: "businessTypeId", as: "businessType" });
  MetaBusinessType.hasMany(Business, { foreignKey: "businessTypeId", as: "businesses" });

  MetaBoothNumber.belongsTo(MetaMlaConstituency, {
    foreignKey: "mlaConstituencyId",
    as: "mlaConstituency"
  });
  MetaMlaConstituency.hasMany(MetaBoothNumber, {
    foreignKey: "mlaConstituencyId",
    as: "boothNumbers"
  });

  GeoPolitical.belongsTo(MetaBoothNumber, { foreignKey: "boothNumberId", as: "boothNumber" });
  MetaBoothNumber.hasMany(GeoPolitical, { foreignKey: "boothNumberId", as: "geoPoliticals" });
  GeoPolitical.belongsTo(MetaWardNumber, { foreignKey: "wardNumberId", as: "wardNumber" });
  MetaWardNumber.hasMany(GeoPolitical, { foreignKey: "wardNumberId", as: "geoPoliticals" });
  GeoPolitical.belongsTo(MetaMlaConstituency, {
    foreignKey: "mlaConstituencyId",
    as: "mlaConstituency"
  });
  MetaMlaConstituency.hasMany(GeoPolitical, {
    foreignKey: "mlaConstituencyId",
    as: "geoPoliticals"
  });

  Community.belongsTo(MetaCommunityType, { foreignKey: "communityTypeId", as: "communityType" });
  MetaCommunityType.hasMany(Community, { foreignKey: "communityTypeId", as: "communities" });

  FamilyMember.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(FamilyMember, { foreignKey: "userId", as: "familyMembers" });
  FamilyMember.belongsTo(MetaRelationType, { foreignKey: "relationTypeId", as: "relationType" });
  MetaRelationType.hasMany(FamilyMember, { foreignKey: "relationTypeId", as: "familyMembers" });

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

  // Self-referential association for parent-child roles
  MetaUserRole.belongsTo(MetaUserRole, {
    foreignKey: "metaUserRoleId",
    as: "parentRole"
  });
  MetaUserRole.hasMany(MetaUserRole, {
    foreignKey: "metaUserRoleId",
    as: "childRoles"
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

  Post.hasMany(PostMedia, { foreignKey: "postId", as: "media" });
  PostMedia.belongsTo(Post, { foreignKey: "postId", as: "post" });

  Post.hasMany(PostReaction, { foreignKey: "postId", as: "reactions" });
  PostReaction.belongsTo(Post, { foreignKey: "postId", as: "post" });
  PostReaction.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(PostReaction, { foreignKey: "userId", as: "postReactions" });

  Job.belongsTo(User, { foreignKey: "applicantUserId", as: "applicant" });
  User.hasMany(Job, { foreignKey: "applicantUserId", as: "jobApplications" });

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
  Business,
  Community,
  Event,
  EventMedia,
  EventRegistration,
  Job,
  FamilyMember,
  GeoPolitical,
  Member,
  MetaBoothNumber,
  MetaBusinessType,
  MetaCommunityType,
  MetaMlaConstituency,
  MetaPermission,
  MetaPermissionGroup,
  MetaRelationType,
  MetaUserRole,
  MetaWardNumber,
  Post,
  PostMedia,
  PostReaction,
  RolePermission,
  Scheme,
  User,
  UserOtp,
  UserProfile,
  UserRole,
  UserToken,
  TelescopeRequest,
  TelescopeException,
  TelescopeQuery
};
