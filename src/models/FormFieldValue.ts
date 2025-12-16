import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type FormSubmission from "./FormSubmission";
import type FormField from "./FormField";

class FormFieldValue extends Model<
  InferAttributes<FormFieldValue, { omit: "formSubmission" | "formField" }>,
  InferCreationAttributes<FormFieldValue, { omit: "formSubmission" | "formField" }>
> {
  declare id: CreationOptional<number>;
  declare formSubmissionId: number;
  declare formFieldId: number;
  declare fieldKey: string;
  declare value: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare formSubmission?: NonAttribute<FormSubmission>;
  declare formField?: NonAttribute<FormField>;
}

FormFieldValue.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    formSubmissionId: {
      field: "form_submission_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    formFieldId: {
      field: "form_field_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    fieldKey: {
      field: "field_key",
      type: DataTypes.STRING(128),
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT("long"),
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
    tableName: "tbl_form_field_value",
    modelName: "FormFieldValue",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["form_submission_id"]
      },
      {
        fields: ["form_field_id"]
      },
      {
        fields: ["field_key"]
      }
    ]
  }
);

export default FormFieldValue;
