import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface NotificationLogAttributes {
  id: number;
  notificationType: string;
  entityType: string | null;
  entityId: number | null;
  title: string;
  body: string;
  dataJson: Record<string, any> | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  fcmResponse: Record<string, any> | null;
  errorMessage: string | null;
  triggeredBy: number | null;
  sentAt: Date;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}

interface NotificationLogCreationAttributes
  extends Optional<
    NotificationLogAttributes,
    | "id"
    | "entityType"
    | "entityId"
    | "dataJson"
    | "recipientCount"
    | "successCount"
    | "failureCount"
    | "fcmResponse"
    | "errorMessage"
    | "triggeredBy"
    | "sentAt"
    | "status"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
  > {}

class NotificationLog
  extends Model<NotificationLogAttributes, NotificationLogCreationAttributes>
  implements NotificationLogAttributes
{
  declare id: number;
  declare notificationType: string;
  declare entityType: string | null;
  declare entityId: number | null;
  declare title: string;
  declare body: string;
  declare dataJson: Record<string, any> | null;
  declare recipientCount: number;
  declare successCount: number;
  declare failureCount: number;
  declare fcmResponse: Record<string, any> | null;
  declare errorMessage: string | null;
  declare triggeredBy: number | null;
  declare sentAt: Date;
  declare status: number;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare createdBy: number | null;
  declare updatedBy: number | null;
}

NotificationLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    notificationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "notification_type"
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "entity_type"
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "entity_id"
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dataJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "data_json"
    },
    recipientCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "recipient_count"
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "success_count"
    },
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "failure_count"
    },
    fcmResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "fcm_response"
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message"
    },
    triggeredBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "triggered_by"
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "sent_at"
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1
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
    tableName: "notification_logs",
    timestamps: true,
    underscored: true
  }
);

export default NotificationLog;
