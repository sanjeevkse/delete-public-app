import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type FormField from "./FormField";

class FormFieldOption extends Model<
  InferAttributes<FormFieldOption, { omit: "field" }>,
  InferCreationAttributes<FormFieldOption, { omit: "field" }>
> {
  declare id: CreationOptional<number>;
  declare fieldId: number;
  declare optionLabel: string;
  declare optionValue: string;
  declare sortOrder: CreationOptional<number>;
  declare isDefault: CreationOptional<number>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare field?: NonAttribute<FormField>;
}

FormFieldOption.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    fieldId: {
      field: "field_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    optionLabel: {
      field: "option_label",
      type: DataTypes.STRING(255),
      allowNull: false
    },
    optionValue: {
      field: "option_value",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    sortOrder: {
      field: "sort_order",
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isDefault: {
      field: "is_default",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
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
    tableName: "tbl_form_field_option",
    timestamps: true,
    underscored: true
  }
);

export default FormFieldOption;
