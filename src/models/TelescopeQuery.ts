import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TelescopeQueryAttributes {
  id: number;
  uuid: string;
  requestId: number | null;
  sql: string;
  bindings: object | null;
  duration: number;
  connectionName: string;
  createdAt: Date;
}

interface TelescopeQueryCreationAttributes
  extends Optional<TelescopeQueryAttributes, "id" | "createdAt" | "requestId" | "bindings"> {}

class TelescopeQuery
  extends Model<TelescopeQueryAttributes, TelescopeQueryCreationAttributes>
  implements TelescopeQueryAttributes
{
  declare id: number;
  declare uuid: string;
  declare requestId: number | null;
  declare sql: string;
  declare bindings: object | null;
  declare duration: number;
  declare connectionName: string;
  declare createdAt: Date;
}

TelescopeQuery.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    requestId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    sql: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    bindings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duration in milliseconds"
    },
    connectionName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "default"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "telescope_queries",
    timestamps: false,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["requestId"] },
      { fields: ["duration"] },
      { fields: ["createdAt"] }
    ]
  }
);

export default TelescopeQuery;
