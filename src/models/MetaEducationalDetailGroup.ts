import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type MetaEducationalDetail from "./MetaEducationalDetail";

interface MetaEducationalDetailGroupAttributes {
  id: number;
  dispName: string;
  color?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaEducationalDetailGroupCreationAttributes = Optional<
  MetaEducationalDetailGroupAttributes,
  "id" | "color" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaEducationalDetailGroup
  extends Model<MetaEducationalDetailGroupAttributes, MetaEducationalDetailGroupCreationAttributes>
  implements MetaEducationalDetailGroupAttributes
{
  declare id: number;
  declare dispName: string;
  declare color?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
  declare educationalDetail?: MetaEducationalDetail;
}

MetaEducationalDetailGroup.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      references: {
        model: "tbl_meta_educational_detail",
        key: "id"
      }
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
    tableName: "tbl_meta_educational_detail_group",
    timestamps: true,
    underscored: true
  }
);

export default MetaEducationalDetailGroup;
