import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  HasManyGetAssociationsMixin
} from "sequelize";
import sequelize from "../config/database";
import type ComplaintTypeStep from "./ComplaintTypeSteps";

class ComplaintType extends Model<
  InferAttributes<ComplaintType, { omit: "steps" }>,
  InferCreationAttributes<ComplaintType, { omit: "steps" }>
> {
  declare id: CreationOptional<number>;
  declare dispName: string;
  declare description: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Association
  declare steps?: NonAttribute<ComplaintTypeStep[]>;
  declare getSteps: HasManyGetAssociationsMixin<ComplaintTypeStep>;
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
