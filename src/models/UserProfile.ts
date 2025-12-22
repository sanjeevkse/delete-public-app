import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber } from "../utils/phoneNumber";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaEducationalDetail from "./MetaEducationalDetail";
import type MetaEducationalDetailGroup from "./MetaEducationalDetailGroup";
import type MetaGenderOption from "./MetaGenderOption";
import type MetaMaritalStatus from "./MetaMaritalStatus";
import type MetaComplaintDepartment from "./MetaComplaintDepartment";
import type MetaWardNumber from "./MetaWardNumber";
import type User from "./User";

class UserProfile extends Model<
  InferAttributes<UserProfile>,
  InferCreationAttributes<UserProfile>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare displayName: CreationOptional<string | null>;
  declare alernativeContactNumber: CreationOptional<string | null>;
  declare emergencyContactNumber: CreationOptional<string | null>;
  declare aadhaarNumber: CreationOptional<string | null>;
  declare panNumber: CreationOptional<string | null>;
  declare bio: CreationOptional<string | null>;
  declare dateOfBirth: CreationOptional<Date | null>;
  declare citizenAge: CreationOptional<number | null>;
  declare genderId: CreationOptional<number | null>;
  declare educationalDetailId: CreationOptional<number | null>;
  declare educationalDetailGroupId: CreationOptional<number | null>;
  declare dateOfJoining: CreationOptional<Date | null>;
  declare maritalStatusId: CreationOptional<number | null>;
  declare occupation: CreationOptional<string | null>;
  declare profileImageUrl: CreationOptional<string | null>;
  declare referredBy: CreationOptional<string | null>;
  declare fullAddress: CreationOptional<string | null>;
  declare addressLine1: CreationOptional<string | null>;
  declare addressLine2: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare state: CreationOptional<string | null>;
  declare postalCode: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare wardNumberId: number | null;
  declare boothNumberId: number | null;
  declare sectorId: CreationOptional<number | null>;
  declare isRegistrationAgreed: CreationOptional<number>;
  declare latitude: CreationOptional<number | null>;
  declare longitude: CreationOptional<number | null>;
  declare socialLinksJson: CreationOptional<Record<string, unknown> | null>;
  declare preferencesJson: CreationOptional<Record<string, unknown> | null>;
  declare postsBlocked: CreationOptional<boolean>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
  declare gender?: NonAttribute<MetaGenderOption | null>;
  declare educationalDetail?: NonAttribute<MetaEducationalDetail | null>;
  declare educationalDetailGroup?: NonAttribute<MetaEducationalDetailGroup | null>;
  declare maritalStatus?: NonAttribute<MetaMaritalStatus | null>;
  declare wardNumber?: NonAttribute<MetaWardNumber | null>;
  declare boothNumber?: NonAttribute<MetaBoothNumber | null>;
  declare sector?: NonAttribute<MetaComplaintDepartment | null>;
}

UserProfile.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    displayName: {
      field: "display_name",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    alernativeContactNumber: {
      field: "alernative_contact_number",
      type: DataTypes.STRING(191),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "alternativeContactNumber");
        this.setDataValue("alernativeContactNumber", normalized);
      }
    },
    emergencyContactNumber: {
      field: "emergency_contact_number",
      type: DataTypes.STRING(191),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "emergencyContactNumber");
        this.setDataValue("emergencyContactNumber", normalized);
      }
    },
    aadhaarNumber: {
      field: "aadhaar_number",
      type: DataTypes.STRING(12),
      allowNull: true
    },
    panNumber: {
      field: "pan_number",
      type: DataTypes.STRING(10),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateOfBirth: {
      field: "date_of_birth",
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    citizenAge: {
      field: "citizen_age",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    genderId: {
      field: "gender_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailId: {
      field: "educational_detail_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailGroupId: {
      field: "educational_detail_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    dateOfJoining: {
      field: "date_of_joining",
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    maritalStatusId: {
      field: "marital_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    occupation: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    profileImageUrl: {
      field: "profile_image_url",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    referredBy: {
      field: "referred_by",
      type: DataTypes.STRING(45),
      allowNull: true
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
      allowNull: true
    },
    addressLine1: {
      field: "address_line1",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    addressLine2: {
      field: "address_line2",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    postalCode: {
      field: "postal_code",
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    sectorId: {
      field: "sector_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    isRegistrationAgreed: {
      field: "is_registration_agreed",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    socialLinksJson: {
      field: "social_links_json",
      type: DataTypes.JSON,
      allowNull: true
    },
    preferencesJson: {
      field: "preferences_json",
      type: DataTypes.JSON,
      allowNull: true
    },
    postsBlocked: {
      field: "posts_blocked",
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "tbl_user_profile",
    modelName: "UserProfile",
    timestamps: false
  }
);

export default UserProfile;
