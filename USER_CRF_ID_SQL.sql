-- 1) Add the new column (nullable first to allow backfill)
ALTER TABLE `tbl_user`
  ADD COLUMN `crf_id` BIGINT UNSIGNED NULL AFTER `id`;

-- 2) Backfill existing users in deterministic order (oldest first)
SET @next_crf_id := (
  SELECT COALESCE(MAX(`crf_id`), 0) FROM `tbl_user`
);

UPDATE `tbl_user` u
JOIN (
  SELECT
    `id`,
    (@next_crf_id := @next_crf_id + 1) AS next_crf_id
  FROM `tbl_user`
  WHERE `crf_id` IS NULL
  ORDER BY `created_at` ASC, `id` ASC
) seq ON seq.`id` = u.`id`
SET u.`crf_id` = seq.next_crf_id;

-- 3) Enforce non-null + uniqueness
ALTER TABLE `tbl_user`
  MODIFY COLUMN `crf_id` BIGINT UNSIGNED NOT NULL,
  ADD UNIQUE KEY `uk_tbl_user_crf_id` (`crf_id`);

