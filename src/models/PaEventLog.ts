import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from "sequelize";
import sequelize from "../config/database";

class PaEventLog extends Model<InferAttributes<PaEventLog>, InferCreationAttributes<PaEventLog>> {
  declare id: CreationOptional<number>;
  declare eventId: number;
  declare oldJson: Record<string, unknown> | null;
  declare newJson: Record<string, unknown> | null;
  declare createdBy: number | null;
  declare status: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
}

PaEventLog.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "event_id"
    },
    oldJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "old_json"
    },
    newJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "new_json"
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by"
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "tbl_pa_event_log",
    modelName: "PaEventLog",
    timestamps: false
  }
);

export default PaEventLog;
