/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable("tbl_scheme", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      scheme_name: {
        type: DataTypes.STRING(191),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("tbl_scheme", ["status"]);
    await queryInterface.addIndex("tbl_scheme", ["scheme_name"]);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("tbl_scheme", ["scheme_name"]);
    await queryInterface.removeIndex("tbl_scheme", ["status"]);
    await queryInterface.dropTable("tbl_scheme");
  }
};
