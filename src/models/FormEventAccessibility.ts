import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type FormEvent from "./FormEvent";
import type MetaWardNumber from "./MetaWardNumber";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaUserRole from "./MetaUserRole";

class FormEventAccessibility extends Model<
  InferAttributes<FormEventAccessibility, { omit: "formEvent" | "wardNumber" | "boothNumber" | "userRole" }>,
  InferCreationAttributes<FormEventAccessibility>
> {
  declare id: CreationOptional<number>;
  declare formEventId: number;
  declare wardNumberId: number;
  declare boothNumberId: number;
  declare userRoleId: number;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: CreationOptional<number | null>;
  declare updatedAt: CreationOptional<Date>;

  declare formEvent?: NonAttribute<FormEvent>;
  declare wardNumber?: NonAttribute<MetaWardNumber>;
  declare boothNumber?: NonAttribute<MetaBoothNumber>;
  declare userRole?: NonAttribute<MetaUserRole>;
}

FormEventAccessibility.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    formEventId: {
      field: "form_event_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    userRoleId: {
      field: "user_role_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
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
    tableName: "tbl_form_event_accessibility",
    modelName: "FormEventAccessibility",
    timestamps: true,
    underscored: true
  }
);

export default FormEventAccessibility;
