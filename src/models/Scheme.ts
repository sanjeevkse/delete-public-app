import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type SchemeStep from "./SchemeStep";
import type MetaSchemeCategory from "./MetaSchemeCategory";
import type MetaSchemeSector from "./MetaSchemeSector";

class Scheme extends Model<
  InferAttributes<Scheme, { omit: "steps" | "schemeCategory" | "schemeSector" }>,
  InferCreationAttributes<Scheme, { omit: "steps" | "schemeCategory" | "schemeSector" }>
> {
  declare id: CreationOptional<number>;
  declare schemeCategoryId: number | null;
  declare schemeSectorId: number | null;
  declare dispName: string;
  declare description: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare steps?: NonAttribute<SchemeStep[]>;
  declare schemeCategory?: NonAttribute<MetaSchemeCategory>;
  declare schemeSector?: NonAttribute<MetaSchemeSector>;
}

Scheme.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    schemeCategoryId: {
      field: "scheme_category_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "tbl_meta_scheme_category",
        key: "id"
      }
    },
    schemeSectorId: {
      field: "scheme_sector_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "tbl_meta_scheme_sector",
        key: "id"
      }
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
    tableName: "tbl_scheme",
    modelName: "Scheme",
    timestamps: false
  }
);

export default Scheme;
