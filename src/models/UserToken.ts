import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import { UserTokenPlatform } from "../types/enums";
import type User from "./User";

class UserToken extends Model<
  InferAttributes<UserToken>,
  InferCreationAttributes<UserToken>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare token: string;
  declare deviceLabel: CreationOptional<string | null>;
  declare deviceFingerprint: CreationOptional<string | null>;
  declare platform: CreationOptional<UserTokenPlatform | null>;
  declare userAgent: CreationOptional<string | null>;
  declare ipAddress: CreationOptional<string | null>;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare revokeReason: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
}

UserToken.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    deviceLabel: {
      field: "device_label",
      type: DataTypes.STRING(100),
      allowNull: true
    },
    deviceFingerprint: {
      field: "device_fingerprint",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    platform: {
      type: DataTypes.ENUM(
        UserTokenPlatform.IOS,
        UserTokenPlatform.ANDROID,
        UserTokenPlatform.WEB,
        UserTokenPlatform.OTHER
      ),
      allowNull: true,
      defaultValue: UserTokenPlatform.ANDROID
    },
    userAgent: {
      field: "user_agent",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ipAddress: {
      field: "ip_address",
      type: DataTypes.STRING(45),
      allowNull: true
    },
    lastUsedAt: {
      field: "last_used_at",
      type: DataTypes.DATE,
      allowNull: true
    },
    revokedAt: {
      field: "revoked_at",
      type: DataTypes.DATE,
      allowNull: true
    },
    revokeReason: {
      field: "revoke_reason",
      type: DataTypes.STRING(191),
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
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "tbl_user_token",
    modelName: "UserToken",
    timestamps: false
  }
);

export default UserToken;
