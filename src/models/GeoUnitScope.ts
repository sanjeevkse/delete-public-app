import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type { AccessScopeType } from "../types/geo";
import type GeoPolitical from "./GeoPolitical";

class GeoUnitScope extends Model<
  InferAttributes<GeoUnitScope, { omit: "geoUnit" }>,
  InferCreationAttributes<GeoUnitScope, { omit: "geoUnit" }>
> {
  declare id: CreationOptional<number>;
  declare geoUnitId: number;
  declare scopeType: Exclude<AccessScopeType, "GLOBAL">;
  declare scopeId: number;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare geoUnit?: NonAttribute<GeoPolitical>;
}

GeoUnitScope.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    geoUnitId: {
      field: "geo_unit_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    scopeType: {
      field: "scope_type",
      type: DataTypes.ENUM(
        "STATE",
        "DISTRICT",
        "MP_CONSTITUENCY",
        "MLA_CONSTITUENCY",
        "TALUK",
        "LOCAL_BODY",
        "HOBALI",
        "GRAM_PANCHAYAT",
        "MAIN_VILLAGE",
        "SUB_VILLAGE",
        "WARD",
        "POLLING_STATION",
        "BOOTH"
      ),
      allowNull: false
    },
    scopeId: {
      field: "scope_id",
      type: DataTypes.BIGINT.UNSIGNED,
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
    tableName: "tbl_geo_unit_scope",
    modelName: "GeoUnitScope",
    timestamps: false
  }
);

export default GeoUnitScope;
