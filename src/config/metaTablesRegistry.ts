/**
 * Meta Tables Registry Configuration
 *
 * To add a new meta table:
 * 1. Create the model in src/models/Meta*.ts (e.g., MetaYourTable.ts)
 * 2. Add configuration here following the pattern below
 * 3. The controller will automatically pick it up
 */

interface MetaTableConfigBase {
  name: string;
  tableName: string;
  displayName: string;
  modelName: string; // Name of the model file without .ts extension (e.g., "MetaBusinessType")
  description: string;
  primaryKey: string;
  searchableFields: string[];
  hasStatus?: boolean;
  customIncludes?: Array<{
    association: string;
    attributes: string[];
  }>;
}

/**
 * Registry of all meta table configurations
 * Add your new meta table configuration here
 */
export const META_TABLE_CONFIGS: Record<string, MetaTableConfigBase> = {
  businessType: {
    name: "businessType",
    tableName: "meta_business_types",
    displayName: "Business Types",
    modelName: "MetaBusinessType",
    description: "Types of businesses",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  boothNumber: {
    name: "boothNumber",
    tableName: "meta_booth_numbers",
    displayName: "Booth Numbers",
    modelName: "MetaBoothNumber",
    description: "Booth numbers for voting",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true,
    customIncludes: [
      {
        association: "mlaConstituency",
        attributes: ["id", "dispName"]
      }
    ]
  },
  communityType: {
    name: "communityType",
    tableName: "meta_community_types",
    displayName: "Community Types",
    modelName: "MetaCommunityType",
    description: "Types of communities",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  mlaConstituency: {
    name: "mlaConstituency",
    tableName: "meta_mla_constituencies",
    displayName: "MLA Constituencies",
    modelName: "MetaMlaConstituency",
    description: "MLA constituency details",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true
  },
  permission: {
    name: "permission",
    tableName: "meta_permissions",
    displayName: "Permissions",
    modelName: "MetaPermission",
    description: "System permissions",
    primaryKey: "id",
    searchableFields: ["dispName", "name"],
    hasStatus: true,
    customIncludes: [
      {
        association: "group",
        attributes: ["id", "dispName"]
      }
    ]
  },
  permissionGroup: {
    name: "permissionGroup",
    tableName: "meta_permission_groups",
    displayName: "Permission Groups",
    modelName: "MetaPermissionGroup",
    description: "Groups for organizing permissions",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  relationType: {
    name: "relationType",
    tableName: "meta_relation_types",
    displayName: "Relation Types",
    modelName: "MetaRelationType",
    description: "Types of family relations",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  userRole: {
    name: "userRole",
    tableName: "meta_user_roles",
    displayName: "User Roles",
    modelName: "MetaUserRole",
    description: "User role definitions",
    primaryKey: "id",
    searchableFields: ["dispName", "name"],
    hasStatus: true,
    customIncludes: [
      {
        association: "parentRole",
        attributes: ["id", "dispName"]
      }
    ]
  },
  wardNumber: {
    name: "wardNumber",
    tableName: "meta_ward_numbers",
    displayName: "Ward Numbers",
    modelName: "MetaWardNumber",
    description: "Ward number details",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true
  },
  governmentLevel: {
    name: "governmentLevel",
    tableName: "meta_government_levels",
    displayName: "Government Levels",
    modelName: "MetaGovernmentLevel",
    description: "Government hierarchy levels for scheme eligibility (e.g., State, Central).",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  sector: {
    name: "sector",
    tableName: "meta_sectors",
    displayName: "Sectors",
    modelName: "MetaSector",
    description: "Sectors associated with schemes (public, private, etc.).",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  schemeTypeLookup: {
    name: "schemeTypeLookup",
    tableName: "meta_scheme_type_lookup",
    displayName: "Scheme Type Lookup",
    modelName: "MetaSchemeTypeLookup",
    description: "Meta list that powers the scheme type dropdown for user applications.",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  ownershipType: {
    name: "ownershipType",
    tableName: "meta_ownership_types",
    displayName: "Ownership Types",
    modelName: "MetaOwnershipType",
    description: "Property ownership categories for applicant residences.",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  genderOption: {
    name: "genderOption",
    tableName: "meta_gender_options",
    displayName: "Gender Options",
    modelName: "MetaGenderOption",
    description: "Allowed gender selections for applications.",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  widowStatus: {
    name: "widowStatus",
    tableName: "meta_widow_statuses",
    displayName: "Widow Status",
    modelName: "MetaWidowStatus",
    description: "Widow/Widower response options.",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  disabilityStatus: {
    name: "disabilityStatus",
    tableName: "meta_disability_statuses",
    displayName: "Disability Status",
    modelName: "MetaDisabilityStatus",
    description: "Disability declaration options used in scheme applications.",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  employmentStatus: {
    name: "employmentStatus",
    tableName: "meta_employment_statuses",
    displayName: "Employment Status",
    modelName: "MetaEmploymentStatus",
    description: "Employment status choices (employed, student, unemployed, etc.).",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  fieldType: {
    name: "fieldType",
    tableName: "meta_field_types",
    displayName: "Field Types",
    modelName: "MetaFieldType",
    description: "Types of form fields",
    primaryKey: "id",
    searchableFields: ["dispName", "type"],
    hasStatus: true
  },
  inputFormat: {
    name: "inputFormat",
    tableName: "meta_input_formats",
    displayName: "Input Formats",
    modelName: "MetaInputFormat",
    description: "Input format definitions",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  }
};
