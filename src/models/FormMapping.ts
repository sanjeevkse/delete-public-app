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
import type MetaWardNumber from "./MetaWardNumber";
import type MetaBoothNumber from "./MetaBoothNumber";

class FormMapping extends Model<
  InferAttributes<FormMapping>,
  InferCreationAttributes<FormMapping>
> {
  declare id: CreationOptional<number>;
  declare formId: number;
  declare wardNumberId: CreationOptional<number | null>;
  declare boothNumberId: CreationOptional<number | null>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare status: CreationOptional<number>;

  declare form?: NonAttribute<Form>;
  declare wardNumber?: NonAttribute<MetaWardNumber>;
  declare boothNumber?: NonAttribute<MetaBoothNumber>;
}

FormMapping.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    formId: {
      field: "form_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "tbl_form",
        key: "id"
      }
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "tbl_meta_ward_number",
        key: "id"
      }
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "tbl_meta_booth_number",
        key: "id"
      }
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
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    sequelize,
    tableName: "tbl_form_mapping",
    timestamps: true,
    underscored: true
  }
);

export default FormMapping;
