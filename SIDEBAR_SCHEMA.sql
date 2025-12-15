-- MySQL queries to create junction tables for dynamic sidebar system
-- No migrations - just raw SQL to execute

-- 1. Junction table for Role-based Sidebars
CREATE TABLE `tbl_xref_role_sidebar` (
  `role_id` bigint unsigned NOT NULL,
  `sidebar_id` int unsigned NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `sidebar_id`),
  KEY `fk_rs_sidebar` (`sidebar_id`),
  CONSTRAINT `fk_rs_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_meta_user_role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rs_sidebar` FOREIGN KEY (`sidebar_id`) REFERENCES `tbl_sidebar` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Junction table for Permission Group-based Sidebars
CREATE TABLE `tbl_xref_permission_group_sidebar` (
  `permission_group_id` bigint unsigned NOT NULL,
  `sidebar_id` int unsigned NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_group_id`, `sidebar_id`),
  KEY `fk_pgs_sidebar` (`sidebar_id`),
  CONSTRAINT `fk_pgs_permission_group` FOREIGN KEY (`permission_group_id`) REFERENCES `tbl_meta_permission_group` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pgs_sidebar` FOREIGN KEY (`sidebar_id`) REFERENCES `tbl_sidebar` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Example: Make sidebar 1 (Posts) available to Admin role (role_id = 1)
-- INSERT INTO `tbl_xref_role_sidebar` (role_id, sidebar_id, status, created_by, updated_by) 
-- VALUES (1, 1, 1, 1, 1);

-- Example: Make sidebar 5 (Scheme Type & Flow) only for permission group 5 (role-based access)
-- INSERT INTO `tbl_xref_permission_group_sidebar` (permission_group_id, sidebar_id, status, created_by, updated_by)
-- VALUES (5, 5, 1, 1, 1);

-- Logic for determining sidebar type (no type column needed):
-- 1. Public sidebar: No entries in either junction table (not assigned to any role or permission group)
-- 2. Role-based sidebar: Has entries in tbl_xref_role_sidebar
-- 3. Permission-based sidebar: Has entries in tbl_xref_permission_group_sidebar
-- (A sidebar can be both role AND permission-based by having entries in both tables)
