-- Geo ideal architecture backfill
-- Purpose:
-- 1. Backfill tbl_user_profile.geo_unit_id from tbl_geo_political
-- 2. Rebuild tbl_user_access_scope from legacy tbl_user_access
--
-- This file is wrapped in one transaction and ends with ROLLBACK by default.
-- Review the summary SELECTs, then replace ROLLBACK with COMMIT when ready.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_profile_geo_candidates;
CREATE TEMPORARY TABLE tmp_profile_geo_candidates AS
SELECT
  up.id AS user_profile_id,
  up.user_id,
  MIN(gp.id) AS geo_unit_id,
  COUNT(gp.id) AS matched_geo_units
FROM tbl_user_profile up
LEFT JOIN tbl_geo_political gp
  ON (up.state_id IS NULL OR gp.state_id = up.state_id)
 AND (up.district_id IS NULL OR gp.district_id = up.district_id)
 AND (up.taluk_id IS NULL OR gp.taluk_id = up.taluk_id)
 AND (up.mp_constituency_id IS NULL OR gp.mp_constituency_id = up.mp_constituency_id)
 AND (up.mla_constituency_id IS NULL OR gp.mla_constituency_id = up.mla_constituency_id)
 AND (up.settlement_type IS NULL OR gp.settlement_type = up.settlement_type)
 AND (up.governing_body IS NULL OR gp.governing_body = up.governing_body)
 AND (up.local_body_id IS NULL OR gp.local_body_id = up.local_body_id)
 AND (up.hobali_id IS NULL OR gp.hobali_id = up.hobali_id)
 AND (up.gram_panchayat_id IS NULL OR gp.gram_panchayat_id = up.gram_panchayat_id)
 AND (up.main_village_id IS NULL OR gp.main_village_id = up.main_village_id)
 AND (up.sub_village_id IS NULL OR gp.sub_village_id = up.sub_village_id)
 AND (up.ward_number_id IS NULL OR gp.ward_number_id = up.ward_number_id)
 AND (up.polling_station_id IS NULL OR gp.polling_station_id = up.polling_station_id)
 AND (up.booth_number_id IS NULL OR gp.booth_number_id = up.booth_number_id)
WHERE up.status = 1
GROUP BY up.id, up.user_id;

UPDATE tbl_user_profile up
JOIN tmp_profile_geo_candidates tpgc
  ON tpgc.user_profile_id = up.id
SET
  up.geo_unit_id = tpgc.geo_unit_id,
  up.updated_at = NOW(),
  up.updated_by = COALESCE(up.updated_by, up.created_by, 1)
WHERE tpgc.matched_geo_units = 1
  AND up.status = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_invalid_user_access;
CREATE TEMPORARY TABLE tmp_invalid_user_access AS
SELECT ua.*
FROM tbl_user_access ua
WHERE ua.status = 1
  AND (
    (ua.state_id = -1 AND (
      COALESCE(ua.district_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.mp_constituency_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.mla_constituency_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.taluk_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.local_body_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.hobali_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.district_id = -1 AND (
      COALESCE(ua.mp_constituency_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.mla_constituency_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.taluk_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.local_body_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.hobali_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.mp_constituency_id = -1 AND (
      COALESCE(ua.mla_constituency_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.taluk_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.local_body_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.hobali_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.mla_constituency_id = -1 AND (
      COALESCE(ua.taluk_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.local_body_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.hobali_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.taluk_id = -1 AND (
      COALESCE(ua.local_body_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.hobali_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.local_body_id = -1 AND (
      COALESCE(ua.ward_number_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.hobali_id = -1 AND (
      COALESCE(ua.gram_panchayat_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.gram_panchayat_id = -1 AND (
      COALESCE(ua.main_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.main_village_id = -1 AND (
      COALESCE(ua.sub_village_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.sub_village_id = -1 AND (
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.ward_number_id = -1 AND (
      COALESCE(ua.polling_station_id, 0) NOT IN (0, -1) OR
      COALESCE(ua.booth_number_id, 0) NOT IN (0, -1)
    ))
    OR (ua.polling_station_id = -1 AND COALESCE(ua.booth_number_id, 0) NOT IN (0, -1))
  );

DROP TEMPORARY TABLE IF EXISTS tmp_orphan_user_access;
CREATE TEMPORARY TABLE tmp_orphan_user_access AS
SELECT ua.*
FROM tbl_user_access ua
LEFT JOIN tbl_user u
  ON u.id = ua.user_id
LEFT JOIN tbl_meta_user_role mur
  ON mur.id = ua.access_role_id
WHERE ua.status = 1
  AND (u.id IS NULL OR mur.id IS NULL);

DELETE FROM tbl_user_access_scope;

INSERT INTO tbl_user_access_scope (
  user_id,
  access_role_id,
  scope_type,
  scope_id,
  settlement_type,
  local_body_type,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  ua.user_id,
  ua.access_role_id,
  CASE
    WHEN ua.booth_number_id IS NOT NULL AND ua.booth_number_id NOT IN (0, -1) THEN 'BOOTH'
    WHEN ua.polling_station_id IS NOT NULL AND ua.polling_station_id NOT IN (0, -1) THEN 'POLLING_STATION'
    WHEN ua.ward_number_id IS NOT NULL AND ua.ward_number_id NOT IN (0, -1) THEN 'WARD'
    WHEN ua.sub_village_id IS NOT NULL AND ua.sub_village_id NOT IN (0, -1) THEN 'SUB_VILLAGE'
    WHEN ua.main_village_id IS NOT NULL AND ua.main_village_id NOT IN (0, -1) THEN 'MAIN_VILLAGE'
    WHEN ua.gram_panchayat_id IS NOT NULL AND ua.gram_panchayat_id NOT IN (0, -1) THEN 'GRAM_PANCHAYAT'
    WHEN ua.hobali_id IS NOT NULL AND ua.hobali_id NOT IN (0, -1) THEN 'HOBALI'
    WHEN ua.local_body_id IS NOT NULL AND ua.local_body_id NOT IN (0, -1) THEN 'LOCAL_BODY'
    WHEN ua.taluk_id IS NOT NULL AND ua.taluk_id NOT IN (0, -1) THEN 'TALUK'
    WHEN ua.mla_constituency_id IS NOT NULL AND ua.mla_constituency_id NOT IN (0, -1) THEN 'MLA_CONSTITUENCY'
    WHEN ua.mp_constituency_id IS NOT NULL AND ua.mp_constituency_id NOT IN (0, -1) THEN 'MP_CONSTITUENCY'
    WHEN ua.district_id IS NOT NULL AND ua.district_id NOT IN (0, -1) THEN 'DISTRICT'
    WHEN ua.state_id IS NOT NULL AND ua.state_id NOT IN (0, -1) THEN 'STATE'
    ELSE 'GLOBAL'
  END AS scope_type,
  CASE
    WHEN ua.booth_number_id IS NOT NULL AND ua.booth_number_id NOT IN (0, -1) THEN ua.booth_number_id
    WHEN ua.polling_station_id IS NOT NULL AND ua.polling_station_id NOT IN (0, -1) THEN ua.polling_station_id
    WHEN ua.ward_number_id IS NOT NULL AND ua.ward_number_id NOT IN (0, -1) THEN ua.ward_number_id
    WHEN ua.sub_village_id IS NOT NULL AND ua.sub_village_id NOT IN (0, -1) THEN ua.sub_village_id
    WHEN ua.main_village_id IS NOT NULL AND ua.main_village_id NOT IN (0, -1) THEN ua.main_village_id
    WHEN ua.gram_panchayat_id IS NOT NULL AND ua.gram_panchayat_id NOT IN (0, -1) THEN ua.gram_panchayat_id
    WHEN ua.hobali_id IS NOT NULL AND ua.hobali_id NOT IN (0, -1) THEN ua.hobali_id
    WHEN ua.local_body_id IS NOT NULL AND ua.local_body_id NOT IN (0, -1) THEN ua.local_body_id
    WHEN ua.taluk_id IS NOT NULL AND ua.taluk_id NOT IN (0, -1) THEN ua.taluk_id
    WHEN ua.mla_constituency_id IS NOT NULL AND ua.mla_constituency_id NOT IN (0, -1) THEN ua.mla_constituency_id
    WHEN ua.mp_constituency_id IS NOT NULL AND ua.mp_constituency_id NOT IN (0, -1) THEN ua.mp_constituency_id
    WHEN ua.district_id IS NOT NULL AND ua.district_id NOT IN (0, -1) THEN ua.district_id
    WHEN ua.state_id IS NOT NULL AND ua.state_id NOT IN (0, -1) THEN ua.state_id
    ELSE 0
  END AS scope_id,
  ua.settlement_type,
  ua.governing_body,
  ua.status,
  COALESCE(ua.created_by, 1),
  COALESCE(ua.updated_by, ua.created_by, 1),
  COALESCE(ua.created_at, NOW()),
  NOW()
FROM tbl_user_access ua
LEFT JOIN tmp_invalid_user_access tiua
  ON tiua.id = ua.id
LEFT JOIN tmp_orphan_user_access toua
  ON toua.id = ua.id
WHERE ua.status = 1
  AND tiua.id IS NULL
  AND toua.id IS NULL;

SELECT 'profile_geo_backfill_summary' AS section,
  COUNT(*) AS total_profiles,
  SUM(CASE WHEN matched_geo_units = 1 THEN 1 ELSE 0 END) AS uniquely_matched_profiles,
  SUM(CASE WHEN matched_geo_units = 0 THEN 1 ELSE 0 END) AS unmatched_profiles,
  SUM(CASE WHEN matched_geo_units > 1 THEN 1 ELSE 0 END) AS ambiguous_profiles
FROM tmp_profile_geo_candidates;

SELECT 'invalid_legacy_access_rows' AS section,
  COUNT(*) AS invalid_access_rows
FROM tmp_invalid_user_access;

SELECT 'orphan_legacy_access_rows' AS section,
  COUNT(*) AS orphan_access_rows
FROM tmp_orphan_user_access;

SELECT 'new_access_scope_summary' AS section,
  scope_type,
  COUNT(*) AS row_count
FROM tbl_user_access_scope
GROUP BY scope_type
ORDER BY row_count DESC, scope_type ASC;

SELECT 'profiles_without_geo_unit_after_update' AS section,
  COUNT(*) AS row_count
FROM tbl_user_profile
WHERE status = 1
  AND geo_unit_id IS NULL;

SELECT
  user_profile_id,
  user_id,
  matched_geo_units
FROM tmp_profile_geo_candidates
WHERE matched_geo_units <> 1
ORDER BY user_profile_id
LIMIT 100;

SELECT
  id,
  user_id,
  access_role_id,
  state_id,
  district_id,
  mp_constituency_id,
  mla_constituency_id,
  taluk_id,
  settlement_type,
  governing_body,
  local_body_id,
  hobali_id,
  gram_panchayat_id,
  main_village_id,
  sub_village_id,
  ward_number_id,
  polling_station_id,
  booth_number_id
FROM tmp_invalid_user_access
ORDER BY id
LIMIT 100;

SELECT
  id,
  user_id,
  access_role_id,
  status
FROM tmp_orphan_user_access
ORDER BY id
LIMIT 100;

-- Replace COMMIT with ROLLBACK if you want to dry-run this file again.
COMMIT;
