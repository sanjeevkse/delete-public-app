INSERT INTO tbl_meta_scheme_type_lookup (
  disp_name,
  description,
  status,
  created_by,
  updated_by
)
SELECT
  'General',
  'Inserted for geo API end-to-end test coverage',
  1,
  1,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM tbl_meta_scheme_type_lookup
  WHERE LOWER(disp_name) = 'general'
);
