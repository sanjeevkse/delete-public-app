import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface DeviceTokenAttributes {
  id: number;
  userId: number;
  token: string;
  deviceId?: string;
  platform?: "ios" | "android" | "web";
  isActive: boolean;
  lastUsedAt?: Date;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DeviceTokenCreationAttributes
  extends Optional<
    DeviceTokenAttributes,
    "id" | "isActive" | "status" | "createdAt" | "updatedAt"
  > {}

class DeviceToken
  extends Model<DeviceTokenAttributes, DeviceTokenCreationAttributes>
  implements DeviceTokenAttributes
{
  declare id: number;
  declare userId: number;
  declare token: string;
  declare deviceId?: string;
  declare platform?: "ios" | "android" | "web";
  declare isActive: boolean;
  declare lastUsedAt?: Date;
  declare status: number;
  declare createdBy?: number;
  declare updatedBy?: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

DeviceToken.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "user_id",
      references: {
        model: "tbl_user",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true
    },
    deviceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "device_id"
    },
    platform: {
      type: DataTypes.ENUM("ios", "android", "web"),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active"
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_used_at"
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "tbl_device_token",
    timestamps: false
  }
);

export default DeviceToken;
