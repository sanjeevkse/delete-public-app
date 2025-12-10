import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type MetaPermissionGroup from "./MetaPermissionGroup";

class Sidebar extends Model<InferAttributes<Sidebar>, InferCreationAttributes<Sidebar>> {
  declare id: CreationOptional<number>;
  declare dispName: string;
  declare screenName: string;
  declare icon: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number>;
  declare updatedBy: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare permissionGroups?: NonAttribute<MetaPermissionGroup[]>;
}

Sidebar.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.TEXT,
      allowNull: false
    },
    screenName: {
      field: "screen_name",
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    icon: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    sequelize,
    tableName: "tbl_sidebar",
    modelName: "Sidebar",
    timestamps: false
  }
);

export default Sidebar;
