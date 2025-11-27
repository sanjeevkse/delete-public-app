import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MetaTableRegistryAttributes {
  id: number;
  name: string;
  tableName: string;
  displayName: string;
  modelName: string;
  description?: string;
  primaryKey: string;
  searchableFields: string[];
  hasStatus: number;
  customIncludes?: Array<{
    association: string;
    attributes: string[];
  }>;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaTableRegistryCreationAttributes
  extends Optional<
    MetaTableRegistryAttributes,
    | "id"
    | "description"
    | "primaryKey"
    | "hasStatus"
    | "customIncludes"
    | "status"
    | "createdAt"
    | "updatedAt"
  > {}

class MetaTableRegistry extends Model<
  MetaTableRegistryAttributes,
  MetaTableRegistryCreationAttributes
> {
  declare id: number;
  declare name: string;
  declare tableName: string;
  declare displayName: string;
  declare modelName: string;
  declare description?: string;
  declare primaryKey: string;
  declare searchableFields: string[];
  declare hasStatus: number;
  declare customIncludes?: Array<{
    association: string;
    attributes: string[];
  }>;
  declare status: number;
  declare createdBy?: number;
  declare updatedBy?: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

MetaTableRegistry.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: "Camel case identifier (e.g., businessType)"
    },
    tableName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "table_name",
      comment: "Actual database table name (e.g., meta_business_types)"
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "display_name",
      comment: "Human-readable name for UI"
    },
    modelName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "model_name",
      comment: "Sequelize model class name (e.g., MetaBusinessType)"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description of what this table stores"
    },
    primaryKey: {
      type: DataTypes.STRING(50),
      defaultValue: "id",
      field: "primary_key",
      comment: "Primary key field name"
    },
    searchableFields: {
      type: DataTypes.JSON,
      allowNull: false,
      field: "searchable_fields",
      comment: "Array of field names that can be searched"
    },
    hasStatus: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      field: "has_status",
      comment: "Whether table has status field"
    },
    customIncludes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "custom_includes",
      comment: "Array of associations to include in queries"
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "1=active, 0=inactive"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by"
    }
  },
  {
    sequelize,
    tableName: "tbl_meta_table_registry",
    timestamps: true,
    underscored: true
  }
);

export default MetaTableRegistry;
