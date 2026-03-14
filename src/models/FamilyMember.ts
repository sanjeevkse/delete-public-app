import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type MetaRelationType from "./MetaRelationType";
import type MetaDisabilityStatus from "./MetaDisabilityStatus";
import type MetaMaritalStatus from "./MetaMaritalStatus";
import type MetaEducationalDetailGroup from "./MetaEducationalDetailGroup";
import type MetaEducationalDetail from "./MetaEducationalDetail";
import type MetaEmploymentGroup from "./MetaEmploymentGroup";
import type MetaEmploymentStatus from "./MetaEmploymentStatus";
import type MetaEmployment from "./MetaEmployment";
import type User from "./User";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber } from "../utils/phoneNumber";

class FamilyMember extends Model<
  InferAttributes<FamilyMember>,
  InferCreationAttributes<FamilyMember>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare fullName: string;
  declare contactNumber: string | null;
  declare alternateContactNumber: string | null;
  declare email: string | null;
  declare instagram: string | null;
  declare facebook: string | null;
  declare fullAddress: string | null;
  declare aadhaarNumber: string | null;
  declare aadhaarPhoto: string | null;
  declare voterIdNumber: string | null;
  declare voterIdProof: string | null;
  declare relationTypeId: number;
  declare relationshipName: string | null;
  declare disabilityStatusId: number | null;
  declare maritalStatusId: number | null;
  declare educationalDetailGroupId: number | null;
  declare educationalDetailId: number | null;
  declare employmentGroupId: number | null;
  declare employmentStatusId: number | null;
  declare employmentId: number | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
  declare relationType?: NonAttribute<MetaRelationType>;
  declare disabilityStatus?: NonAttribute<MetaDisabilityStatus | null>;
  declare maritalStatus?: NonAttribute<MetaMaritalStatus | null>;
  declare educationalDetailGroup?: NonAttribute<MetaEducationalDetailGroup | null>;
  declare educationalDetail?: NonAttribute<MetaEducationalDetail | null>;
  declare employmentGroup?: NonAttribute<MetaEmploymentGroup | null>;
  declare employmentStatus?: NonAttribute<MetaEmploymentStatus | null>;
  declare employment?: NonAttribute<MetaEmployment | null>;
}

FamilyMember.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    fullName: {
      field: "full_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "contactNumber");
        this.setDataValue("contactNumber", normalized);
      }
    },
    alternateContactNumber: {
      field: "alternate_contact_number",
      type: DataTypes.STRING(20),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "alternateContactNumber");
        this.setDataValue("alternateContactNumber", normalized);
      }
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    instagram: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    facebook: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
      allowNull: true
    },
    aadhaarNumber: {
      field: "aadhaar_number",
      type: DataTypes.STRING(12),
      allowNull: true,
      validate: {
        is: /^[0-9]{12}$/
      }
    },
    aadhaarPhoto: {
      field: "aadhaar_photo",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    voterIdNumber: {
      field: "voter_id_number",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    voterIdProof: {
      field: "voter_id_proof",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    relationTypeId: {
      field: "relation_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    relationshipName: {
      field: "relationship_name",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    disabilityStatusId: {
      field: "disability_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    maritalStatusId: {
      field: "marital_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailGroupId: {
      field: "educational_detail_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailId: {
      field: "educational_detail_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    employmentGroupId: {
      field: "employment_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    employmentStatusId: {
      field: "employment_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    employmentId: {
      field: "employment_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "1=active, 0=inactive"
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
      allowNull: false
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "tbl_family_member",
    timestamps: true,
    underscored: true
  }
);

export default FamilyMember;
