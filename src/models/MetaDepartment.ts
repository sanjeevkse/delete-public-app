import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MetaDepartmentAttributes {
  id: number;
  dispName: string;
  description?: string | null;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaDepartmentCreationAttributes
  extends Optional<MetaDepartmentAttributes, "id" | "createdBy" | "updatedBy"> {}

class MetaDepartment
  extends Model<MetaDepartmentAttributes, MetaDepartmentCreationAttributes>
  implements MetaDepartmentAttributes
{
  public id!: number;
  public dispName!: string;
  public description?: string | null;
  public status!: number;
  public createdBy?: number;
  public updatedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MetaDepartment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dispName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "disp_name"
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "1=active, 0=inactive"
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "updated_by"
    }
  },
  {
    sequelize,
    tableName: "tbl_meta_complaint_department",
    timestamps: true,
    underscored: true
  }
);

export default MetaDepartment;
