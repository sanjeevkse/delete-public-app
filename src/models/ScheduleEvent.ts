import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute
} from "sequelize";
import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber } from "../utils/phoneNumber";
import type MetaEventType from "./MetaEventType";
import type MetaColor from "./MetaColor";
import type GeoPolitical from "./GeoPolitical";

class ScheduleEvent extends Model<InferAttributes<ScheduleEvent>, InferCreationAttributes<ScheduleEvent>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string | null;
  declare eventTypeId: number | null;
  declare colorId: number | null;
  declare eventSubName: string | null;
  declare eventAddress: string | null;
  declare eventReferralPersonName: string | null;
  declare referralContactNumber: string | null;
  declare contactPersonRelationship: string | null;
  declare priority: string | null;
  declare start: Date;
  declare end: Date;
  declare allDay: CreationOptional<number>;
  declare locationText: string | null;
  declare latitude: number;
  declare longitude: number;
  declare geoUnitId: number | null;
  declare wardNumberId: number | null;
  declare boothNumberId: number | null;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
  declare status: CreationOptional<number>;
  declare eventType?: NonAttribute<MetaEventType | null>;
  declare color?: NonAttribute<MetaColor | null>;
  declare geoUnit?: NonAttribute<GeoPolitical | null>;
}

ScheduleEvent.init(
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
      allowNull: true
    },
    eventTypeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "event_type_id"
    },
    colorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "color_id"
    },
    eventSubName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "event_sub_name"
    },
    eventAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "event_address"
    },
    eventReferralPersonName: {
      type: DataTypes.STRING(191),
      allowNull: true,
      field: "event_referral_person_name"
    },
    referralContactNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "referral_contact_number",
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "referralContactNumber");
        this.setDataValue("referralContactNumber", normalized);
      }
    },
    contactPersonRelationship: {
      type: DataTypes.STRING(191),
      allowNull: true,
      field: "contact_person_relationship"
    },
    priority: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_at"
    },
    end: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_at"
    },
    allDay: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      field: "all_day"
    },
    locationText: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "location_text"
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      }
    },
    geoUnitId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "geo_unit_id"
    },
    wardNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "ward_number_id"
    },
    boothNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "booth_number_id"
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by"
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
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    sequelize,
    tableName: "tbl_schedule_event",
    modelName: "ScheduleEvent",
    timestamps: false
  }
);

export default ScheduleEvent;
