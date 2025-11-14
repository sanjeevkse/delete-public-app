import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from "sequelize";
import sequelize from "../config/database";

class ComplaintStatusHistory extends Model<
  InferAttributes<ComplaintStatusHistory>,
  InferCreationAttributes<ComplaintStatusHistory>
> {
  declare id: CreationOptional<number>;
  declare complaintId: number;
  declare complaintStatusId: number;
  declare remarks: string | null;
  declare changedBy: number;
  declare changedAt: CreationOptional<Date>;
  declare status: CreationOptional<number>;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
}

ComplaintStatusHistory.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    complaintId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "complaint_id"
    },
    complaintStatusId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "complaint_status_id"
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "changed_by"
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "changed_at"
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
    tableName: "tbl_complaint_status_history",
    modelName: "ComplaintStatusHistory",
    timestamps: false
  }
);

export default ComplaintStatusHistory;
