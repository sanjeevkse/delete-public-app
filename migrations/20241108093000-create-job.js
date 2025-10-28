/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable("tbl_job", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      submitted_for: {
        type: DataTypes.ENUM("self", "others"),
        allowNull: false
      },
      applicant_user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "SET NULL"
      },
      full_name: {
        type: DataTypes.STRING(191),
        allowNull: false
      },
      contact_number: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      alternative_contact_number: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      full_address: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      education: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      work_experience: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      resume_url: {
        type: DataTypes.STRING(500),
        allowNull: true
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

    await queryInterface.addIndex("tbl_job", ["status"]);
    await queryInterface.addIndex("tbl_job", ["applicant_user_id", "status"]);
    await queryInterface.addIndex("tbl_job", ["submitted_for", "status"]);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("tbl_job", ["submitted_for", "status"]);
    await queryInterface.removeIndex("tbl_job", ["applicant_user_id", "status"]);
    await queryInterface.removeIndex("tbl_job", ["status"]);
    await queryInterface.dropTable("tbl_job");
  }
};
