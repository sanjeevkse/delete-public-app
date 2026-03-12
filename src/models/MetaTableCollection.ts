import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";

interface MetaTableCollectionAttributes {
  id: number;
  name: string;
  dispName: string;
  description?: string | null;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaTableCollectionCreationAttributes = Optional<
  MetaTableCollectionAttributes,
  "id" | "description" | "status" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaTableCollection
  extends Model<MetaTableCollectionAttributes, MetaTableCollectionCreationAttributes>
  implements MetaTableCollectionAttributes
{
  declare id: number;
  declare name: string;
  declare dispName: string;
  declare description?: string | null;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

MetaTableCollection.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
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
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "tbl_meta_table_collection",
    timestamps: true,
    underscored: true
  }
);

export default MetaTableCollection;
