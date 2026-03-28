import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import type { LocalBodyType, SettlementType } from "../types/geo";

interface GeoPoliticalAttributes {
  id: number;
  stateId: number;
  districtId?: number | null;
  talukId?: number | null;
  mpConstituencyId?: number | null;
  mlaConstituencyId?: number | null;
  settlementType?: SettlementType | null;
  governingBody?: LocalBodyType | null;
  localBodyId?: number | null;
  mainVillageId?: number | null;
  subVillageId?: number | null;
  wardNumberId?: number | null;
  pollingStationId?: number | null;
  boothNumberId?: number | null;
  zillaPanchayatId?: number | null;
  talukPanchayatId?: number | null;
  gramPanchayatId?: number | null;
  hobaliId?: number | null;
  status?: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GeoPoliticalCreationAttributes
  extends Optional<
    GeoPoliticalAttributes,
    | "id"
    | "districtId"
    | "talukId"
    | "mpConstituencyId"
    | "mlaConstituencyId"
    | "settlementType"
    | "governingBody"
    | "localBodyId"
    | "mainVillageId"
    | "subVillageId"
    | "wardNumberId"
    | "pollingStationId"
    | "boothNumberId"
    | "zillaPanchayatId"
    | "talukPanchayatId"
    | "gramPanchayatId"
    | "hobaliId"
    | "status"
    | "createdBy"
    | "updatedBy"
  > {}

class GeoPolitical
  extends Model<GeoPoliticalAttributes, GeoPoliticalCreationAttributes>
  implements GeoPoliticalAttributes
{
  public id!: number;
  public stateId!: number;
  public districtId!: number | null;
  public talukId!: number | null;
  public mpConstituencyId!: number | null;
  public mlaConstituencyId!: number | null;
  public settlementType!: SettlementType | null;
  public governingBody!: LocalBodyType | null;
  public localBodyId!: number | null;
  public mainVillageId!: number | null;
  public subVillageId!: number | null;
  public wardNumberId!: number | null;
  public pollingStationId!: number | null;
  public boothNumberId!: number | null;
  public zillaPanchayatId!: number | null;
  public talukPanchayatId!: number | null;
  public gramPanchayatId!: number | null;
  public hobaliId!: number | null;
  public status!: number;
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
      allowNull: true,
      field: "district_id"
    },
    talukId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "taluk_id"
    },
    settlementType: {
      type: DataTypes.ENUM("URBAN", "RURAL"),
      allowNull: true,
      field: "settlement_type"
    },
    mainVillageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "main_village_id"
    },
    subVillageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "sub_village_id"
    },
    mpConstituencyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "mp_constituency_id"
    },
    mlaConstituencyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "mla_constituency_id"
    },
    governingBody: {
      type: DataTypes.ENUM("GBA", "CC", "CMC", "TMC", "TP", "GP"),
      allowNull: true,
      field: "governing_body"
    },
    localBodyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "local_body_id"
    },
    wardNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "ward_number_id"
    },
    pollingStationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "polling_station_id"
    },
    boothNumberId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "booth_number_id"
    },
    zillaPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "zilla_panchayat_id"
    },
    talukPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "taluk_panchayat_id"
    },
    gramPanchayatId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "gram_panchayat_id"
    },
    hobaliId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "hobali_id"
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
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
