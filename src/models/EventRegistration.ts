import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type Event from "./Event";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaWardNumber from "./MetaWardNumber";
import type MetaDesignation from "./MetaDesignation";
import type User from "./User";

import sequelize from "../config/database";

class EventRegistration extends Model<
  InferAttributes<EventRegistration>,
  InferCreationAttributes<EventRegistration>
> {
  declare id: CreationOptional<number>;
  declare eventId: number;
  declare userId: number | null;
  declare fullName: CreationOptional<string | null>;
  declare contactNumber: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare registeredBy: CreationOptional<string | null>;
  declare fullAddress: CreationOptional<string | null>;
  declare wardNumberId: CreationOptional<number | null>;
  declare boothNumberId: CreationOptional<number | null>;
  declare designationId: CreationOptional<number | null>;
  declare dateOfBirth: CreationOptional<Date | null>;
  declare age: CreationOptional<number | null>;
  declare status: CreationOptional<number>;
  declare deregisterReason: CreationOptional<string | null>;
  declare deregisteredAt: CreationOptional<Date | null>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare event?: NonAttribute<Event>;
  declare user?: NonAttribute<User>;
  declare wardNumber?: NonAttribute<MetaWardNumber | null>;
  declare boothNumber?: NonAttribute<MetaBoothNumber | null>;
  declare designation?: NonAttribute<MetaDesignation | null>;
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
      allowNull: true
    },
    fullName: {
      field: "full_name",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      field: "email",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    registeredBy: {
      field: "registered_by",
      type: DataTypes.TEXT,
      allowNull: true
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
      allowNull: true
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    designationId: {
      field: "designation_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    dateOfBirth: {
      field: "date_of_birth",
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    age: {
      field: "age",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
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
