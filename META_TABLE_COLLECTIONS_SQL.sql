CREATE TABLE IF NOT EXISTS `tbl_meta_table_collection` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `disp_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_table_collection_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tbl_meta_table_registry_collection` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` int unsigned NOT NULL,
  `registry_id` int unsigned NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_meta_table_registry_collection` (`collection_id`,`registry_id`),
  KEY `idx_meta_table_registry_collection_collection_id` (`collection_id`),
  KEY `idx_meta_table_registry_collection_registry_id` (`registry_id`),
  CONSTRAINT `fk_meta_table_registry_collection_collection`
    FOREIGN KEY (`collection_id`) REFERENCES `tbl_meta_table_collection` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_meta_table_registry_collection_registry`
    FOREIGN KEY (`registry_id`) REFERENCES `tbl_meta_table_registry` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
