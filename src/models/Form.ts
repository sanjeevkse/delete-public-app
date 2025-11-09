import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";
import type FormField from "./FormField";
import type FormMapping from "./FormMapping";

class Form extends Model<
  InferAttributes<Form, { omit: "fields" }>,
  InferCreationAttributes<Form, { omit: "fields" }>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare slug: CreationOptional<string | null>;
  declare isPublic: CreationOptional<number>;
  declare startAt: CreationOptional<Date | null>;
  declare endAt: CreationOptional<Date | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare fields?: FormField[];
  declare mappings?: FormMapping[];
}

Form.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(191),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    isPublic: {
      field: "is_public",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    startAt: {
      field: "start_at",
      type: DataTypes.DATE,
      allowNull: true
    },
    endAt: {
      field: "end_at",
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
    tableName: "tbl_form",
    timestamps: true,
    underscored: true
  }
);

export default Form;
