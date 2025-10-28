import {
  CreationOptional,
  DataTypes,
  InferAttributes,
 InferCreationAttributes,
  Model
} from "sequelize";

import sequelize from "../config/database";

class Scheme extends Model<InferAttributes<Scheme>, InferCreationAttributes<Scheme>> {
  declare id: CreationOptional<number>;
  declare schemeName: string;
  declare description: string;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Scheme.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    schemeName: {
      field: "scheme_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
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
    tableName: "tbl_scheme",
    modelName: "Scheme",
    timestamps: false
  }
);

export default Scheme;
