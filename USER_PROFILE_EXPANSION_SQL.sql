-- User profile expansion (manual SQL; no migration file)
-- MySQL 8+

CREATE TABLE IF NOT EXISTS `tbl_meta_religion` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_religion_disp_name` (`disp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_main_caste` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_main_caste_disp_name` (`disp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_sub_caste_category` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_sub_caste_category_disp_name` (`disp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_sub_caste` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(120) NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meta_sub_caste_category_id` (`category_id`),
  CONSTRAINT `fk_meta_sub_caste_category_id`
    FOREIGN KEY (`category_id`) REFERENCES `tbl_meta_sub_caste_category` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_employment_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `disp_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_employment_group_disp_name` (`disp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_employment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `employment_group_id` int unsigned DEFAULT NULL,
  `disp_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meta_employment_group_id` (`employment_group_id`),
  CONSTRAINT `fk_meta_employment_group_id`
    FOREIGN KEY (`employment_group_id`) REFERENCES `tbl_meta_employment_group` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @col_profile_disability_status_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'disability_status_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `disability_status_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_disability_status_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_religion_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'religion_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `religion_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_religion_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_main_caste_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'main_caste_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `main_caste_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_main_caste_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_sub_caste_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'sub_caste_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `sub_caste_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_sub_caste_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_voter_id_number := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'voter_id_number'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `voter_id_number` varchar(30) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_voter_id_number;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_voter_id_photo := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'voter_id_photo'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `voter_id_photo` varchar(500) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_voter_id_photo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_aadhaar_photo := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'aadhaar_photo'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `aadhaar_photo` varchar(500) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_aadhaar_photo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_ration_card_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'ration_card_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `ration_card_no` varchar(30) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_ration_card_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_ration_card_photo := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'ration_card_photo'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `ration_card_photo` varchar(500) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_ration_card_photo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_employment_group_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'employment_group_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `employment_group_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_employment_group_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_employment_type_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'employment_type_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `employment_type_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_employment_type_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `tbl_meta_table_registry`
  (`name`, `table_name`, `display_name`, `model_name`, `description`, `primary_key`, `searchable_fields`, `has_status`, `custom_includes`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
  ('religion', 'tbl_meta_religion', 'Religion', 'MetaReligion', 'Religion options for user profile.', 'id', '["dispName"]', 1, NULL, 1, NULL, NULL, NOW(), NOW()),
  ('mainCaste', 'tbl_meta_main_caste', 'Main Caste', 'MetaMainCaste', 'Main caste options for user profile.', 'id', '["dispName"]', 1, NULL, 1, NULL, NULL, NOW(), NOW()),
  ('subCasteCategory', 'tbl_meta_sub_caste_category', 'Sub Caste Category', 'MetaSubCasteCategory', 'Category options for sub-caste.', 'id', '["dispName"]', 1, NULL, 1, NULL, NULL, NOW(), NOW()),
  ('subCaste', 'tbl_meta_sub_caste', 'Sub Caste', 'MetaSubCaste', 'Sub caste options for user profile.', 'id', '["dispName"]', 1, '[{"association":"category","attributes":["id","dispName"]}]', 1, NULL, NULL, NOW(), NOW()),
  ('employmentGroup', 'tbl_meta_employment_group', 'Employment Group', 'MetaEmploymentGroup', 'Employment groups for user profile.', 'id', '["dispName"]', 1, NULL, 1, NULL, NULL, NOW(), NOW()),
  ('employment', 'tbl_meta_employment', 'Employment', 'MetaEmployment', 'Employment options for user profile.', 'id', '["dispName"]', 1, '[{"association":"employmentGroup","attributes":["id","dispName"]}]', 1, NULL, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `model_name` = VALUES(`model_name`),
  `description` = VALUES(`description`),
  `primary_key` = VALUES(`primary_key`),
  `searchable_fields` = VALUES(`searchable_fields`),
  `has_status` = VALUES(`has_status`),
  `custom_includes` = VALUES(`custom_includes`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

-- Geographic + governing body expansion (idempotent)
SET @col_profile_state_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'state_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `state_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_state_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_mp_constituency_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'mp_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `mp_constituency_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_mp_constituency_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_mla_constituency_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'mla_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `mla_constituency_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_mla_constituency_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_governing_body := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'governing_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `governing_body` enum(''GBA'',''TMC'',''CMC'',''GP'') DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_governing_body;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_gram_panchayat_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'gram_panchayat_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `gram_panchayat_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_gram_panchayat_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_main_village_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'main_village_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `main_village_id` int unsigned DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_main_village_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_voter_list_booth_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'voter_list_booth_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `voter_list_booth_no` varchar(32) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_voter_list_booth_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_voter_list_sl_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'voter_list_sl_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `voter_list_sl_no` varchar(32) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_voter_list_sl_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_map_booth_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'map_booth_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `map_booth_no` varchar(32) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_map_booth_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_map_sl_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'map_sl_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `map_sl_no` varchar(32) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_map_sl_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_profile_map_sub_sl_no := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND COLUMN_NAME = 'map_sub_sl_no'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `map_sub_sl_no` varchar(32) DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_profile_map_sub_sl_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_user_access_governing_body := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_access'
        AND COLUMN_NAME = 'governing_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD COLUMN `governing_body` enum(''GBA'',''TMC'',''CMC'',''GP'') DEFAULT NULL'
  )
);
PREPARE stmt FROM @col_user_access_governing_body;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_disability := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_disability_status_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_disability_status_id` (`disability_status_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_disability;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_religion := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_religion_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_religion_id` (`religion_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_religion;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_main_caste := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_main_caste_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_main_caste_id` (`main_caste_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_main_caste;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_sub_caste := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_sub_caste_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_sub_caste_id` (`sub_caste_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_sub_caste;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_employment_group := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_employment_group_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_employment_group_id` (`employment_group_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_employment_group;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_employment_type := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_employment_type_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_employment_type_id` (`employment_type_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_employment_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_state := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_state_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_state_id` (`state_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_state;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_mp := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_mp_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_mp_constituency_id` (`mp_constituency_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_mla := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_mla_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_mla_constituency_id` (`mla_constituency_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_mla;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_gp := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_gram_panchayat_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_gram_panchayat_id` (`gram_panchayat_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_gp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_profile_main_village := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND INDEX_NAME = 'idx_user_profile_main_village_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD INDEX `idx_user_profile_main_village_id` (`main_village_id`)'
  )
);
PREPARE stmt FROM @idx_user_profile_main_village;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_user_access_governing_body := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_access'
        AND INDEX_NAME = 'idx_user_access_governing_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD INDEX `idx_user_access_governing_body` (`governing_body`)'
  )
);
PREPARE stmt FROM @idx_user_access_governing_body;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_disability := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_disability_status'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_disability_status` FOREIGN KEY (`disability_status_id`) REFERENCES `tbl_meta_disability_status` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_disability;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_religion := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_religion'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_religion` FOREIGN KEY (`religion_id`) REFERENCES `tbl_meta_religion` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_religion;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_main_caste := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_main_caste'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_main_caste` FOREIGN KEY (`main_caste_id`) REFERENCES `tbl_meta_main_caste` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_main_caste;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_sub_caste := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_sub_caste'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_sub_caste` FOREIGN KEY (`sub_caste_id`) REFERENCES `tbl_meta_sub_caste` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_sub_caste;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_employment_group := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_employment_group'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_employment_group` FOREIGN KEY (`employment_group_id`) REFERENCES `tbl_meta_employment_group` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_employment_group;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_profile_employment_type := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_employment_type'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_employment_type` FOREIGN KEY (`employment_type_id`) REFERENCES `tbl_meta_employment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_user_profile_employment_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_state := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_state_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_state_id` FOREIGN KEY (`state_id`) REFERENCES `tbl_meta_state` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_state;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_mp := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_mp_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_mp_constituency_id` FOREIGN KEY (`mp_constituency_id`) REFERENCES `tbl_meta_mp_constituency` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_mla := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_mla_constituency_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_mla_constituency_id` FOREIGN KEY (`mla_constituency_id`) REFERENCES `tbl_meta_mla_constituency` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_mla;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_gp := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_gram_panchayat_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_gram_panchayat_id` FOREIGN KEY (`gram_panchayat_id`) REFERENCES `tbl_meta_gram_panchayat` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_gp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_profile_mv := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_user_profile'
        AND CONSTRAINT_NAME = 'fk_user_profile_main_village_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_user_profile_main_village_id` FOREIGN KEY (`main_village_id`) REFERENCES `tbl_meta_main_village` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @fk_profile_mv;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- NOTE:
-- DB-level CHECK constraints for GP->gram_panchayat_id were removed because some MySQL builds
-- reject CHECK on columns used by FK referential actions (error seen for tbl_user_profile).
-- Validation is enforced at application level in:
--   src/services/userProfileService.ts
--   src/services/userAccessService.ts
