import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type MetaEducationalDetailGroup from "./MetaEducationalDetailGroup";

interface MetaEducationalDetailAttributes {
  id: number;
  educationalDetailGroupId: number;
  dispName: string;
  color?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaEducationalDetailCreationAttributes = Optional<
  MetaEducationalDetailAttributes,
  "id" | "color" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaEducationalDetail
  extends Model<MetaEducationalDetailAttributes, MetaEducationalDetailCreationAttributes>
  implements MetaEducationalDetailAttributes
{
  declare id: number;
  declare educationalDetailGroupId: number;
  declare dispName: string;
  declare color?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
  declare educationalDetailGroup?: MetaEducationalDetailGroup;
}

MetaEducationalDetail.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    educationalDetailGroupId: {
      field: "educational_detail_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.TEXT,
      allowNull: false
    },
    color: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "tbl_meta_educational_detail",
    timestamps: true,
    underscored: true
  }
);

export default MetaEducationalDetail;
