import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MetaComplaintStatusAttributes {
  id: number;
  dispName: string;
  description?: string | null;
  colorCode?: string | null;
  displayOrder: number;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaComplaintStatusCreationAttributes
  extends Optional<
    MetaComplaintStatusAttributes,
    "id" | "createdBy" | "updatedBy" | "displayOrder"
  > {}

class MetaComplaintStatus
  extends Model<MetaComplaintStatusAttributes, MetaComplaintStatusCreationAttributes>
  implements MetaComplaintStatusAttributes
{
  public id!: number;
  public dispName!: string;
  public description?: string | null;
  public colorCode?: string | null;
  public displayOrder!: number;
  public status!: number;
  public createdBy?: number;
  public updatedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MetaComplaintStatus.init(
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
    colorCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "color_code"
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "display_order"
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
    tableName: "tbl_meta_complaint_status",
    timestamps: true,
    underscored: true
  }
);

export default MetaComplaintStatus;
