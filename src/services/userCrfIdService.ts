import { QueryTypes } from "sequelize";
import type { CreationAttributes, Transaction } from "sequelize";

import sequelize from "../config/database";
import User from "../models/User";

const CRF_ID_LOCKING_DIALECTS = new Set(["mysql", "mariadb"]);

const getMaxCrfIdForUpdate = async (transaction: Transaction): Promise<number> => {
  const dialect = sequelize.getDialect();

  if (CRF_ID_LOCKING_DIALECTS.has(dialect)) {
    const rows = await sequelize.query<{ maxCrfId: number }>(
      "SELECT COALESCE(MAX(crf_id), 0) AS maxCrfId FROM tbl_user FOR UPDATE",
      { transaction, type: QueryTypes.SELECT }
    );
    const maxCrfId = Number(rows[0]?.maxCrfId ?? 0);
    return Number.isFinite(maxCrfId) ? maxCrfId : 0;
  }

  const lastUser = await User.findOne({
    attributes: ["crfId"],
    order: [
      ["crfId", "DESC"],
      ["id", "DESC"]
    ],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const maxCrfId = Number(lastUser?.crfId ?? 0);
  return Number.isFinite(maxCrfId) ? maxCrfId : 0;
};

export const createUserWithGeneratedCrfId = async (
  attributes: Omit<CreationAttributes<User>, "crfId">
): Promise<User> => {
  return sequelize.transaction(async (transaction) => {
    const currentMaxCrfId = await getMaxCrfIdForUpdate(transaction);
    const nextCrfId = currentMaxCrfId + 1;

    return User.create(
      {
        ...attributes,
        crfId: nextCrfId
      },
      { transaction }
    );
  });
};
