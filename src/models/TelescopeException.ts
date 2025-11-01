import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TelescopeExceptionAttributes {
  id: number;
  uuid: string;
  type: string;
  message: string;
  code: string | null;
  file: string | null;
  line: number | null;
  stackTrace: string | null;
  context: object | null;
  createdAt: Date;
}

interface TelescopeExceptionCreationAttributes
  extends Optional<TelescopeExceptionAttributes, "id" | "createdAt"> {}

class TelescopeException
  extends Model<TelescopeExceptionAttributes, TelescopeExceptionCreationAttributes>
  implements TelescopeExceptionAttributes
{
  declare id: number;
  declare uuid: string;
  declare type: string;
  declare message: string;
  declare code: string | null;
  declare file: string | null;
  declare line: number | null;
  declare stackTrace: string | null;
  declare context: object | null;
  declare createdAt: Date;
}

TelescopeException.init(
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
    type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    file: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    line: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    stackTrace: {
      type: DataTypes.TEXT("long"),
      allowNull: true
    },
    context: {
      type: DataTypes.JSON,
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
    tableName: "telescope_exceptions",
    timestamps: false,
    indexes: [{ fields: ["uuid"] }, { fields: ["type"] }, { fields: ["createdAt"] }]
  }
);

export default TelescopeException;
