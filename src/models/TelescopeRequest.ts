import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TelescopeRequestAttributes {
  id: number;
  uuid: string;
  method: string;
  path: string;
  fullUrl: string;
  statusCode: number;
  duration: number;
  ipAddress: string | null;
  userAgent: string | null;
  headers: object;
  queryParams: object;
  bodyParams: object;
  responseBody: object | null;
  responseHeaders: object | null;
  userId: number | null;
  exceptionId: number | null;
  createdAt: Date;
}

interface TelescopeRequestCreationAttributes
  extends Optional<TelescopeRequestAttributes, "id" | "createdAt" | "exceptionId"> {}

class TelescopeRequest
  extends Model<TelescopeRequestAttributes, TelescopeRequestCreationAttributes>
  implements TelescopeRequestAttributes
{
  declare id: number;
  declare uuid: string;
  declare method: string;
  declare path: string;
  declare fullUrl: string;
  declare statusCode: number;
  declare duration: number;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare headers: object;
  declare queryParams: object;
  declare bodyParams: object;
  declare responseBody: object | null;
  declare responseHeaders: object | null;
  declare userId: number | null;
  declare exceptionId: number | null;
  declare createdAt: Date;
}

TelescopeRequest.init(
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
    method: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    fullUrl: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duration in milliseconds"
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    headers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    queryParams: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    bodyParams: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    responseBody: {
      type: DataTypes.JSON,
      allowNull: true
    },
    responseHeaders: {
      type: DataTypes.JSON,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    exceptionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "telescope_requests",
    timestamps: false,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["method"] },
      { fields: ["statusCode"] },
      { fields: ["createdAt"] },
      { fields: ["userId"] },
      { fields: ["exceptionId"] }
    ]
  }
);

export default TelescopeRequest;
