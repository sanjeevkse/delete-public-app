import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type MetaSubCasteCategory from "./MetaSubCasteCategory";

interface MetaSubCasteAttributes {
  id: number;
  dispName: string;
  categoryId?: number | null;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaSubCasteCreationAttributes = Optional<
  MetaSubCasteAttributes,
  "id" | "categoryId" | "description" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaSubCaste
  extends Model<MetaSubCasteAttributes, MetaSubCasteCreationAttributes>
  implements MetaSubCasteAttributes
{
  declare id: number;
  declare dispName: string;
  declare categoryId?: number | null;
  declare description?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
  declare category?: MetaSubCasteCategory | null;
}

MetaSubCaste.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(120),
      allowNull: false
    },
    categoryId: {
      field: "category_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
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
    tableName: "tbl_meta_sub_caste",
    timestamps: true,
    underscored: true
  }
);

export default MetaSubCaste;
