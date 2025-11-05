import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model
} from "sequelize";
import sequelize from "../config/database";

class Complaint extends Model<
  InferAttributes<Complaint>,
  InferCreationAttributes<Complaint>
> {
  declare id: CreationOptional<number>;
  declare selfOther: "SELF" | "OTHER";
  declare complaintTypeId: number;
  declare title: string;
  declare description: string | null;
  declare locationText: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare landmark: string | null;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
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
      field: "self_other",
      type: DataTypes.ENUM("SELF", "OTHER"),
      allowNull: false
    },
    complaintTypeId: {
      field: "complaint_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
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
      field: "location_text",
      type: DataTypes.STRING(255),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    landmark: {
      type: DataTypes.STRING(255),
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
    tableName: "tbl_complaint",
    modelName: "Complaint",
    timestamps: false
  }
);

export default Complaint;
