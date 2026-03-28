-- Ideal geo architecture schema
-- Rerunnable version without stored procedures. Apply this before seeding from the registration CSV.

CREATE TABLE IF NOT EXISTS tbl_meta_local_body (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  disp_name VARCHAR(191) NOT NULL,
  body_type ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') NOT NULL,
  normalized_name VARCHAR(191) DEFAULT NULL,
  state_id BIGINT UNSIGNED DEFAULT NULL,
  district_id BIGINT UNSIGNED DEFAULT NULL,
  taluk_id BIGINT UNSIGNED DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tbl_meta_local_body_body_type (body_type),
  KEY idx_tbl_meta_local_body_state (state_id),
  KEY idx_tbl_meta_local_body_district (district_id),
  KEY idx_tbl_meta_local_body_taluk (taluk_id),
  UNIQUE KEY uq_tbl_meta_local_body_body_name_taluk (body_type, normalized_name, taluk_id)
);

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND column_name = 'settlement_type'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD COLUMN `settlement_type` ENUM(''URBAN'', ''RURAL'') NULL AFTER `mla_constituency_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND column_name = 'governing_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD COLUMN `governing_body` ENUM(''GBA'', ''CC'', ''CMC'', ''TMC'', ''TP'', ''GP'') NULL AFTER `settlement_type`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND column_name = 'local_body_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD COLUMN `local_body_id` BIGINT UNSIGNED NULL AFTER `governing_body`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE tbl_geo_political
  MODIFY COLUMN district_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN taluk_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN mp_constituency_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN mla_constituency_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN main_village_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN sub_village_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN ward_number_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN polling_station_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN booth_number_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN zilla_panchayat_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN taluk_panchayat_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN gram_panchayat_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN hobali_id BIGINT UNSIGNED NULL;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND index_name = 'idx_tbl_geo_political_settlement_type'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD KEY `idx_tbl_geo_political_settlement_type` (`settlement_type`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND index_name = 'idx_tbl_geo_political_governing_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD KEY `idx_tbl_geo_political_governing_body` (`governing_body`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND index_name = 'idx_tbl_geo_political_local_body_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD KEY `idx_tbl_geo_political_local_body_id` (`local_body_id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_geo_political'
        AND index_name = 'idx_tbl_geo_political_geo_unit_lookup'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_geo_political` ADD KEY `idx_tbl_geo_political_geo_unit_lookup` (`state_id`, `district_id`, `mp_constituency_id`, `mla_constituency_id`, `taluk_id`, `settlement_type`, `governing_body`, `local_body_id`, `gram_panchayat_id`, `ward_number_id`, `booth_number_id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS tbl_geo_unit_scope (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  geo_unit_id BIGINT UNSIGNED NOT NULL,
  scope_type ENUM(
    'STATE',
    'DISTRICT',
    'MP_CONSTITUENCY',
    'MLA_CONSTITUENCY',
    'TALUK',
    'LOCAL_BODY',
    'HOBALI',
    'GRAM_PANCHAYAT',
    'MAIN_VILLAGE',
    'SUB_VILLAGE',
    'WARD',
    'POLLING_STATION',
    'BOOTH'
  ) NOT NULL,
  scope_id BIGINT UNSIGNED NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tbl_geo_unit_scope (geo_unit_id, scope_type, scope_id),
  KEY idx_tbl_geo_unit_scope_lookup (scope_type, scope_id, status),
  CONSTRAINT fk_tbl_geo_unit_scope_geo_unit
    FOREIGN KEY (geo_unit_id) REFERENCES tbl_geo_political (id)
);

CREATE TABLE IF NOT EXISTS tbl_user_access_scope (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  access_role_id BIGINT UNSIGNED NOT NULL,
  scope_type ENUM(
    'GLOBAL',
    'STATE',
    'DISTRICT',
    'MP_CONSTITUENCY',
    'MLA_CONSTITUENCY',
    'TALUK',
    'LOCAL_BODY',
    'HOBALI',
    'GRAM_PANCHAYAT',
    'MAIN_VILLAGE',
    'SUB_VILLAGE',
    'WARD',
    'POLLING_STATION',
    'BOOTH'
  ) NOT NULL,
  scope_id BIGINT UNSIGNED NOT NULL,
  settlement_type ENUM('URBAN', 'RURAL') DEFAULT NULL,
  local_body_type ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tbl_user_access_scope (
    user_id,
    access_role_id,
    scope_type,
    scope_id,
    settlement_type,
    local_body_type
  ),
  KEY idx_tbl_user_access_scope_user (user_id, status),
  KEY idx_tbl_user_access_scope_scope (scope_type, scope_id, status),
  CONSTRAINT fk_tbl_user_access_scope_user
    FOREIGN KEY (user_id) REFERENCES tbl_user (id),
  CONSTRAINT fk_tbl_user_access_scope_role
    FOREIGN KEY (access_role_id) REFERENCES tbl_meta_user_role (id)
);

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `country`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'district_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `district_id` BIGINT UNSIGNED NULL AFTER `state_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'taluk_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `taluk_id` BIGINT UNSIGNED NULL AFTER `district_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'settlement_type'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `settlement_type` ENUM(''URBAN'', ''RURAL'') NULL AFTER `mla_constituency_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'local_body_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `local_body_id` BIGINT UNSIGNED NULL AFTER `governing_body`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'hobali_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `hobali_id` BIGINT UNSIGNED NULL AFTER `local_body_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'sub_village_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `sub_village_id` BIGINT UNSIGNED NULL AFTER `main_village_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND column_name = 'polling_station_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD COLUMN `polling_station_id` BIGINT UNSIGNED NULL AFTER `ward_number_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE tbl_user_profile
  MODIFY COLUMN governing_body ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') NULL;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND index_name = 'idx_tbl_user_profile_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD KEY `idx_tbl_user_profile_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND index_name = 'idx_tbl_user_profile_settlement'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD KEY `idx_tbl_user_profile_settlement` (`settlement_type`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND index_name = 'idx_tbl_user_profile_local_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD KEY `idx_tbl_user_profile_local_body` (`local_body_id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND constraint_name = 'fk_tbl_user_profile_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_tbl_user_profile_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'tbl_user_profile'
        AND constraint_name = 'fk_tbl_user_profile_local_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_profile` ADD CONSTRAINT `fk_tbl_user_profile_local_body` FOREIGN KEY (`local_body_id`) REFERENCES `tbl_meta_local_body` (`id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_access'
        AND column_name = 'settlement_type'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD COLUMN `settlement_type` ENUM(''URBAN'', ''RURAL'') NULL AFTER `taluk_id`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_access'
        AND column_name = 'local_body_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD COLUMN `local_body_id` BIGINT NULL AFTER `governing_body`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE tbl_user_access
  MODIFY COLUMN governing_body ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') NULL;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_access'
        AND index_name = 'idx_tbl_user_access_settlement'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD KEY `idx_tbl_user_access_settlement` (`settlement_type`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_access'
        AND index_name = 'idx_tbl_user_access_local_body'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_access` ADD KEY `idx_tbl_user_access_local_body` (`local_body_id`)'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
