import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from "sequelize";
import sequelize from "../config/database";

class Complaint extends Model<InferAttributes<Complaint>, InferCreationAttributes<Complaint>> {
  declare id: CreationOptional<number>;
  declare selfOther: "SELF" | "OTHER";
  declare sectorDepartmentId: number | null;
  declare complaintTypeId: number;
  declare wardNumberId: number | null;
  declare boothNumberId: number | null;
  declare currentStatusId: CreationOptional<number>;
  declare title: string;
  declare description: string | null;
  declare locationText: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare landmark: string | null;
  declare fullName: string;
  declare contactNumber: string;
  declare alternateContactNumber: string | null;
  declare email: string | null;
  declare fullAddress: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
}

Complaint.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    selfOther: {
      type: DataTypes.ENUM("SELF", "OTHER"),
      allowNull: false,
      field: "self_other"
    },
    sectorDepartmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "sector_department_id"
    },
    complaintTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "complaint_type_id"
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
    currentStatusId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: "current_status_id",
      comment: "Default status is 1 (Pending) from meta_complaint_status table"
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    locationText: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "location_text"
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    landmark: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: "full_name"
    },
    contactNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "contact_number"
    },
    alternateContactNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "alternate_contact_number"
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fullAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "full_address"
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
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
    }
  },
  {
    sequelize,
    tableName: "tbl_complaint",
    modelName: "Complaint",
    timestamps: false // we handle createdAt/updatedAt manually
  }
);

export default Complaint;
