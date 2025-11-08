import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import sequelize from "../config/database";

class PaEvent extends Model<InferAttributes<PaEvent>, InferCreationAttributes<PaEvent>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string | null;
  declare startDate: Date;
  declare startTime: string;
  declare endDate: Date | null;
  declare endTime: string | null;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
  declare status: CreationOptional<number>;
}

PaEvent.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "start_time",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "end_date",
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: "end_time",
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: "tbl_pa_event",
    modelName: "PaEvent",
    timestamps: false,
  }
);

export default PaEvent;