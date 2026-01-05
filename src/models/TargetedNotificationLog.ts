import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TargetedNotificationLogAttributes {
  id: number;
  notificationLogId: number;
  wardNumberId: number | null;
  boothNumberId: number | null;
  roleId: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}

interface TargetedNotificationLogCreationAttributes
  extends Optional<
    TargetedNotificationLogAttributes,
    | "id"
    | "wardNumberId"
    | "boothNumberId"
    | "roleId"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
  > {}

class TargetedNotificationLog
  extends Model<TargetedNotificationLogAttributes, TargetedNotificationLogCreationAttributes>
  implements TargetedNotificationLogAttributes
{
  declare id: number;
  declare notificationLogId: number;
  declare wardNumberId: number | null;
  declare boothNumberId: number | null;
  declare roleId: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare createdBy: number | null;
  declare updatedBy: number | null;
}

TargetedNotificationLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    notificationLogId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "notification_log_id"
    },
    wardNumberId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "ward_number_id"
    },
    boothNumberId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "booth_number_id"
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "role_id"
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by"
    }
  },
  {
    sequelize,
    tableName: "tbl_targeted_notification_logs",
    timestamps: true,
    underscored: true
  }
);

export default TargetedNotificationLog;
