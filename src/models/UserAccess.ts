import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import type User from "./User";
import type MetaUserRole from "./MetaUserRole";
import type MetaWardNumber from "./MetaWardNumber";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaMlaConstituency from "./MetaMlaConstituency";

class UserAccess extends Model<InferAttributes<UserAccess>, InferCreationAttributes<UserAccess>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare accessRoleId: number;
  declare stateId: CreationOptional<number | null>;
  declare districtId: CreationOptional<number | null>;
  declare talukId: CreationOptional<number | null>;
  declare mainVillageId: CreationOptional<number | null>;
  declare subVillageId: CreationOptional<number | null>;
  declare mpConstituencyId: CreationOptional<number | null>;
  declare mlaConstituencyId: CreationOptional<number | null>;
  declare wardNumberId: CreationOptional<number | null>;
  declare pollingStationId: CreationOptional<number | null>;
  declare boothNumberId: CreationOptional<number | null>;
  declare zillaPanchayatId: CreationOptional<number | null>;
  declare talukPanchayatId: CreationOptional<number | null>;
  declare gramPanchayatId: CreationOptional<number | null>;
  declare hobaliId: CreationOptional<number | null>;
  declare createdBy: number;
  declare updatedBy: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare status: CreationOptional<number>;

  // Associations
  declare user?: NonAttribute<User>;
  declare accessRole?: NonAttribute<MetaUserRole>;
  declare wardNumber?: NonAttribute<MetaWardNumber>;
  declare boothNumber?: NonAttribute<MetaBoothNumber>;
  declare mlaConstituency?: NonAttribute<MetaMlaConstituency>;
}

UserAccess.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "tbl_user",
        key: "id"
      }
    },
    accessRoleId: {
      field: "access_role_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "tbl_meta_user_role",
        key: "id"
      }
    },
    stateId: {
      field: "state_id",
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    districtId: {
      field: "district_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    talukId: {
      field: "taluk_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mainVillageId: {
      field: "main_village_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    subVillageId: {
      field: "sub_village_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mpConstituencyId: {
      field: "mp_constituency_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mlaConstituencyId: {
      field: "mla_constituency_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pollingStationId: {
      field: "polling_station_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    zillaPanchayatId: {
      field: "zilla_panchayat_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    talukPanchayatId: {
      field: "taluk_panchayat_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gramPanchayatId: {
      field: "gram_panchayat_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hobaliId: {
      field: "hobali_id",
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
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
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    sequelize,
    tableName: "tbl_user_access",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default UserAccess;
