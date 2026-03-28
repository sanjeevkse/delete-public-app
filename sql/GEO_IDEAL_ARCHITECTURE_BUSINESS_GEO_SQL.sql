-- Add geo_unit_id to remaining geo-bearing business tables and backfill safe exact matches.

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_complaint'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_complaint` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `complaint_type_id`'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_schedule_event'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_schedule_event` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `longitude`'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_event_registration'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_event_registration` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `full_address`'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_scheme_applications'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_scheme_applications` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `address_line`'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_form_event_accessibility'
        AND column_name = 'geo_unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_form_event_accessibility` ADD COLUMN `geo_unit_id` BIGINT UNSIGNED NULL AFTER `form_event_id`'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_complaint'
        AND index_name = 'idx_tbl_complaint_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_complaint` ADD KEY `idx_tbl_complaint_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_schedule_event'
        AND index_name = 'idx_tbl_schedule_event_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_schedule_event` ADD KEY `idx_tbl_schedule_event_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_event_registration'
        AND index_name = 'idx_tbl_event_registration_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_event_registration` ADD KEY `idx_tbl_event_registration_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_scheme_applications'
        AND index_name = 'idx_tbl_user_scheme_applications_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_scheme_applications` ADD KEY `idx_tbl_user_scheme_applications_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_form_event_accessibility'
        AND index_name = 'idx_tbl_form_event_accessibility_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_form_event_accessibility` ADD KEY `idx_tbl_form_event_accessibility_geo_unit` (`geo_unit_id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_complaint'
        AND constraint_name = 'fk_tbl_complaint_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_complaint` ADD CONSTRAINT `fk_tbl_complaint_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_schedule_event'
        AND constraint_name = 'fk_tbl_schedule_event_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_schedule_event` ADD CONSTRAINT `fk_tbl_schedule_event_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_event_registration'
        AND constraint_name = 'fk_tbl_event_registration_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_event_registration` ADD CONSTRAINT `fk_tbl_event_registration_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_user_scheme_applications'
        AND constraint_name = 'fk_tbl_user_scheme_applications_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_user_scheme_applications` ADD CONSTRAINT `fk_tbl_user_scheme_applications_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'tbl_form_event_accessibility'
        AND constraint_name = 'fk_tbl_form_event_accessibility_geo_unit'
    ),
    'SELECT 1',
    'ALTER TABLE `tbl_form_event_accessibility` ADD CONSTRAINT `fk_tbl_form_event_accessibility_geo_unit` FOREIGN KEY (`geo_unit_id`) REFERENCES `tbl_geo_political` (`id`)'
  )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DROP TEMPORARY TABLE IF EXISTS tmp_exact_complaint_geo;
CREATE TEMPORARY TABLE tmp_exact_complaint_geo AS
SELECT c.id, MIN(gp.id) AS geo_unit_id
FROM tbl_complaint c
JOIN tbl_geo_political gp
  ON (
    c.booth_number_id IS NOT NULL
    AND gp.booth_number_id = c.booth_number_id
    AND (c.ward_number_id IS NULL OR gp.ward_number_id = c.ward_number_id)
  )
  OR (
    c.booth_number_id IS NULL
    AND c.ward_number_id IS NOT NULL
    AND gp.ward_number_id = c.ward_number_id
  )
GROUP BY c.id
HAVING COUNT(*) = 1;

UPDATE tbl_complaint c
JOIN tmp_exact_complaint_geo t ON t.id = c.id
SET c.geo_unit_id = t.geo_unit_id
WHERE c.geo_unit_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_exact_schedule_geo;
CREATE TEMPORARY TABLE tmp_exact_schedule_geo AS
SELECT e.id, MIN(gp.id) AS geo_unit_id
FROM tbl_schedule_event e
JOIN tbl_geo_political gp
  ON (
    e.booth_number_id IS NOT NULL
    AND gp.booth_number_id = e.booth_number_id
    AND (e.ward_number_id IS NULL OR gp.ward_number_id = e.ward_number_id)
  )
  OR (
    e.booth_number_id IS NULL
    AND e.ward_number_id IS NOT NULL
    AND gp.ward_number_id = e.ward_number_id
  )
GROUP BY e.id
HAVING COUNT(*) = 1;

UPDATE tbl_schedule_event e
JOIN tmp_exact_schedule_geo t ON t.id = e.id
SET e.geo_unit_id = t.geo_unit_id
WHERE e.geo_unit_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_exact_registration_geo;
CREATE TEMPORARY TABLE tmp_exact_registration_geo AS
SELECT er.id, MIN(gp.id) AS geo_unit_id
FROM tbl_event_registration er
JOIN tbl_geo_political gp
  ON (
    er.booth_number_id IS NOT NULL
    AND gp.booth_number_id = er.booth_number_id
    AND (er.ward_number_id IS NULL OR gp.ward_number_id = er.ward_number_id)
  )
  OR (
    er.booth_number_id IS NULL
    AND er.ward_number_id IS NOT NULL
    AND gp.ward_number_id = er.ward_number_id
  )
GROUP BY er.id
HAVING COUNT(*) = 1;

UPDATE tbl_event_registration er
JOIN tmp_exact_registration_geo t ON t.id = er.id
SET er.geo_unit_id = t.geo_unit_id
WHERE er.geo_unit_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_exact_scheme_geo;
CREATE TEMPORARY TABLE tmp_exact_scheme_geo AS
SELECT usa.application_id, MIN(gp.id) AS geo_unit_id
FROM tbl_user_scheme_applications usa
JOIN tbl_geo_political gp
  ON (
    usa.booth_number_id IS NOT NULL
    AND gp.booth_number_id = usa.booth_number_id
    AND (usa.ward_number_id IS NULL OR gp.ward_number_id = usa.ward_number_id)
  )
  OR (
    usa.booth_number_id IS NULL
    AND usa.ward_number_id IS NOT NULL
    AND gp.ward_number_id = usa.ward_number_id
  )
GROUP BY usa.application_id
HAVING COUNT(*) = 1;

UPDATE tbl_user_scheme_applications usa
JOIN tmp_exact_scheme_geo t ON t.application_id = usa.application_id
SET usa.geo_unit_id = t.geo_unit_id
WHERE usa.geo_unit_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_exact_form_event_geo;
CREATE TEMPORARY TABLE tmp_exact_form_event_geo AS
SELECT fea.id, MIN(gp.id) AS geo_unit_id
FROM tbl_form_event_accessibility fea
JOIN tbl_geo_political gp
  ON fea.ward_number_id > 0
 AND fea.booth_number_id > 0
 AND gp.ward_number_id = fea.ward_number_id
 AND gp.booth_number_id = fea.booth_number_id
GROUP BY fea.id
HAVING COUNT(*) = 1;

UPDATE tbl_form_event_accessibility fea
JOIN tmp_exact_form_event_geo t ON t.id = fea.id
SET fea.geo_unit_id = t.geo_unit_id
WHERE fea.geo_unit_id IS NULL;
