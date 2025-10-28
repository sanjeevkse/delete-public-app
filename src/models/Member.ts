import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";

class Member extends Model<InferAttributes<Member>, InferCreationAttributes<Member>> {
  declare id: CreationOptional<number>;
  declare fullName: string;
  declare contactNumber: string;
  declare email: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Member.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    fullName: {
      field: "full_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "tbl_member",
    timestamps: true,
    underscored: true
  }
);

export default Member;
