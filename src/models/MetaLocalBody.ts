import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";
import type { LocalBodyType } from "../types/geo";

interface MetaLocalBodyAttributes {
  id: number;
  dispName: string;
  bodyType: LocalBodyType;
  normalizedName?: string | null;
  stateId?: number | null;
  districtId?: number | null;
  talukId?: number | null;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaLocalBodyCreationAttributes
  extends Optional<
    MetaLocalBodyAttributes,
    | "id"
    | "normalizedName"
    | "stateId"
    | "districtId"
    | "talukId"
    | "description"
    | "createdBy"
    | "updatedBy"
    | "createdAt"
    | "updatedAt"
  > {}

class MetaLocalBody
  extends Model<MetaLocalBodyAttributes, MetaLocalBodyCreationAttributes>
  implements MetaLocalBodyAttributes
{
  declare id: number;
  declare dispName: string;
  declare bodyType: LocalBodyType;
  declare normalizedName: string | null;
  declare stateId: number | null;
  declare districtId: number | null;
  declare talukId: number | null;
  declare description: string | null;
  declare status: number;
  declare createdBy: number | null;
  declare updatedBy: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MetaLocalBody.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    bodyType: {
      field: "body_type",
      type: DataTypes.ENUM("GBA", "CC", "CMC", "TMC", "TP", "GP"),
      allowNull: false
    },
    normalizedName: {
      field: "normalized_name",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    stateId: {
      field: "state_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    districtId: {
      field: "district_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    talukId: {
      field: "taluk_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
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
    tableName: "tbl_meta_local_body",
    modelName: "MetaLocalBody",
    timestamps: false
  }
);

export default MetaLocalBody;
