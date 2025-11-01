import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type MetaCommunityType from "./MetaCommunityType";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber } from "../utils/phoneNumber";

class Community extends Model<InferAttributes<Community>, InferCreationAttributes<Community>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare communityTypeId: number;
  declare communityName: string;
  declare isRegistered: CreationOptional<number>;
  declare registrationDate: Date | null;
  declare contactPerson: string | null;
  declare contactNumber: string | null;
  declare email: string | null;
  declare totalMember: CreationOptional<number>;
  declare fullAddress: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare communityType?: NonAttribute<MetaCommunityType>;
}

Community.init(
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
    communityTypeId: {
      field: "community_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    communityName: {
      field: "community_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    isRegistered: {
      field: "is_registered",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "1=registered, 0=not registered"
    },
    registrationDate: {
      field: "registration_date",
      type: DataTypes.DATE,
      allowNull: true
    },
    contactPerson: {
      field: "contact_person",
      type: DataTypes.STRING(191),
      allowNull: true
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
    totalMember: {
      field: "total_member",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
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
    tableName: "tbl_community",
    timestamps: true,
    underscored: true
  }
);

export default Community;
