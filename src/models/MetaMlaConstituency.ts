import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MetaMlaConstituencyAttributes {
  id: number;
  dispName: string;
  status: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetaMlaConstituencyCreationAttributes
  extends Optional<MetaMlaConstituencyAttributes, "id" | "createdBy" | "updatedBy"> {}

class MetaMlaConstituency
  extends Model<MetaMlaConstituencyAttributes, MetaMlaConstituencyCreationAttributes>
  implements MetaMlaConstituencyAttributes
{
  public id!: number;
  public dispName!: string;
  public status!: number;
  public createdBy?: number;
  public updatedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MetaMlaConstituency.init(
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
    tableName: "tbl_meta_mla_constituency",
    timestamps: true,
    underscored: true
  }
);

export default MetaMlaConstituency;
