import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type MetaEducationalDetail from "./MetaEducationalDetail";

interface MetaEducationalDetailGroupAttributes {
  id: number;
  dispName: string;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaEducationalDetailGroupCreationAttributes = Optional<
  MetaEducationalDetailGroupAttributes,
  "id" | "description" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaEducationalDetailGroup
  extends Model<MetaEducationalDetailGroupAttributes, MetaEducationalDetailGroupCreationAttributes>
  implements MetaEducationalDetailGroupAttributes
{
  declare id: number;
  declare dispName: string;
  declare description?: string | null;
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
      primaryKey: true,
      references: {
        model: "tbl_meta_educational_detail",
        key: "id"
      }
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
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
    tableName: "tbl_meta_educational_detail_group",
    timestamps: true,
    underscored: true
  }
);

export default MetaEducationalDetailGroup;
