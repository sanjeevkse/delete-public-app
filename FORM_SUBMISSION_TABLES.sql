-- Form Submission Table
CREATE TABLE IF NOT EXISTS `tbl_form_submission` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `form_event_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `submission_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) COLLATE utf8mb4_unicode_ci NULL,
  `user_agent` VARCHAR(500) COLLATE utf8mb4_unicode_ci NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=submitted, 2=reviewed, 3=rejected',
  `notes` LONGTEXT COLLATE utf8mb4_unicode_ci NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_form_event_id` (`form_event_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_form_event_user` (`form_event_id`, `user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submission_date` (`submission_date`),
  CONSTRAINT `fk_form_submission_form_event` FOREIGN KEY (`form_event_id`) REFERENCES `tbl_form_event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_form_submission_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Form Field Value Table
CREATE TABLE IF NOT EXISTS `tbl_form_field_value` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `form_submission_id` BIGINT UNSIGNED NOT NULL,
  `form_field_id` BIGINT UNSIGNED NOT NULL,
  `field_key` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` LONGTEXT COLLATE utf8mb4_unicode_ci NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_form_submission_id` (`form_submission_id`),
  KEY `idx_form_field_id` (`form_field_id`),
  KEY `idx_field_key` (`field_key`),
  CONSTRAINT `fk_form_field_value_submission` FOREIGN KEY (`form_submission_id`) REFERENCES `tbl_form_submission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_form_field_value_field` FOREIGN KEY (`form_field_id`) REFERENCES `tbl_form_field` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
