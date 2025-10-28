import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type MetaRelationType from "./MetaRelationType";
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
  declare email: string | null;
  declare fullAddress: string | null;
  declare aadhaarNumber: string | null;
  declare relationTypeId: number;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
  declare relationType?: NonAttribute<MetaRelationType>;
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
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: {
        isEmail: true
      }
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
    relationTypeId: {
      field: "relation_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
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
