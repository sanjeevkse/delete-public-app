import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import { UserProfileGender } from "../types/enums";
import type User from "./User";

class UserProfile extends Model<
  InferAttributes<UserProfile>,
  InferCreationAttributes<UserProfile>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare displayName: CreationOptional<string | null>;
  declare alernativeContactNumber: CreationOptional<string | null>;
  declare bio: CreationOptional<string | null>;
  declare dateOfBirth: CreationOptional<Date | null>;
  declare gender: CreationOptional<UserProfileGender | null>;
  declare occupation: CreationOptional<string | null>;
  declare profileImageUrl: CreationOptional<string | null>;
  declare fullAddress: CreationOptional<string | null>;
  declare addressLine1: CreationOptional<string | null>;
  declare addressLine2: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare state: CreationOptional<string | null>;
  declare postalCode: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare wardNumberId: CreationOptional<number | null>;
  declare boothNumberNumberId: CreationOptional<number | null>;
  declare isRegistrationAgreed: CreationOptional<number>;
  declare latitude: CreationOptional<number | null>;
  declare longitude: CreationOptional<number | null>;
  declare socialLinksJson: CreationOptional<Record<string, unknown> | null>;
  declare preferencesJson: CreationOptional<Record<string, unknown> | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
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
    gender: {
      type: DataTypes.ENUM(
        UserProfileGender.MALE,
        UserProfileGender.FEMALE,
        UserProfileGender.NON_BINARY,
        UserProfileGender.OTHER,
        UserProfileGender.PREFER_NOT
      ),
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
    boothNumberNumberId: {
      field: "booth_number_number_id",
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
