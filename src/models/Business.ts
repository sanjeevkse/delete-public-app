import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type MetaBusinessType from "./MetaBusinessType";

import sequelize from "../config/database";

class Business extends Model<
  InferAttributes<Business>,
  InferCreationAttributes<Business>
> {
  declare id: CreationOptional<number>;
  declare businessName: string;
  declare businessTypeId: number;
  declare pan: string | null;
  declare gstin: string | null;
  declare contactNumber: string | null;
  declare email: string | null;
  declare totalEmployees: CreationOptional<number | null>;
  declare turnoverYearly: number | null;
  declare fullAddress: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare businessType?: NonAttribute<MetaBusinessType>;
}

Business.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    businessName: {
      field: "business_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    businessTypeId: {
      field: "business_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    pan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      }
    },
    gstin: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      }
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    totalEmployees: {
      field: "total_employees",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    turnoverYearly: {
      field: "turnover_yearly",
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
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
    tableName: "tbl_business",
    timestamps: true,
    underscored: true
  }
);

export default Business;
