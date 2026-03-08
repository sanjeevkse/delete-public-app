import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type MetaEmploymentGroup from "./MetaEmploymentGroup";

interface MetaEmploymentAttributes {
  id: number;
  employmentGroupId?: number | null;
  dispName: string;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaEmploymentCreationAttributes = Optional<
  MetaEmploymentAttributes,
  "id" | "employmentGroupId" | "description" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaEmployment
  extends Model<MetaEmploymentAttributes, MetaEmploymentCreationAttributes>
  implements MetaEmploymentAttributes
{
  declare id: number;
  declare employmentGroupId?: number | null;
  declare dispName: string;
  declare description?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
  declare employmentGroup?: MetaEmploymentGroup | null;
}

MetaEmployment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    employmentGroupId: {
      field: "employment_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
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
    }
  },
  {
    sequelize,
    tableName: "tbl_meta_employment",
    timestamps: true,
    underscored: true
  }
);

export default MetaEmployment;
