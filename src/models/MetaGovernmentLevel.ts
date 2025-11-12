import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";

interface MetaGovernmentLevelAttributes {
  id: number;
  dispName: string;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaGovernmentLevelCreationAttributes = Optional<
  MetaGovernmentLevelAttributes,
  "id" | "description" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaGovernmentLevel
  extends Model<MetaGovernmentLevelAttributes, MetaGovernmentLevelCreationAttributes>
  implements MetaGovernmentLevelAttributes
{
  declare id: number;
  declare dispName: string;
  declare description?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

MetaGovernmentLevel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
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
    tableName: "tbl_meta_government_level",
    timestamps: true,
    underscored: true
  }
);

export default MetaGovernmentLevel;
