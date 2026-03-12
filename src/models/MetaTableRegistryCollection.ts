import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../config/database";

interface MetaTableRegistryCollectionAttributes {
  id: number;
  collectionId: number;
  registryId: number;
  status: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MetaTableRegistryCollectionCreationAttributes = Optional<
  MetaTableRegistryCollectionAttributes,
  "id" | "status" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>;

class MetaTableRegistryCollection
  extends Model<MetaTableRegistryCollectionAttributes, MetaTableRegistryCollectionCreationAttributes>
  implements MetaTableRegistryCollectionAttributes
{
  declare id: number;
  declare collectionId: number;
  declare registryId: number;
  declare status: number;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

MetaTableRegistryCollection.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    collectionId: {
      field: "collection_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    registryId: {
      field: "registry_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
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
    tableName: "tbl_meta_table_registry_collection",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "uk_meta_table_registry_collection",
        unique: true,
        fields: ["collection_id", "registry_id"]
      },
      {
        name: "idx_meta_table_registry_collection_collection_id",
        fields: ["collection_id"]
      },
      {
        name: "idx_meta_table_registry_collection_registry_id",
        fields: ["registry_id"]
      }
    ]
  }
);

export default MetaTableRegistryCollection;
