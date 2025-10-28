import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MetaBoothNumberAttributes {
  id: number;
  mlaConstituencyId: number;
  dispName: string;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaBoothNumberCreationAttributes
  extends Optional<MetaBoothNumberAttributes, "id" | "createdBy" | "updatedBy"> {}

class MetaBoothNumber
  extends Model<MetaBoothNumberAttributes, MetaBoothNumberCreationAttributes>
  implements MetaBoothNumberAttributes
{
  public id!: number;
  public mlaConstituencyId!: number;
  public dispName!: string;
  public status!: number;
  public createdBy?: number;
  public updatedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MetaBoothNumber.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    mlaConstituencyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "mla_constituency_id",
      references: {
        model: "tbl_meta_mla_constituency",
        key: "id"
      }
    },
    dispName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "disp_name"
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
    tableName: "tbl_meta_booth_number",
    timestamps: true,
    underscored: true
  }
);

export default MetaBoothNumber;
