import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";
import Scheme from "./Scheme";

class SchemeStep extends Model<InferAttributes<SchemeStep>, InferCreationAttributes<SchemeStep>> {
  declare id: CreationOptional<number>;
  declare schemeId: ForeignKey<Scheme["id"]>;
  declare stepOrder: number;
  declare dispName: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SchemeStep.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    schemeId: {
      field: "scheme_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "tbl_scheme",
        key: "id"
      }
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
    }
  },
  {
    sequelize,
    tableName: "tbl_scheme_step",
    timestamps: true,
    underscored: true
  }
);

export default SchemeStep;
