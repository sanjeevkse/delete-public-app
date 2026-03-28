-- Geo ideal architecture reconciliation
-- Creates review tables for:
-- 1. user profiles that still do not have geo_unit_id
-- 2. candidate geo units for unresolved profiles
-- 3. orphan legacy user access rows skipped during access-scope backfill

DROP TABLE IF EXISTS stg_geo_profile_reconciliation;
CREATE TABLE stg_geo_profile_reconciliation AS
SELECT
  up.id AS user_profile_id,
  up.user_id,
  up.state_id,
  up.district_id,
  up.taluk_id,
  up.mp_constituency_id,
  up.mla_constituency_id,
  up.settlement_type,
  up.governing_body,
  up.local_body_id,
  up.hobali_id,
  up.gram_panchayat_id,
  up.main_village_id,
  up.sub_village_id,
  up.ward_number_id,
  up.polling_station_id,
  up.booth_number_id,
  COUNT(gp.id) AS candidate_count,
  CASE
    WHEN COUNT(gp.id) = 0 THEN 'NO_MATCH'
    WHEN COUNT(gp.id) = 1 THEN 'UNIQUE'
    ELSE 'AMBIGUOUS'
  END AS reconciliation_status
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
  AND up.geo_unit_id IS NULL
GROUP BY
  up.id,
  up.user_id,
  up.state_id,
  up.district_id,
  up.taluk_id,
  up.mp_constituency_id,
  up.mla_constituency_id,
  up.settlement_type,
  up.governing_body,
  up.local_body_id,
  up.hobali_id,
  up.gram_panchayat_id,
  up.main_village_id,
  up.sub_village_id,
  up.ward_number_id,
  up.polling_station_id,
  up.booth_number_id;

ALTER TABLE stg_geo_profile_reconciliation
  ADD PRIMARY KEY (user_profile_id),
  ADD KEY idx_stg_geo_profile_reconciliation_status (reconciliation_status),
  ADD KEY idx_stg_geo_profile_reconciliation_user (user_id);

DROP TABLE IF EXISTS stg_geo_profile_reconciliation_candidates;
CREATE TABLE stg_geo_profile_reconciliation_candidates AS
SELECT
  up.id AS user_profile_id,
  up.user_id,
  gp.id AS candidate_geo_unit_id,
  gp.state_id,
  gp.district_id,
  gp.taluk_id,
  gp.mp_constituency_id,
  gp.mla_constituency_id,
  gp.settlement_type,
  gp.governing_body,
  gp.local_body_id,
  gp.hobali_id,
  gp.gram_panchayat_id,
  gp.main_village_id,
  gp.sub_village_id,
  gp.ward_number_id,
  gp.polling_station_id,
  gp.booth_number_id
FROM tbl_user_profile up
JOIN tbl_geo_political gp
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
  AND up.geo_unit_id IS NULL;

ALTER TABLE stg_geo_profile_reconciliation_candidates
  ADD KEY idx_stg_geo_profile_reconciliation_candidates_profile (user_profile_id),
  ADD KEY idx_stg_geo_profile_reconciliation_candidates_geo_unit (candidate_geo_unit_id);

DROP TABLE IF EXISTS stg_geo_orphan_user_access;
CREATE TABLE stg_geo_orphan_user_access AS
SELECT
  ua.id AS user_access_id,
  ua.user_id,
  ua.access_role_id,
  ua.state_id,
  ua.district_id,
  ua.taluk_id,
  ua.settlement_type,
  ua.governing_body,
  ua.local_body_id,
  ua.hobali_id,
  ua.gram_panchayat_id,
  ua.main_village_id,
  ua.sub_village_id,
  ua.ward_number_id,
  ua.polling_station_id,
  ua.booth_number_id,
  CASE
    WHEN u.id IS NULL AND mur.id IS NULL THEN 'MISSING_USER_AND_ROLE'
    WHEN u.id IS NULL THEN 'MISSING_USER'
    WHEN mur.id IS NULL THEN 'MISSING_ROLE'
    ELSE 'UNKNOWN'
  END AS orphan_reason,
  ua.status
FROM tbl_user_access ua
LEFT JOIN tbl_user u
  ON u.id = ua.user_id
LEFT JOIN tbl_meta_user_role mur
  ON mur.id = ua.access_role_id
WHERE ua.status = 1
  AND (u.id IS NULL OR mur.id IS NULL);

ALTER TABLE stg_geo_orphan_user_access
  ADD PRIMARY KEY (user_access_id),
  ADD KEY idx_stg_geo_orphan_user_access_reason (orphan_reason);

SELECT
  reconciliation_status,
  COUNT(*) AS row_count
FROM stg_geo_profile_reconciliation
GROUP BY reconciliation_status
ORDER BY row_count DESC, reconciliation_status ASC;

SELECT
  orphan_reason,
  COUNT(*) AS row_count
FROM stg_geo_orphan_user_access
GROUP BY orphan_reason
ORDER BY row_count DESC, orphan_reason ASC;
