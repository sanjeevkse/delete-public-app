import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface NotificationRecipientAttributes {
  id: number;
  notificationLogId: number;
  userId: number;
  deviceTokenId: number | null;
  fcmResponse: Record<string, any> | null;
  status: "pending" | "success" | "failed";
  errorMessage: string | null;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}

interface NotificationRecipientCreationAttributes
  extends Optional<
    NotificationRecipientAttributes,
    | "id"
    | "deviceTokenId"
    | "fcmResponse"
    | "status"
    | "errorMessage"
    | "sentAt"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
  > {}

class NotificationRecipient
  extends Model<NotificationRecipientAttributes, NotificationRecipientCreationAttributes>
  implements NotificationRecipientAttributes
{
  declare id: number;
  declare notificationLogId: number;
  declare userId: number;
  declare deviceTokenId: number | null;
  declare fcmResponse: Record<string, any> | null;
  declare status: "pending" | "success" | "failed";
  declare errorMessage: string | null;
  declare sentAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare createdBy: number | null;
  declare updatedBy: number | null;
}

NotificationRecipient.init(
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
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "user_id"
    },
    deviceTokenId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "device_token_id"
    },
    fcmResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "fcm_response"
    },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed"),
      defaultValue: "pending",
      allowNull: false
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message"
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "sent_at"
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
    tableName: "tbl_notification_recipients",
    timestamps: true,
    underscored: true
  }
);

export default NotificationRecipient;
