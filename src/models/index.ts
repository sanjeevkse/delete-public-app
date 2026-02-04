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
import MetaComplaintDepartment from "./MetaComplaintDepartment";
import MetaSchemeCategory from "./MetaSchemeCategory";
import MetaSchemeSector from "./MetaSchemeSector";
import SchemeStep from "./SchemeStep";
import MetaGovernmentLevel from "./MetaGovernmentLevel";
import MetaComplaintSector from "./MetaComplaintSector";
import MetaSchemeTypeLookup from "./MetaSchemeTypeLookup";
import MetaOwnershipType from "./MetaOwnershipType";
import MetaGenderOption from "./MetaGenderOption";
import MetaDesignation from "./MetaDesignation";
import MetaMaritalStatus from "./MetaMaritalStatus";
import MetaWidowStatus from "./MetaWidowStatus";
import MetaDisabilityStatus from "./MetaDisabilityStatus";
import MetaEmploymentStatus from "./MetaEmploymentStatus";
import MetaEducationalDetail from "./MetaEducationalDetail";
import MetaEducationalDetailGroup from "./MetaEducationalDetailGroup";
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
import MetaComplaintStatus from "./MetaComplaintStatus";
import ComplaintStatusHistory from "./ComplaintStatusHistory";
import ComplaintStatusHistoryMedia from "./ComplaintStatusHistoryMedia";
import MetaFieldType from "./MetaFieldType";
import MetaInputFormat from "./MetaInputFormat";
import Form from "./Form";
import FormField from "./FormField";
import FormFieldOption from "./FormFieldOption";
import FormEvent from "./FormEvent";
import FormEventAccessibility from "./FormEventAccessibility";
import FormSubmission from "./FormSubmission";
import FormFieldValue from "./FormFieldValue";
import DeviceToken from "./DeviceToken";
import NotificationLog from "./NotificationLog";
import NotificationRecipient from "./NotificationRecipient";
import Sidebar from "./Sidebar";
import RoleSidebar from "./RoleSidebar";
import PermissionGroupSidebar from "./PermissionGroupSidebar";
import ConditionalListItem from "./ConditionalListItem";

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

  EventRegistration.belongsTo(MetaWardNumber, {
    foreignKey: "wardNumberId",
    as: "wardNumber"
  });
  MetaWardNumber.hasMany(EventRegistration, {
    foreignKey: "wardNumberId",
    as: "eventRegistrations"
  });

  EventRegistration.belongsTo(MetaBoothNumber, {
    foreignKey: "boothNumberId",
    as: "boothNumber"
  });
  MetaBoothNumber.hasMany(EventRegistration, {
    foreignKey: "boothNumberId",
    as: "eventRegistrations"
  });

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

  // Sidebar - Role associations (many-to-many through RoleSidebar)
  Sidebar.belongsToMany(MetaUserRole, {
    through: RoleSidebar,
    foreignKey: "sidebarId",
    otherKey: "roleId",
    as: "roles"
  });
  MetaUserRole.belongsToMany(Sidebar, {
    through: RoleSidebar,
    foreignKey: "roleId",
    otherKey: "sidebarId",
    as: "sidebars"
  });

  // Sidebar - PermissionGroup associations (many-to-many through PermissionGroupSidebar)
  Sidebar.belongsToMany(MetaPermissionGroup, {
    through: PermissionGroupSidebar,
    foreignKey: "sidebarId",
    otherKey: "permissionGroupId",
    as: "permissionGroups_assigned"
  });
  MetaPermissionGroup.belongsToMany(Sidebar, {
    through: PermissionGroupSidebar,
    foreignKey: "permissionGroupId",
    otherKey: "sidebarId",
    as: "sidebars_assigned"
  });

  Scheme.hasMany(SchemeStep, {
    foreignKey: "schemeId",
    as: "steps",
    onDelete: "CASCADE",
    hooks: true
  });
  SchemeStep.belongsTo(Scheme, {
    foreignKey: "schemeId",
    as: "scheme"
  });
  Scheme.belongsTo(MetaSchemeCategory, {
    foreignKey: "schemeCategoryId",
    as: "schemeCategory"
  });
  Scheme.belongsTo(MetaSchemeSector, {
    foreignKey: "schemeSectorId",
    as: "schemeSector"
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

  UserSchemeApplication.belongsTo(MetaBoothNumber, {
    foreignKey: "boothNumberId",
    as: "boothNumber"
  });
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

  UserSchemeApplication.belongsTo(MetaComplaintSector, { foreignKey: "sectorId", as: "sector" });
  MetaComplaintSector.hasMany(UserSchemeApplication, {
    foreignKey: "sectorId",
    as: "schemeApplications"
  });

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

  UserProfile.belongsTo(MetaGenderOption, {
    foreignKey: "genderId",
    as: "gender"
  });
  MetaGenderOption.hasMany(UserProfile, {
    foreignKey: "genderId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaMaritalStatus, {
    foreignKey: "maritalStatusId",
    as: "maritalStatus"
  });
  MetaMaritalStatus.hasMany(UserProfile, {
    foreignKey: "maritalStatusId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaWardNumber, {
    foreignKey: "wardNumberId",
    as: "wardNumber"
  });
  MetaWardNumber.hasMany(UserProfile, {
    foreignKey: "wardNumberId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaBoothNumber, {
    foreignKey: "boothNumberId",
    as: "boothNumber"
  });
  MetaBoothNumber.hasMany(UserProfile, {
    foreignKey: "boothNumberId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaEducationalDetail, {
    foreignKey: "educationalDetailId",
    as: "educationalDetail"
  });
  MetaEducationalDetail.hasMany(UserProfile, {
    foreignKey: "educationalDetailId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaEducationalDetailGroup, {
    foreignKey: "educationalDetailGroupId",
    as: "educationalDetailGroup"
  });
  MetaEducationalDetailGroup.hasMany(UserProfile, {
    foreignKey: "educationalDetailGroupId",
    as: "userProfiles"
  });

  UserProfile.belongsTo(MetaComplaintDepartment, {
    foreignKey: "sectorId",
    as: "sector"
  });
  MetaComplaintDepartment.hasMany(UserProfile, {
    foreignKey: "sectorId",
    as: "userProfiles"
  });

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

  Form.hasMany(FormEvent, {
    foreignKey: "formId",
    as: "events",
    onDelete: "CASCADE",
    hooks: true
  });
  FormEvent.belongsTo(Form, { foreignKey: "formId", as: "form" });

  FormEvent.hasMany(FormEventAccessibility, {
    foreignKey: "formEventId",
    as: "accessibility",
    onDelete: "CASCADE",
    hooks: true
  });
  FormEventAccessibility.belongsTo(FormEvent, {
    foreignKey: "formEventId",
    as: "formEvent"
  });

  FormEventAccessibility.belongsTo(MetaWardNumber, {
    foreignKey: "wardNumberId",
    as: "wardNumber"
  });
  MetaWardNumber.hasMany(FormEventAccessibility, {
    foreignKey: "wardNumberId",
    as: "formEventAccessibilities"
  });

  FormEventAccessibility.belongsTo(MetaBoothNumber, {
    foreignKey: "boothNumberId",
    as: "boothNumber"
  });
  MetaBoothNumber.hasMany(FormEventAccessibility, {
    foreignKey: "boothNumberId",
    as: "formEventAccessibilities"
  });

  FormEventAccessibility.belongsTo(MetaUserRole, {
    foreignKey: "userRoleId",
    as: "userRole"
  });
  MetaUserRole.hasMany(FormEventAccessibility, {
    foreignKey: "userRoleId",
    as: "formEventAccessibilities"
  });

  FormEvent.hasMany(FormSubmission, {
    foreignKey: "formEventId",
    as: "submissions",
    onDelete: "CASCADE",
    hooks: true
  });
  FormSubmission.belongsTo(FormEvent, {
    foreignKey: "formEventId",
    as: "formEvent"
  });

  FormSubmission.belongsTo(User, { foreignKey: "submittedBy", as: "user" });
  User.hasMany(FormSubmission, { foreignKey: "submittedBy", as: "formSubmissions" });

  FormSubmission.hasMany(FormFieldValue, {
    foreignKey: "formSubmissionId",
    as: "fieldValues",
    onDelete: "CASCADE",
    hooks: true
  });
  FormFieldValue.belongsTo(FormSubmission, {
    foreignKey: "formSubmissionId",
    as: "formSubmission"
  });

  FormFieldValue.belongsTo(FormField, { foreignKey: "formFieldId", as: "formField" });
  FormField.hasMany(FormFieldValue, {
    foreignKey: "formFieldId",
    as: "submissionValues"
  });

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

  // ComplaintType and MetaComplaintDepartment associations
  ComplaintType.belongsTo(MetaComplaintDepartment, {
    foreignKey: "complaint_department_id",
    as: "complaintDepartment"
  });
  MetaComplaintDepartment.hasMany(ComplaintType, {
    foreignKey: "complaint_department_id",
    as: "complaintTypes"
  });

  // MetaComplaintDepartment and MetaComplaintSector associations
  MetaComplaintDepartment.belongsTo(MetaComplaintSector, {
    foreignKey: "complaint_sector_id",
    as: "complaintSector"
  });
  MetaComplaintSector.hasMany(MetaComplaintDepartment, {
    foreignKey: "complaint_sector_id",
    as: "departments"
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

  Complaint.belongsTo(MetaWardNumber, {
    foreignKey: "wardNumberId",
    as: "wardNumber"
  });
  MetaWardNumber.hasMany(Complaint, {
    foreignKey: "wardNumberId",
    as: "complaints"
  });

  Complaint.belongsTo(MetaBoothNumber, {
    foreignKey: "boothNumberId",
    as: "boothNumber"
  });
  MetaBoothNumber.hasMany(Complaint, {
    foreignKey: "boothNumberId",
    as: "complaints"
  });

  Complaint.belongsTo(MetaComplaintStatus, {
    foreignKey: "currentStatusId",
    as: "currentStatus"
  });
  MetaComplaintStatus.hasMany(Complaint, {
    foreignKey: "currentStatusId",
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

  Complaint.hasMany(ComplaintStatusHistory, {
    foreignKey: "complaintId",
    as: "statusHistory"
  });
  ComplaintStatusHistory.belongsTo(Complaint, {
    foreignKey: "complaintId",
    as: "complaint"
  });

  ComplaintStatusHistory.belongsTo(MetaComplaintStatus, {
    foreignKey: "complaintStatusId",
    as: "complaintStatus"
  });
  MetaComplaintStatus.hasMany(ComplaintStatusHistory, {
    foreignKey: "complaintStatusId",
    as: "statusHistories"
  });

  ComplaintStatusHistory.hasMany(ComplaintStatusHistoryMedia, {
    foreignKey: "complaintStatusHistoryId",
    as: "media"
  });
  ComplaintStatusHistoryMedia.belongsTo(ComplaintStatusHistory, {
    foreignKey: "complaintStatusHistoryId",
    as: "statusHistory"
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

  // DeviceToken associations
  DeviceToken.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(DeviceToken, { foreignKey: "userId", as: "deviceTokens" });

  // NotificationLog and NotificationRecipient associations
  NotificationLog.hasMany(NotificationRecipient, {
    foreignKey: "notificationLogId",
    as: "recipients"
  });
  NotificationRecipient.belongsTo(NotificationLog, {
    foreignKey: "notificationLogId",
    as: "notificationLog"
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
  MetaGovernmentLevel,
  MetaComplaintSector,
  MetaSchemeTypeLookup,
  MetaOwnershipType,
  MetaGenderOption,
  MetaDesignation,
  MetaMaritalStatus,
  MetaWidowStatus,
  MetaDisabilityStatus,
  MetaEmploymentStatus,
  SchemeStep,
  Post,
  PostMedia,
  PostReaction,
  RolePermission,
  Scheme,
  Sidebar,
  RoleSidebar,
  PermissionGroupSidebar,
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
  UserSchemeApplication,
  FormSubmission,
  FormFieldValue,
  DeviceToken,
  NotificationLog,
  NotificationRecipient,
  ConditionalListItem
};
