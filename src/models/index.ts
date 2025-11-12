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
import MetaSchemeType from "./MetaSchemeType";
import MetaSchemeTypeStep from "./MetaSchemeTypeStep";
import MetaGovernmentLevel from "./MetaGovernmentLevel";
import MetaSector from "./MetaSector";
import MetaSchemeTypeLookup from "./MetaSchemeTypeLookup";
import MetaOwnershipType from "./MetaOwnershipType";
import MetaGenderOption from "./MetaGenderOption";
import MetaWidowStatus from "./MetaWidowStatus";
import MetaDisabilityStatus from "./MetaDisabilityStatus";
import MetaEmploymentStatus from "./MetaEmploymentStatus";
import Job from "./Job";
import Post from "./Post";
import PostMedia from "./PostMedia";
import PostReaction from "./PostReaction";
import RolePermission from "./RolePermission";
import Scheme from "./Scheme";
import UserSchemeApplication from "./UserSchemeApplication";
import User from "./User";
import UserAccess from "./UserAccess";
import UserOtp from "./UserOtp";
import UserProfile from "./UserProfile";
import UserRole from "./UserRole";
import UserToken from "./UserToken";
import TelescopeRequest from "./TelescopeRequest";
import TelescopeException from "./TelescopeException";
import TelescopeQuery from "./TelescopeQuery";
import ComplaintType from "./ComplaintType";
import ComplaintTypeStep from "./ComplaintTypeSteps";
import Complaint from "./Complaint";
import ComplaintMedia from "./ComplaintMedia";
import MetaFieldType from "./MetaFieldType";
import MetaInputFormat from "./MetaInputFormat";
import Form from "./Form";
import FormField from "./FormField";
import FormFieldOption from "./FormFieldOption";
import FormMapping from "./FormMapping";

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

  MetaSchemeType.hasMany(MetaSchemeTypeStep, {
    foreignKey: "schemeTypeId",
    as: "steps",
    onDelete: "CASCADE",
    hooks: true
  });
  MetaSchemeTypeStep.belongsTo(MetaSchemeType, {
    foreignKey: "schemeTypeId",
    as: "schemeType"
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

  UserSchemeApplication.belongsTo(Scheme, { foreignKey: "schemeId", as: "scheme" });
  Scheme.hasMany(UserSchemeApplication, { foreignKey: "schemeId", as: "applications" });

  UserSchemeApplication.belongsTo(User, { foreignKey: "applicantUserId", as: "applicant" });
  User.hasMany(UserSchemeApplication, {
    foreignKey: "applicantUserId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(User, { foreignKey: "reviewerUserId", as: "reviewer" });
  User.hasMany(UserSchemeApplication, {
    foreignKey: "reviewerUserId",
    as: "reviewedSchemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaWardNumber, { foreignKey: "wardNumberId", as: "wardNumber" });
  MetaWardNumber.hasMany(UserSchemeApplication, {
    foreignKey: "wardNumberId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaBoothNumber, { foreignKey: "boothNumberId", as: "boothNumber" });
  MetaBoothNumber.hasMany(UserSchemeApplication, {
    foreignKey: "boothNumberId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaGovernmentLevel, {
    foreignKey: "governmentLevelId",
    as: "governmentLevel"
  });
  MetaGovernmentLevel.hasMany(UserSchemeApplication, {
    foreignKey: "governmentLevelId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaSector, { foreignKey: "sectorId", as: "sector" });
  MetaSector.hasMany(UserSchemeApplication, { foreignKey: "sectorId", as: "schemeApplications" });

  UserSchemeApplication.belongsTo(MetaSchemeTypeLookup, {
    foreignKey: "schemeTypeId",
    as: "schemeType"
  });
  MetaSchemeTypeLookup.hasMany(UserSchemeApplication, {
    foreignKey: "schemeTypeId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaOwnershipType, {
    foreignKey: "ownershipTypeId",
    as: "ownershipType"
  });
  MetaOwnershipType.hasMany(UserSchemeApplication, {
    foreignKey: "ownershipTypeId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaGenderOption, {
    foreignKey: "genderOptionId",
    as: "genderOption"
  });
  MetaGenderOption.hasMany(UserSchemeApplication, {
    foreignKey: "genderOptionId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaWidowStatus, {
    foreignKey: "widowStatusId",
    as: "widowStatus"
  });
  MetaWidowStatus.hasMany(UserSchemeApplication, {
    foreignKey: "widowStatusId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaDisabilityStatus, {
    foreignKey: "disabilityStatusId",
    as: "disabilityStatus"
  });
  MetaDisabilityStatus.hasMany(UserSchemeApplication, {
    foreignKey: "disabilityStatusId",
    as: "schemeApplications"
  });

  UserSchemeApplication.belongsTo(MetaEmploymentStatus, {
    foreignKey: "employmentStatusId",
    as: "employmentStatus"
  });
  MetaEmploymentStatus.hasMany(UserSchemeApplication, {
    foreignKey: "employmentStatusId",
    as: "schemeApplications"
  });

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

  Form.hasMany(FormField, {
    foreignKey: "formId",
    as: "fields",
    onDelete: "CASCADE",
    hooks: true
  });
  FormField.belongsTo(Form, { foreignKey: "formId", as: "form" });

  Form.hasMany(FormMapping, {
    foreignKey: "formId",
    as: "mappings",
    onDelete: "CASCADE",
    hooks: true
  });
  FormMapping.belongsTo(Form, { foreignKey: "formId", as: "form" });

  FormMapping.belongsTo(MetaWardNumber, { foreignKey: "wardNumberId", as: "wardNumber" });
  MetaWardNumber.hasMany(FormMapping, { foreignKey: "wardNumberId", as: "formMappings" });

  FormMapping.belongsTo(MetaBoothNumber, { foreignKey: "boothNumberId", as: "boothNumber" });
  MetaBoothNumber.hasMany(FormMapping, { foreignKey: "boothNumberId", as: "formMappings" });

  FormField.belongsTo(MetaFieldType, { foreignKey: "fieldTypeId", as: "fieldType" });
  MetaFieldType.hasMany(FormField, { foreignKey: "fieldTypeId", as: "formFields" });

  FormField.belongsTo(MetaInputFormat, { foreignKey: "inputFormatId", as: "inputFormat" });
  MetaInputFormat.hasMany(FormField, { foreignKey: "inputFormatId", as: "formFields" });

  FormField.hasMany(FormFieldOption, {
    foreignKey: "fieldId",
    as: "options",
    onDelete: "CASCADE",
    hooks: true
  });
  FormFieldOption.belongsTo(FormField, { foreignKey: "fieldId", as: "field" });
  UserRole.belongsTo(User, { foreignKey: "userId", as: "user" });
  UserRole.belongsTo(MetaUserRole, { foreignKey: "roleId", as: "role" });
  ComplaintType.hasMany(ComplaintTypeStep, {
    foreignKey: "complaint_type_id",
    as: "steps"
  });

  ComplaintTypeStep.belongsTo(ComplaintType, {
    foreignKey: "complaint_type_id",
    as: "complaintType"
  });

  // Complaint associations
  Complaint.belongsTo(ComplaintType, {
    foreignKey: "complaintTypeId",
    as: "complaintType"
  });
  ComplaintType.hasMany(Complaint, {
    foreignKey: "complaintTypeId",
    as: "complaints"
  });

  Complaint.hasMany(ComplaintMedia, {
    foreignKey: "complaintId",
    as: "media"
  });
  ComplaintMedia.belongsTo(Complaint, {
    foreignKey: "complaintId",
    as: "complaint"
  });

  // UserAccess associations
  UserAccess.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(UserAccess, { foreignKey: "userId", as: "accessProfiles" });

  UserAccess.belongsTo(MetaUserRole, { foreignKey: "accessRoleId", as: "accessRole" });
  MetaUserRole.hasMany(UserAccess, { foreignKey: "accessRoleId", as: "userAccesses" });

  UserAccess.belongsTo(MetaWardNumber, { foreignKey: "wardNumberId", as: "wardNumber" });
  MetaWardNumber.hasMany(UserAccess, { foreignKey: "wardNumberId", as: "userAccesses" });

  UserAccess.belongsTo(MetaBoothNumber, { foreignKey: "boothNumberId", as: "boothNumber" });
  MetaBoothNumber.hasMany(UserAccess, { foreignKey: "boothNumberId", as: "userAccesses" });

  UserAccess.belongsTo(MetaMlaConstituency, {
    foreignKey: "mlaConstituencyId",
    as: "mlaConstituency"
  });
  MetaMlaConstituency.hasMany(UserAccess, {
    foreignKey: "mlaConstituencyId",
    as: "userAccesses"
  });
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
  MetaSchemeType,
  MetaSchemeTypeStep,
  MetaGovernmentLevel,
  MetaSector,
  MetaSchemeTypeLookup,
  MetaOwnershipType,
  MetaGenderOption,
  MetaWidowStatus,
  MetaDisabilityStatus,
  MetaEmploymentStatus,
  Post,
  PostMedia,
  PostReaction,
  RolePermission,
  Scheme,
  User,
  UserAccess,
  UserOtp,
  UserProfile,
  UserRole,
  UserToken,
  TelescopeRequest,
  TelescopeException,
  TelescopeQuery,
  ComplaintType,
  ComplaintTypeStep,
  ComplaintMedia,
  UserSchemeApplication
};
