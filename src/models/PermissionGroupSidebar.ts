import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class PermissionGroupSidebar extends Model {
  public permissionGroupId!: bigint;
  public sidebarId!: number;
  public status!: number;
  public createdBy?: bigint;
  public updatedBy?: bigint;
}

PermissionGroupSidebar.init(
  {
    permissionGroupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      field: "permission_group_id"
    },
    sidebarId: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      field: "sidebar_id"
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: "updated_by"
    }
  },
  {
    sequelize,
    modelName: "PermissionGroupSidebar",
    tableName: "tbl_xref_permission_group_sidebar",
    timestamps: true,
    underscored: true
  }
);

export default PermissionGroupSidebar;
