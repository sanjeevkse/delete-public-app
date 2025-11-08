import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  BelongsToGetAssociationMixin
} from "sequelize";
import sequelize from "../config/database";
import type ComplaintType from "./ComplaintType";

class ComplaintTypeStep extends Model<
  InferAttributes<ComplaintTypeStep>,
  InferCreationAttributes<ComplaintTypeStep>
> {
  declare id: CreationOptional<number>;
  declare complaintTypeId: number;
  declare stepOrder: number;
  declare dispName: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Association
  declare complaintType?: NonAttribute<ComplaintType>;
  declare getComplaintType: BelongsToGetAssociationMixin<ComplaintType>;
}

ComplaintTypeStep.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    complaintTypeId: {
      field: "complaint_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    stepOrder: {
      field: "step_order",
      type: DataTypes.INTEGER,
      allowNull: false
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
    tableName: "tbl_meta_complaint_type_step", // ✅ Correct table name
    modelName: "ComplaintTypeStep",
    timestamps: false
  }
);

export default ComplaintTypeStep;
