-- Add on-behalf target user support to form submissions.
-- submitted_by = actor, user_id = target user.

ALTER TABLE tbl_form_submission
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER submitted_by;

ALTER TABLE tbl_form_submission
  ADD INDEX idx_form_submission_user_id (user_id);
