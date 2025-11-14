import sequelize from "../config/database";
import logger from "../utils/logger";

/**
 * Create tbl_device_token table using raw SQL query
 * Run this once to set up the table for Firebase push notifications
 */
export const createDeviceTokensTable = async (): Promise<void> => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`tbl_device_token\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` BIGINT UNSIGNED NOT NULL,
        \`token\` VARCHAR(500) NOT NULL UNIQUE,
        \`device_id\` VARCHAR(255) DEFAULT NULL,
        \`platform\` ENUM('ios', 'android', 'web') DEFAULT NULL,
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`last_used_at\` DATETIME DEFAULT NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED DEFAULT NULL,
        \`updated_by\` BIGINT UNSIGNED DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        CONSTRAINT \`fk_device_token_user_id\` 
          FOREIGN KEY (\`user_id\`) 
          REFERENCES \`tbl_user\` (\`id\`) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sequelize.query(createTableQuery);
    logger.info("tbl_device_token table created successfully or already exists");
  } catch (error) {
    logger.error({ err: error }, "Error creating tbl_device_token table");
    throw error;
  }
};

/**
 * Drop tbl_device_token table (use with caution)
 */
export const dropDeviceTokensTable = async (): Promise<void> => {
  try {
    await sequelize.query("DROP TABLE IF EXISTS `tbl_device_token`");
    logger.info("tbl_device_token table dropped successfully");
  } catch (error) {
    logger.error({ err: error }, "Error dropping tbl_device_token table");
    throw error;
  }
};
