import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class RoleSidebar extends Model {
  public roleId!: bigint;
  public sidebarId!: number;
  public status!: number;
  public createdBy?: bigint;
  public updatedBy?: bigint;
}

RoleSidebar.init(
  {
    roleId: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      field: "role_id"
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
    modelName: "RoleSidebar",
    tableName: "tbl_xref_role_sidebar",
    timestamps: true,
    underscored: true
  }
);

export default RoleSidebar;
