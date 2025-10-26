/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable("tbl_user", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      contact_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING(191),
        allowNull: true,
        unique: true
      },
      full_name: {
        type: DataTypes.STRING(191),
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

    await queryInterface.createTable("tbl_user_profile", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      display_name: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      alernative_contact_number: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      gender: {
        type: DataTypes.ENUM("MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT"),
        allowNull: true
      },
      occupation: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      profile_image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      full_address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      address_line1: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      address_line2: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      state: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      ward_number_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      booth_number_number_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      is_registration_agreed: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
      },
      social_links_json: {
        type: DataTypes.JSON,
        allowNull: true
      },
      preferences_json: {
        type: DataTypes.JSON,
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

    await queryInterface.createTable("tbl_meta_permission_group", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      label: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      action: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true
      },
      action_url: {
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

    await queryInterface.createTable("tbl_meta_permission", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      disp_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      permission_group_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_meta_permission_group",
          key: "id"
        },
        onDelete: "CASCADE"
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

    await queryInterface.createTable("tbl_meta_user_role", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      disp_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.createTable("tbl_xref_user_role", {
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      role_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_meta_user_role",
          key: "id"
        },
        onDelete: "CASCADE"
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
    await queryInterface.addConstraint("tbl_xref_user_role", {
      type: "primary key",
      name: "pk_user_role",
      fields: ["user_id", "role_id"]
    });

    await queryInterface.createTable("tbl_xref_role_permission", {
      role_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_meta_user_role",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      permission_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_meta_permission",
          key: "id"
        },
        onDelete: "CASCADE"
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
    await queryInterface.addConstraint("tbl_xref_role_permission", {
      type: "primary key",
      name: "pk_role_permission",
      fields: ["role_id", "permission_id"]
    });

    await queryInterface.createTable("tbl_event", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      place: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      google_map_link: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      end_time: {
        type: DataTypes.TIME,
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

    await queryInterface.createTable("tbl_event_media", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      event_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_event",
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.createTable("tbl_event_registration", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      event_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_event",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      deregister_reason: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      deregistered_at: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.createTable("tbl_post", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      tags: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.createTable("tbl_post_reaction", {
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
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      reaction: {
        type: DataTypes.ENUM("LIKE", "DISLIKE"),
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

    await queryInterface.createTable("tbl_user_otp", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      contact_number: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      purpose: {
        type: DataTypes.ENUM("LOGIN", "2FA", "PASSWORD_RESET"),
        allowNull: false,
        defaultValue: "LOGIN"
      },
      otp_plain: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      attempts_left: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 3
      },
      consumed_at: {
        type: DataTypes.DATE,
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

    await queryInterface.createTable("tbl_user_token", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      device_label: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      device_fingerprint: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      platform: {
        type: DataTypes.ENUM("IOS", "ANDROID", "WEB", "OTHER"),
        allowNull: true,
        defaultValue: "ANDROID"
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      revoke_reason: {
        type: DataTypes.STRING(191),
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

    await queryInterface.createTable("tbl_audit_log", {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        references: {
          model: "tbl_user",
          key: "id"
        },
        onDelete: "SET NULL"
      },
      action: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      metadata_json: {
        type: DataTypes.JSON,
        allowNull: true
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      user_agent: {
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("tbl_audit_log", ["user_id"], { name: "idx_audit_user" });
    await queryInterface.addIndex("tbl_audit_log", ["action"], { name: "idx_audit_action" });
    await queryInterface.addIndex("tbl_event_media", ["event_id"], { name: "idx_event_media_event" });
    await queryInterface.addIndex("tbl_event_registration", ["event_id"], {
      name: "idx_event_registration_event"
    });
    await queryInterface.addIndex("tbl_event_registration", ["user_id"], {
      name: "idx_event_registration_user"
    });
    await queryInterface.addIndex("tbl_post", ["user_id"], { name: "idx_post_user" });
    await queryInterface.addIndex("tbl_post_image", ["post_id"], { name: "idx_post_image_post" });
    await queryInterface.addIndex("tbl_post_reaction", ["post_id"], {
      name: "idx_post_reaction_post"
    });
    await queryInterface.addIndex("tbl_post_reaction", ["user_id"], {
      name: "idx_post_reaction_user"
    });
    await queryInterface.addIndex("tbl_user_profile", ["user_id"], { name: "idx_user_profile_user" });
    await queryInterface.addIndex("tbl_user_token", ["user_id"], { name: "idx_user_token_user" });
    await queryInterface.addIndex("tbl_user_otp", ["contact_number"], {
      name: "idx_user_otp_contact"
    });
    await queryInterface.addIndex("tbl_meta_permission", ["permission_group_id"], {
      name: "idx_permission_group_id"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("tbl_meta_permission", "idx_permission_group_id");
    await queryInterface.removeIndex("tbl_user_otp", "idx_user_otp_contact");
    await queryInterface.removeIndex("tbl_user_token", "idx_user_token_user");
    await queryInterface.removeIndex("tbl_user_profile", "idx_user_profile_user");
    await queryInterface.removeIndex("tbl_post_reaction", "idx_post_reaction_user");
    await queryInterface.removeIndex("tbl_post_reaction", "idx_post_reaction_post");
    await queryInterface.removeIndex("tbl_post_image", "idx_post_image_post");
    await queryInterface.removeIndex("tbl_post", "idx_post_user");
    await queryInterface.removeIndex("tbl_event_registration", "idx_event_registration_user");
    await queryInterface.removeIndex("tbl_event_registration", "idx_event_registration_event");
    await queryInterface.removeIndex("tbl_event_media", "idx_event_media_event");
    await queryInterface.removeIndex("tbl_audit_log", "idx_audit_action");
    await queryInterface.removeIndex("tbl_audit_log", "idx_audit_user");

    await queryInterface.dropTable("tbl_audit_log");
    await queryInterface.dropTable("tbl_user_token");
    await queryInterface.dropTable("tbl_user_otp");
    await queryInterface.dropTable("tbl_post_reaction");
    await queryInterface.dropTable("tbl_post_image");
    await queryInterface.dropTable("tbl_post");
    await queryInterface.dropTable("tbl_event_registration");
    await queryInterface.dropTable("tbl_event_media");
    await queryInterface.dropTable("tbl_event");
    await queryInterface.dropTable("tbl_xref_role_permission");
    await queryInterface.dropTable("tbl_xref_user_role");
    await queryInterface.dropTable("tbl_meta_user_role");
    await queryInterface.dropTable("tbl_meta_permission");
    await queryInterface.dropTable("tbl_meta_permission_group");
    await queryInterface.dropTable("tbl_user_profile");
    await queryInterface.dropTable("tbl_user");
  }
};
