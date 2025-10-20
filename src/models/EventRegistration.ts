import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type Event from "./Event";
import type User from "./User";

import sequelize from "../config/database";

class EventRegistration extends Model<
  InferAttributes<EventRegistration>,
  InferCreationAttributes<EventRegistration>
> {
  declare id: CreationOptional<number>;
  declare eventId: number;
  declare userId: number;
  declare status: CreationOptional<number>;
  declare deregisterReason: CreationOptional<string | null>;
  declare deregisteredAt: CreationOptional<Date | null>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare event?: NonAttribute<Event>;
  declare user?: NonAttribute<User>;
}

EventRegistration.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    eventId: {
      field: "event_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    deregisterReason: {
      field: "deregister_reason",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    deregisteredAt: {
      field: "deregistered_at",
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: "tbl_event_registration",
    modelName: "EventRegistration",
    timestamps: false
  }
);

export default EventRegistration;
