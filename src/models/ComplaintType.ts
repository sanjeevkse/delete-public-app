import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  HasManyGetAssociationsMixin,
  BelongsToGetAssociationMixin
} from "sequelize";
import sequelize from "../config/database";
import type ComplaintTypeStep from "./ComplaintTypeSteps";
import type MetaComplaintDepartment from "./MetaComplaintDepartment";
import type MetaComplaintSector from "./MetaComplaintSector";

class ComplaintType extends Model<
  InferAttributes<ComplaintType, { omit: "steps" | "complaintDepartment" | "complaintSector" }>,
  InferCreationAttributes<
    ComplaintType,
    { omit: "steps" | "complaintDepartment" | "complaintSector" }
  >
> {
  declare id: CreationOptional<number>;
  declare dispName: string;
  declare description: string | null;
  declare complaintDepartmentId: number | null;
  declare complaintSectorId: number | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare steps?: NonAttribute<ComplaintTypeStep[]>;
  declare complaintDepartment?: NonAttribute<MetaComplaintDepartment>;
  declare complaintSector?: NonAttribute<MetaComplaintSector>;
  declare getSteps: HasManyGetAssociationsMixin<ComplaintTypeStep>;
  declare getComplaintDepartment: BelongsToGetAssociationMixin<MetaComplaintDepartment>;
  declare getComplaintSector: BelongsToGetAssociationMixin<MetaComplaintSector>;
}

ComplaintType.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dispName: {
      field: "disp_name",
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    complaintDepartmentId: {
      field: "complaint_department_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    complaintSectorId: {
      field: "complaint_sector_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
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
    tableName: "tbl_meta_complaint_type", // ✅ Correct table name
    modelName: "ComplaintType",
    timestamps: false
  }
);

export default ComplaintType;
