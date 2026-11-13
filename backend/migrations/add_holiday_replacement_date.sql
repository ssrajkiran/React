-- ============================================================
-- Replacement working day for holidays
-- Example: Diwali is a holiday; the admin picks another date
-- (e.g. the adjacent Saturday) which then works as a NORMAL
-- office day, even if it falls on a weekend.
-- ============================================================
ALTER TABLE holidays
  ADD COLUMN replacement_date DATE NULL DEFAULT NULL;

-- Keep the dynamic CRUD module (/admin/dynamic/holidays) in sync
INSERT INTO form_fields
  (config_id, field_key, field_label, field_type, placeholder, default_value, is_required,
   is_searchable, is_sortable, show_in_table, show_in_form, show_in_detail,
   help_text, sort_order)
SELECT
  c.id, 'replacement_date', 'Replacement Working Day', 'date', 'Optional', NULL, 0,
  0, 1, 1, 1, 1,
  'Date that will act as a normal working day to cover this holiday (e.g. the Saturday worked while the holiday is off)', 4
FROM form_configs c
WHERE c.module_name = 'holidays'
  AND NOT EXISTS (
    SELECT 1 FROM form_fields f
    WHERE f.config_id = c.id AND f.field_key = 'replacement_date'
  );
