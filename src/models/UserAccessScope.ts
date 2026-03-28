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
import type { AccessScopeType, LocalBodyType, SettlementType } from "../types/geo";

class UserAccessScope extends Model<
  InferAttributes<UserAccessScope, { omit: "user" | "accessRole" }>,
  InferCreationAttributes<UserAccessScope, { omit: "user" | "accessRole" }>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare accessRoleId: number;
  declare scopeType: AccessScopeType;
  declare scopeId: number;
  declare settlementType: CreationOptional<SettlementType | null>;
  declare localBodyType: CreationOptional<LocalBodyType | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare accessRole?: NonAttribute<MetaUserRole>;
}

UserAccessScope.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    accessRoleId: {
      field: "access_role_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    scopeType: {
      field: "scope_type",
      type: DataTypes.ENUM(
        "GLOBAL",
        "STATE",
        "DISTRICT",
        "MP_CONSTITUENCY",
        "MLA_CONSTITUENCY",
        "TALUK",
        "LOCAL_BODY",
        "HOBALI",
        "GRAM_PANCHAYAT",
        "MAIN_VILLAGE",
        "SUB_VILLAGE",
        "WARD",
        "POLLING_STATION",
        "BOOTH"
      ),
      allowNull: false
    },
    scopeId: {
      field: "scope_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    settlementType: {
      field: "settlement_type",
      type: DataTypes.ENUM("URBAN", "RURAL"),
      allowNull: true
    },
    localBodyType: {
      field: "local_body_type",
      type: DataTypes.ENUM("GBA", "CC", "CMC", "TMC", "TP", "GP"),
      allowNull: true
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
    tableName: "tbl_user_access_scope",
    modelName: "UserAccessScope",
    timestamps: false
  }
);

export default UserAccessScope;
