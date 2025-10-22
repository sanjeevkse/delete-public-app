/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const { DataTypes } = Sequelize;

    try {
      await queryInterface.addColumn(
        "tbl_user_otp",
        "contact_number",
        {
          type: DataTypes.STRING(45),
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE tbl_user_otp otp
        INNER JOIN tbl_user u ON otp.user_id = u.id
        SET otp.contact_number = u.contact_number
        `,
        { transaction }
      );

      await queryInterface.changeColumn(
        "tbl_user_otp",
        "contact_number",
        {
          type: DataTypes.STRING(45),
          allowNull: false
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "tbl_user_otp",
        ["contact_number"],
        {
          name: "idx_user_otp_contact_number",
          transaction
        }
      );

      await queryInterface.removeConstraint("tbl_user_otp", "tbl_user_otp_ibfk_1", {
        transaction
      });

      await queryInterface.removeIndex("tbl_user_otp", "idx_user_otp_user", { transaction });

      await queryInterface.removeColumn("tbl_user_otp", "user_id", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const { DataTypes } = Sequelize;

    try {
      await queryInterface.addColumn(
        "tbl_user_otp",
        "user_id",
        {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: "tbl_user",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE tbl_user_otp otp
        INNER JOIN tbl_user u ON otp.contact_number = u.contact_number
        SET otp.user_id = u.id
        `,
        { transaction }
      );

      await queryInterface.changeColumn(
        "tbl_user_otp",
        "user_id",
        {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: false
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "tbl_user_otp",
        ["user_id"],
        {
          name: "idx_user_otp_user",
          transaction
        }
      );

      await queryInterface.removeIndex("tbl_user_otp", "idx_user_otp_contact_number", {
        transaction
      });

      await queryInterface.removeColumn("tbl_user_otp", "contact_number", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
