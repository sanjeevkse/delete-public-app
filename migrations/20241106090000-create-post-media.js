/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable("tbl_post_media", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      post_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_post",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      media_type: {
        type: DataTypes.ENUM("PHOTO", "VIDEO"),
        allowNull: false
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      duration_second: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
      },
      position_number: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      caption: {
        type: DataTypes.STRING(255),
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
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        )
      }
    });

    await queryInterface.addIndex("tbl_post_media", ["post_id", "status"]);
    await queryInterface.addIndex("tbl_post_media", ["post_id", "media_type"]);

    await queryInterface.sequelize
      .query("DROP TABLE IF EXISTS `tbl_post_image`;")
      .catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.dropTable("tbl_post_media");

    await queryInterface.createTable("tbl_post_image", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      post_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_post",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      caption: {
        type: DataTypes.STRING(255),
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
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        )
      }
    });

    await queryInterface.addIndex("tbl_post_image", ["post_id", "status"]);
  }
};
