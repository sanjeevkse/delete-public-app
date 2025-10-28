import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface GeoPoliticalAttributes {
  id: number;
  stateId: number;
  districtId: number;
  talukId: number;
  mainVillageId: number;
  subVillageId: number;
  mpConstituencyId: number;
  mlaConstituencyId: number;
  wardNumberId: number;
  pollingStationId: number;
  boothNumberId: number;
  zillaPanchayatId: number;
  talukPanchayatId: number;
  gramPanchayatId: number;
  hobaliId: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GeoPoliticalCreationAttributes
  extends Optional<GeoPoliticalAttributes, "id" | "createdBy" | "updatedBy"> {}

class GeoPolitical
  extends Model<GeoPoliticalAttributes, GeoPoliticalCreationAttributes>
  implements GeoPoliticalAttributes
{
  public id!: number;
  public stateId!: number;
  public districtId!: number;
  public talukId!: number;
  public mainVillageId!: number;
  public subVillageId!: number;
  public mpConstituencyId!: number;
  public mlaConstituencyId!: number;
  public wardNumberId!: number;
  public pollingStationId!: number;
  public boothNumberId!: number;
  public zillaPanchayatId!: number;
  public talukPanchayatId!: number;
  public gramPanchayatId!: number;
  public hobaliId!: number;
  public createdBy?: number;
  public updatedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GeoPolitical.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    stateId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "state_id"
    },
    districtId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "district_id"
    },
    talukId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "taluk_id"
    },
    mainVillageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "main_village_id"
    },
    subVillageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "sub_village_id"
    },
    mpConstituencyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "mp_constituency_id"
    },
    mlaConstituencyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "mla_constituency_id"
    },
    wardNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "ward_number_id"
    },
    pollingStationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "polling_station_id"
    },
    boothNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "booth_number_id"
    },
    zillaPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "zilla_panchayat_id"
    },
    talukPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "taluk_panchayat_id"
    },
    gramPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "gram_panchayat_id"
    },
    hobaliId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "hobali_id"
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
    tableName: "tbl_geo_political",
    timestamps: true,
    underscored: true
  }
);

export default GeoPolitical;
