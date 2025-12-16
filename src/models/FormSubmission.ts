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
  declare userId: number;
  declare submissionDate: CreationOptional<Date>;
  declare ipAddress: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
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
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    submissionDate: {
      field: "submission_date",
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
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "1=submitted, 2=reviewed, 3=rejected"
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: "tbl_form_submission",
    modelName: "FormSubmission",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["form_event_id"]
      },
      {
        fields: ["user_id"]
      },
      {
        fields: ["form_event_id", "user_id"]
      },
      {
        fields: ["status"]
      },
      {
        fields: ["submission_date"]
      }
    ]
  }
);

export default FormSubmission;
