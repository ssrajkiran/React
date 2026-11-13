-- Migration: Add compensation flag to holidays table
-- Run this against the leave_system database
-- has_compensation = 1 → working on this holiday earns a comp-off
-- has_compensation = 0 → no comp-off for working on this holiday (weekends are unaffected)

ALTER TABLE holidays
  ADD COLUMN has_compensation TINYINT(1) NOT NULL DEFAULT 1 AFTER date;

-- Keep the dynamic CRUD module (/admin/dynamic/holidays) in sync
INSERT INTO form_fields
  (config_id, field_key, field_label, field_type, placeholder, default_value, is_required,
   is_searchable, is_sortable, show_in_table, show_in_form, show_in_detail,
   help_text, sort_order)
SELECT
  c.id, 'has_compensation', 'Compensation (Comp-off)', 'toggle', '', '1', 0,
  0, 1, 1, 1, 1,
  'Working on this holiday earns a compensatory day off', 3
FROM form_configs c
WHERE c.module_name = 'holidays'
  AND NOT EXISTS (
    SELECT 1 FROM form_fields f
    WHERE f.config_id = c.id AND f.field_key = 'has_compensation'
  );
