import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";
import MetaSchemeType from "./MetaSchemeType";

class MetaSchemeTypeStep extends Model<
  InferAttributes<MetaSchemeTypeStep>,
  InferCreationAttributes<MetaSchemeTypeStep>
> {
  declare id: CreationOptional<number>;
  declare schemeTypeId: ForeignKey<MetaSchemeType["id"]>;
  declare stepOrder: number;
  declare dispName: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

MetaSchemeTypeStep.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    schemeTypeId: {
      field: "scheme_type_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    stepOrder: {
      field: "step_order",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
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
    updatedBy: {
      field: "updated_by",
      type: DataTypes.INTEGER.UNSIGNED,
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
    tableName: "tbl_meta_scheme_type_step",
    timestamps: true,
    underscored: true
  }
);

export default MetaSchemeTypeStep;
