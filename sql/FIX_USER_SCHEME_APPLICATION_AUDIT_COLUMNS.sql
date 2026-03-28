ALTER TABLE tbl_user_scheme_applications
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER rejection_reason,
  ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by;
