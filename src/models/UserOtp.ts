import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";
import { UserOtpPurpose } from "../types/enums";

class UserOtp extends Model<
  InferAttributes<UserOtp>,
  InferCreationAttributes<UserOtp>
> {
  declare id: CreationOptional<number>;
  declare contactNumber: string;
  declare purpose: UserOtpPurpose;
  declare otpPlain: string;
  declare expiresAt: Date;
  declare attemptsLeft: CreationOptional<number>;
  declare consumedAt: CreationOptional<Date | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UserOtp.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(45),
      allowNull: false
    },
    purpose: {
      type: DataTypes.ENUM(
        UserOtpPurpose.LOGIN,
        UserOtpPurpose.TWO_FACTOR,
        UserOtpPurpose.PASSWORD_RESET
      ),
      allowNull: false,
      defaultValue: UserOtpPurpose.LOGIN
    },
    otpPlain: {
      field: "otp_plain",
      type: DataTypes.STRING(10),
      allowNull: false
    },
    expiresAt: {
      field: "expires_at",
      type: DataTypes.DATE,
      allowNull: false
    },
    attemptsLeft: {
      field: "attempts_left",
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    consumedAt: {
      field: "consumed_at",
      type: DataTypes.DATE,
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
    tableName: "tbl_user_otp",
    modelName: "UserOtp",
    timestamps: false
  }
);

export default UserOtp;
