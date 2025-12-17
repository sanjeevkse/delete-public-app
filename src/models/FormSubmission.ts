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
import type User from "./User";
import type FormFieldValue from "./FormFieldValue";

class FormSubmission extends Model<
  InferAttributes<FormSubmission, { omit: "formEvent" | "user" | "fieldValues" }>,
  InferCreationAttributes<FormSubmission, { omit: "formEvent" | "user" | "fieldValues" }>
> {
  declare id: CreationOptional<number>;
  declare formEventId: number;
  declare submittedBy: CreationOptional<number | null>;
  declare submittedAt: CreationOptional<Date>;
  declare ipAddress: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: CreationOptional<number | null>;
  declare updatedAt: CreationOptional<Date>;

  declare formEvent?: NonAttribute<FormEvent>;
  declare user?: NonAttribute<User>;
  declare fieldValues?: NonAttribute<FormFieldValue[]>;
}

FormSubmission.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    formEventId: {
      field: "form_event_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    submittedBy: {
      field: "submitted_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    submittedAt: {
      field: "submitted_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ipAddress: {
      field: "ip_address",
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      field: "user_agent",
      type: DataTypes.STRING(512),
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
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.BIGINT.UNSIGNED,
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
    tableName: "tbl_form_submission",
    modelName: "FormSubmission",
    timestamps: true,
    underscored: true
  }
);

export default FormSubmission;
