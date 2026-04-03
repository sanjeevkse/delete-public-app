-- Ideal geo architecture import pipeline
-- 1. Generate stage SQL with:
--    node scripts/generateGeoStageSeedSql.js "Jansev-Rigistration-Qes.xlsx - Registration Form.csv"
-- 2. Run the generated stage seed SQL.
-- 3. Run this file to rebuild geo units and access scopes.

CREATE TABLE IF NOT EXISTS stg_geo_registration_raw (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_row_no INT NOT NULL,
  raw_payload_json JSON NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stg_geo_registration_raw_row (source_row_no)
);

CREATE TABLE IF NOT EXISTS stg_geo_registration_normalized (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_row_no INT NOT NULL,
  state_name VARCHAR(191) NOT NULL,
  district_name VARCHAR(191) DEFAULT NULL,
  mp_code VARCHAR(32) DEFAULT NULL,
  mp_name VARCHAR(191) DEFAULT NULL,
  mla_code VARCHAR(32) DEFAULT NULL,
  mla_name VARCHAR(191) DEFAULT NULL,
  taluk_name VARCHAR(191) DEFAULT NULL,
  settlement_type ENUM('URBAN', 'RURAL') NOT NULL,
  local_body_type ENUM('GBA', 'CC', 'CMC', 'TMC', 'TP', 'GP') NOT NULL,
  local_body_name VARCHAR(191) DEFAULT NULL,
  hobali_name VARCHAR(191) DEFAULT NULL,
  gram_panchayat_name VARCHAR(191) DEFAULT NULL,
  ward_name VARCHAR(191) DEFAULT NULL,
  main_village_name VARCHAR(191) DEFAULT NULL,
  sub_village_name VARCHAR(191) DEFAULT NULL,
  booth_number INT DEFAULT NULL,
  polling_station_name VARCHAR(255) DEFAULT NULL,
  source_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stg_geo_registration_normalized_hash (source_hash),
  KEY idx_stg_geo_registration_normalized_taluk (taluk_name),
  KEY idx_stg_geo_registration_normalized_local_body (local_body_type, local_body_name)
);

-- Insert or refresh local body master from normalized staging.
INSERT INTO tbl_meta_local_body (
  disp_name,
  body_type,
  normalized_name,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT DISTINCT
  s.local_body_name,
  s.local_body_type,
  LOWER(TRIM(s.local_body_name)),
  1,
  1,
  1,
  NOW(),
  NOW()
FROM stg_geo_registration_normalized AS s
WHERE s.local_body_name IS NOT NULL
  AND s.local_body_name <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM tbl_meta_local_body AS lb
    WHERE lb.body_type = s.local_body_type
      AND lb.normalized_name COLLATE utf8mb4_unicode_ci =
          LOWER(TRIM(s.local_body_name)) COLLATE utf8mb4_unicode_ci
  );

-- Rebuild geo unit leaf rows after master tables are aligned to the normalized staging data.
-- `tbl_geo_political` is referenced by `tbl_geo_unit_scope` and `tbl_user_profile.geo_unit_id`,
-- so use ordered DELETEs instead of TRUNCATE.
UPDATE tbl_user_profile
SET geo_unit_id = NULL
WHERE geo_unit_id IS NOT NULL;

DELETE FROM tbl_geo_unit_scope;
DELETE FROM tbl_geo_political;

INSERT INTO tbl_geo_political (
  state_id,
  district_id,
  taluk_id,
  mp_constituency_id,
  mla_constituency_id,
  settlement_type,
  governing_body,
  local_body_id,
  hobali_id,
  gram_panchayat_id,
  main_village_id,
  sub_village_id,
  ward_number_id,
  polling_station_id,
  booth_number_id,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT DISTINCT
  st.id AS state_id,
  d.id AS district_id,
  t.id AS taluk_id,
  mp.id AS mp_constituency_id,
  mla.id AS mla_constituency_id,
  s.settlement_type,
  s.local_body_type,
  lb.id AS local_body_id,
  h.id AS hobali_id,
  gp.id AS gram_panchayat_id,
  mv.id AS main_village_id,
  sv.id AS sub_village_id,
  w.id AS ward_number_id,
  ps.id AS polling_station_id,
  bn.id AS booth_number_id,
  1,
  1,
  1,
  NOW(),
  NOW()
FROM stg_geo_registration_normalized AS s
LEFT JOIN tbl_meta_state AS st
  ON LOWER(TRIM(st.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.state_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_district AS d
  ON LOWER(TRIM(d.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.district_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_taluk AS t
  ON LOWER(TRIM(t.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.taluk_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_mp_constituency AS mp
  ON LOWER(TRIM(mp.disp_name)) COLLATE utf8mb4_unicode_ci LIKE
     CONCAT(s.mp_code, '-%') COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_mla_constituency AS mla
  ON LOWER(TRIM(mla.disp_name)) COLLATE utf8mb4_unicode_ci LIKE
     CONCAT(s.mla_code, '-%') COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_local_body AS lb
  ON lb.body_type = s.local_body_type
  AND lb.normalized_name COLLATE utf8mb4_unicode_ci =
      LOWER(TRIM(s.local_body_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_hobali AS h
  ON LOWER(TRIM(h.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.hobali_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_gram_panchayat AS gp
  ON LOWER(TRIM(gp.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.gram_panchayat_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_main_village AS mv
  ON LOWER(TRIM(mv.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.main_village_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_sub_village AS sv
  ON LOWER(TRIM(sv.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.sub_village_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_ward_number AS w
  ON LOWER(
    REPLACE(REPLACE(REPLACE(TRIM(w.disp_name), ' - ', '-'), ' -', '-'), '- ', '-')
  ) COLLATE utf8mb4_unicode_ci = LOWER(
    REPLACE(REPLACE(REPLACE(TRIM(s.ward_name), ' - ', '-'), ' -', '-'), '- ', '-')
  ) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_polling_station AS ps
  ON LOWER(TRIM(ps.disp_name)) COLLATE utf8mb4_unicode_ci =
     LOWER(TRIM(s.polling_station_name)) COLLATE utf8mb4_unicode_ci
LEFT JOIN tbl_meta_booth_number AS bn
  ON bn.disp_name = CAST(s.booth_number AS CHAR)
  AND bn.status = 1
  AND (mla.id IS NULL OR bn.mla_constituency_id = mla.id)
  AND (ps.id IS NULL OR bn.polling_station_id = ps.id)
WHERE st.id IS NOT NULL;

DELETE FROM tbl_geo_unit_scope;

INSERT INTO tbl_geo_unit_scope (
  geo_unit_id,
  scope_type,
  scope_id,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT id, 'STATE', state_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND state_id IS NOT NULL
UNION ALL
SELECT id, 'DISTRICT', district_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND district_id IS NOT NULL
UNION ALL
SELECT id, 'MP_CONSTITUENCY', mp_constituency_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND mp_constituency_id IS NOT NULL
UNION ALL
SELECT id, 'MLA_CONSTITUENCY', mla_constituency_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND mla_constituency_id IS NOT NULL
UNION ALL
SELECT id, 'TALUK', taluk_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND taluk_id IS NOT NULL
UNION ALL
SELECT id, 'LOCAL_BODY', local_body_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND local_body_id IS NOT NULL
UNION ALL
SELECT id, 'HOBALI', hobali_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND hobali_id IS NOT NULL
UNION ALL
SELECT id, 'GRAM_PANCHAYAT', gram_panchayat_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND gram_panchayat_id IS NOT NULL
UNION ALL
SELECT id, 'MAIN_VILLAGE', main_village_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND main_village_id IS NOT NULL
UNION ALL
SELECT id, 'SUB_VILLAGE', sub_village_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND sub_village_id IS NOT NULL
UNION ALL
SELECT id, 'WARD', ward_number_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND ward_number_id IS NOT NULL
UNION ALL
SELECT id, 'POLLING_STATION', polling_station_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND polling_station_id IS NOT NULL
UNION ALL
SELECT id, 'BOOTH', booth_number_id, 1, 1, 1, NOW(), NOW()
FROM tbl_geo_political
WHERE status = 1 AND booth_number_id IS NOT NULL;
