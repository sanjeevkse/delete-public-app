import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type EventMedia from "./EventMedia";
import type EventRegistration from "./EventRegistration";

import sequelize from "../config/database";

class Event extends Model<InferAttributes<Event>, InferCreationAttributes<Event>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string;
  declare place: string;
  declare googleMapLink: string;
  declare latitude: number | null;
  declare longitude: number | null;
  declare startDate: Date;
  declare startTime: string;
  declare endDate: Date;
  declare endTime: string;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare media?: NonAttribute<EventMedia[]>;
  declare registrations?: NonAttribute<EventRegistration[]>;
}

Event.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    place: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    googleMapLink: {
      field: "google_map_link",
      type: DataTypes.STRING(500),
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    startDate: {
      field: "start_date",
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      field: "start_time",
      type: DataTypes.TIME,
      allowNull: false
    },
    endDate: {
      field: "end_date",
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endTime: {
      field: "end_time",
      type: DataTypes.TIME,
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
    tableName: "tbl_event",
    modelName: "Event",
    timestamps: false
  }
);

export default Event;
