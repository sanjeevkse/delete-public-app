-- Mother tongue meta table + user profile linkage (manual SQL; no migration file)
-- MySQL 8+

CREATE TABLE IF NOT EXISTS `tbl_meta_mother_tongue` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_mother_tongue_disp_name` (`disp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @col_profile_mother_tongue_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'mother_tongue_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `mother_tongue_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_mother_tongue_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_profile_mother_tongue_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_mother_tongue_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_mother_tongue_id` (`mother_tongue_id`)'
  )
);
PREPARE stmt FROM @idx_profile_mother_tongue_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_mother_tongue := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_mother_tongue'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_mother_tongue` FOREIGN KEY (`mother_tongue_id`) REFERENCES `tbl_meta_mother_tongue` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_mother_tongue;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `tbl_meta_table_registry`
  (`name`, `table_name`, `display_name`, `model_name`, `description`, `primary_key`, `searchable_fields`, `has_status`, `status`, `created_at`, `updated_at`)
SELECT
  'motherTongue',
  'tbl_meta_mother_tongue',
  'Mother Tongues',
  'MetaMotherTongue',
  'Mother tongue options for user profile.',
  'id',
  '["dispName"]',
  1,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_meta_table_registry` WHERE `name` = 'motherTongue'
);

