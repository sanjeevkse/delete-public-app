import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type Scheme from "./Scheme";
import type User from "./User";
import type MetaWardNumber from "./MetaWardNumber";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaGovernmentLevel from "./MetaGovernmentLevel";
import type MetaComplaintSector from "./MetaComplaintSector";
import type MetaSchemeTypeLookup from "./MetaSchemeTypeLookup";
import type MetaOwnershipType from "./MetaOwnershipType";
import type MetaGenderOption from "./MetaGenderOption";
import type MetaWidowStatus from "./MetaWidowStatus";
import type MetaDisabilityStatus from "./MetaDisabilityStatus";
import type MetaEmploymentStatus from "./MetaEmploymentStatus";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber, normalizePhoneNumber } from "../utils/phoneNumber";

export const USER_SCHEME_APPLICANT_TYPES = ["SELF", "OTHERS"] as const;
export type UserSchemeApplicantType = (typeof USER_SCHEME_APPLICANT_TYPES)[number];

class UserSchemeApplication extends Model<
  InferAttributes<UserSchemeApplication>,
  InferCreationAttributes<UserSchemeApplication>
> {
  declare id: CreationOptional<number>;
  declare schemeId: number;
  declare applicantUserId: CreationOptional<number | null>;
  declare applicantType: UserSchemeApplicantType;
  declare applicantName: string;
  declare mobilePrimary: string;
  declare mobileAlternate: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare addressLine: string;
  declare wardNumberId: CreationOptional<number | null>;
  declare boothNumberId: CreationOptional<number | null>;
  declare doorNumber: CreationOptional<string | null>;
  declare floorNumber: CreationOptional<string | null>;
  declare mainRoad: CreationOptional<string | null>;
  declare crossRoad: CreationOptional<string | null>;
  declare locality: CreationOptional<string | null>;
  declare pinCode: CreationOptional<string | null>;
  declare governmentLevelId: number;
  declare sectorId: number;
  declare schemeTypeId: number;
  declare schemeDescription: CreationOptional<string | null>;
  declare voterId: CreationOptional<string | null>;
  declare aadhaarId: CreationOptional<string | null>;
  declare dob: CreationOptional<Date | null>;
  declare ownershipTypeId: CreationOptional<number | null>;
  declare genderOptionId: CreationOptional<number | null>;
  declare widowStatusId: CreationOptional<number | null>;
  declare disabilityStatusId: CreationOptional<number | null>;
  declare educationLevel: CreationOptional<string | null>;
  declare employmentStatusId: CreationOptional<number | null>;
  declare documentUrl: CreationOptional<string | null>;
  declare termsAcceptedAt: Date;
  declare status: CreationOptional<number>;
  declare submittedAt: CreationOptional<Date | null>;
  declare reviewedAt: CreationOptional<Date | null>;
  declare reviewerUserId: CreationOptional<number | null>;
  declare rejectionReason: CreationOptional<string | null>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare scheme?: NonAttribute<Scheme>;
  declare applicant?: NonAttribute<User | null>;
  declare reviewer?: NonAttribute<User | null>;
  declare wardNumber?: NonAttribute<MetaWardNumber | null>;
  declare boothNumber?: NonAttribute<MetaBoothNumber | null>;
  declare governmentLevel?: NonAttribute<MetaGovernmentLevel | null>;
  declare sector?: NonAttribute<MetaComplaintSector | null>;
  declare schemeType?: NonAttribute<MetaSchemeTypeLookup | null>;
  declare ownershipType?: NonAttribute<MetaOwnershipType | null>;
  declare genderOption?: NonAttribute<MetaGenderOption | null>;
  declare widowStatus?: NonAttribute<MetaWidowStatus | null>;
  declare disabilityStatus?: NonAttribute<MetaDisabilityStatus | null>;
  declare employmentStatus?: NonAttribute<MetaEmploymentStatus | null>;
}

UserSchemeApplication.init(
  {
    id: {
      field: "application_id",
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    schemeId: {
      field: "scheme_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    applicantUserId: {
      field: "applicant_user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    applicantType: {
      field: "applicant_type",
      type: DataTypes.ENUM(...USER_SCHEME_APPLICANT_TYPES),
      allowNull: false
    },
    applicantName: {
      field: "applicant_name",
      type: DataTypes.STRING(120),
      allowNull: false
    },
    mobilePrimary: {
      field: "mobile_primary",
      type: DataTypes.STRING(15),
      allowNull: false,
      set(value: string) {
        const normalized = normalizePhoneNumber(value, "mobilePrimary");
        this.setDataValue("mobilePrimary", normalized);
      }
    },
    mobileAlternate: {
      field: "mobile_alternate",
      type: DataTypes.STRING(15),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "mobileAlternate");
        this.setDataValue("mobileAlternate", normalized);
      }
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    addressLine: {
      field: "address_line",
      type: DataTypes.STRING(255),
      allowNull: false
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    doorNumber: {
      field: "door_number",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    floorNumber: {
      field: "floor_number",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    mainRoad: {
      field: "main_road",
      type: DataTypes.STRING(120),
      allowNull: true
    },
    crossRoad: {
      field: "cross_road",
      type: DataTypes.STRING(120),
      allowNull: true
    },
    locality: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    pinCode: {
      field: "pin_code",
      type: DataTypes.STRING(10),
      allowNull: true
    },
    governmentLevelId: {
      field: "government_level_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    sectorId: {
      field: "sector_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    schemeTypeId: {
      field: "scheme_type_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    schemeDescription: {
      field: "scheme_description",
      type: DataTypes.TEXT,
      allowNull: true
    },
    voterId: {
      field: "voter_id",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    aadhaarId: {
      field: "aadhaar_id",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    ownershipTypeId: {
      field: "ownership_type_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    genderOptionId: {
      field: "gender_option_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    widowStatusId: {
      field: "widow_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    disabilityStatusId: {
      field: "disability_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationLevel: {
      field: "education_level",
      type: DataTypes.STRING(80),
      allowNull: true
    },
    employmentStatusId: {
      field: "employment_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    documentUrl: {
      field: "document_url",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    termsAcceptedAt: {
      field: "terms_accepted_at",
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    submittedAt: {
      field: "submitted_at",
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewedAt: {
      field: "reviewed_at",
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewerUserId: {
      field: "reviewer_user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    rejectionReason: {
      field: "rejection_reason",
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: "tbl_user_scheme_applications",
    modelName: "UserSchemeApplication",
    timestamps: false
  }
);

export default UserSchemeApplication;
