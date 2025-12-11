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
import type FormEventAccessibility from "./FormEventAccessibility";

class FormEvent extends Model<
  InferAttributes<FormEvent, { omit: "form" | "accessibility" }>,
  InferCreationAttributes<FormEvent, { omit: "form" | "accessibility" }>
> {
  declare id: CreationOptional<number>;
  declare formId: number;
  declare title: string;
  declare description: string;
  declare startDate: string;
  declare endDate: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: CreationOptional<number | null>;
  declare updatedAt: CreationOptional<Date>;

  declare form?: NonAttribute<Form>;
  declare accessibility?: NonAttribute<FormEventAccessibility[]>;
}

FormEvent.init(
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
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    startDate: {
      field: "start_date",
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      field: "end_date",
      type: DataTypes.DATEONLY,
      allowNull: true
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
    tableName: "tbl_form_event",
    modelName: "FormEvent",
    timestamps: true,
    underscored: true
  }
);

export default FormEvent;
