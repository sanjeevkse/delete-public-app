import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type Form from "./Form";
import type FormFieldOption from "./FormFieldOption";
import type MetaFieldType from "./MetaFieldType";
import type MetaInputFormat from "./MetaInputFormat";

class FormField extends Model<
  InferAttributes<FormField, { omit: "form" | "fieldType" | "inputFormat" | "options" }>,
  InferCreationAttributes<FormField, { omit: "form" | "fieldType" | "inputFormat" | "options" }>
> {
  declare id: CreationOptional<number>;
  declare formId: number;
  declare fieldKey: string;
  declare label: string;
  declare helpText: CreationOptional<string | null>;
  declare fieldTypeId: number;
  declare inputFormatId: CreationOptional<number | null>;
  declare isRequired: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;
  declare placeholder: CreationOptional<string | null>;
  declare defaultValue: CreationOptional<string | null>;
  declare validationRegex: CreationOptional<string | null>;
  declare minLength: CreationOptional<number | null>;
  declare maxLength: CreationOptional<number | null>;
  declare minValue: CreationOptional<string | null>;
  declare maxValue: CreationOptional<string | null>;
  declare attrsJson: CreationOptional<Record<string, unknown> | null>;
  declare metaTable: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare form?: NonAttribute<Form>;
  declare fieldType?: NonAttribute<MetaFieldType>;
  declare inputFormat?: NonAttribute<MetaInputFormat | null>;
  declare options?: NonAttribute<FormFieldOption[]>;
}

FormField.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    formId: {
      field: "form_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    fieldKey: {
      field: "field_key",
      type: DataTypes.STRING(128),
      allowNull: false
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    helpText: {
      field: "help_text",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fieldTypeId: {
      field: "field_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    inputFormatId: {
      field: "input_format_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    isRequired: {
      field: "is_required",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    sortOrder: {
      field: "sort_order",
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    placeholder: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    defaultValue: {
      field: "default_value",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    validationRegex: {
      field: "validation_regex",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    minLength: {
      field: "min_length",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    maxLength: {
      field: "max_length",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    minValue: {
      field: "min_value",
      type: DataTypes.DECIMAL(20, 6),
      allowNull: true
    },
    maxValue: {
      field: "max_value",
      type: DataTypes.DECIMAL(20, 6),
      allowNull: true
    },
    attrsJson: {
      field: "attrs_json",
      type: DataTypes.JSON,
      allowNull: true
    },
    metaTable: {
      field: "meta_table",
      type: DataTypes.STRING(100),
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
    tableName: "tbl_form_field",
    timestamps: true,
    underscored: true
  }
);

export default FormField;
