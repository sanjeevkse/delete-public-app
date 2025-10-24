import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type MetaUserRole from "./MetaUserRole";
import type UserProfile from "./UserProfile";

import sequelize from "../config/database";

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare contactNumber: string;
  declare email: string | null;
  declare fullName: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare profile?: NonAttribute<UserProfile>;
  declare roles?: NonAttribute<MetaUserRole[]>;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      unique: true
    },
    fullName: {
      field: "full_name",
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
    tableName: "tbl_user",
    modelName: "User",
    underscored: false,
    timestamps: false
  }
);

export default User;
