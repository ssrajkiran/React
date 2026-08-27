-- ============================================
-- Dynamic CRUD Form Configuration System
-- ============================================

CREATE TABLE IF NOT EXISTS form_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_name VARCHAR(100) NOT NULL UNIQUE,
  table_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  api_route VARCHAR(200) NOT NULL,
  icon VARCHAR(50) DEFAULT 'bi-grid',
  primary_color VARCHAR(20) DEFAULT '#5048E5',
  menu_key VARCHAR(100) DEFAULT NULL,
  search_placeholder VARCHAR(200) DEFAULT 'Search...',
  page_title VARCHAR(200) DEFAULT 'All Items',
  empty_message VARCHAR(200) DEFAULT 'No items found',
  empty_sub_message VARCHAR(200) DEFAULT 'Add your first item to get started',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(150) NOT NULL,
  field_type ENUM(
    'text','number','email','password','tel','url',
    'textarea','select','multi-select',
    'date','datetime-local','time',
    'checkbox','radio','toggle',
    'file','image',
    'hidden','readonly'
  ) NOT NULL DEFAULT 'text',
  placeholder VARCHAR(200) DEFAULT '',
  default_value VARCHAR(500) DEFAULT NULL,
  options JSON DEFAULT NULL,
  is_required TINYINT(1) DEFAULT 0,
  is_searchable TINYINT(1) DEFAULT 0,
  is_sortable TINYINT(1) DEFAULT 1,
  is_unique TINYINT(1) DEFAULT 0,
  show_in_table TINYINT(1) DEFAULT 1,
  show_in_form TINYINT(1) DEFAULT 1,
  show_in_detail TINYINT(1) DEFAULT 1,
  table_width VARCHAR(20) DEFAULT 'auto',
  table_align ENUM('left','center','right') DEFAULT 'left',
  validation_regex VARCHAR(500) DEFAULT NULL,
  validation_message VARCHAR(300) DEFAULT NULL,
  min_value VARCHAR(50) DEFAULT NULL,
  max_value VARCHAR(50) DEFAULT NULL,
  min_length INT DEFAULT NULL,
  max_length INT DEFAULT NULL,
  depends_on VARCHAR(100) DEFAULT NULL,
  depends_value VARCHAR(200) DEFAULT NULL,
  help_text VARCHAR(300) DEFAULT '',
  sort_order INT DEFAULT 0,
  FOREIGN KEY (config_id) REFERENCES form_configs(id) ON DELETE CASCADE
);

-- ============================================
-- Seed: Holidays module as proof of concept
-- ============================================

INSERT INTO form_configs (module_name, table_name, display_name, api_route, icon, primary_color, menu_key, search_placeholder, page_title, empty_message, empty_sub_message)
VALUES (
  'holidays',
  'holidays',
  'Holidays',
  '/api/crud/holidays',
  'bi-calendar-event',
  '#5048E5',
  'holidays',
  'Search holidays...',
  'All Holidays',
  'No holidays found',
  'Add your first holiday to get started'
);

SET @holidays_config_id = LAST_INSERT_ID();

INSERT INTO form_fields (config_id, field_key, field_label, field_type, placeholder, is_required, is_searchable, is_sortable, show_in_table, show_in_form, table_width, sort_order)
VALUES
  (@holidays_config_id, 'name', 'Holiday Name', 'text', 'e.g. Christmas Day', 1, 1, 1, 1, 1, 'auto', 1),
  (@holidays_config_id, 'date', 'Date', 'date', '', 1, 0, 1, 1, 1, 'auto', 2);

-- ============================================
-- Seed: Projects module
-- ============================================

INSERT INTO form_configs (module_name, table_name, display_name, api_route, icon, primary_color, menu_key, search_placeholder, page_title, empty_message, empty_sub_message)
VALUES (
  'projects',
  'projects',
  'Projects',
  '/api/crud/projects',
  'bi-kanban',
  '#059669',
  NULL,
  'Search projects...',
  'All Projects',
  'No projects found',
  'Add your first project to get started'
);

SET @projects_config_id = LAST_INSERT_ID();

INSERT INTO form_fields (config_id, field_key, field_label, field_type, placeholder, is_required, is_searchable, is_sortable, show_in_table, show_in_form, sort_order)
VALUES
  (@projects_config_id, 'project_name', 'Project Name', 'text', 'e.g. Website Redesign', 1, 1, 1, 1, 1, 1);

-- ============================================
-- Seed: Todos module
-- ============================================

INSERT INTO form_configs (module_name, table_name, display_name, api_route, icon, primary_color, menu_key, search_placeholder, page_title, empty_message, empty_sub_message)
VALUES (
  'todos',
  'todos',
  'Todos',
  '/api/crud/todos',
  'bi-check2-square',
  '#D97706',
  'todo',
  'Search todos...',
  'All Todos',
  'No todos found',
  'Add your first todo to get started'
);

SET @todos_config_id = LAST_INSERT_ID();

INSERT INTO form_fields (config_id, field_key, field_label, field_type, placeholder, is_required, is_searchable, is_sortable, show_in_table, show_in_form, options, sort_order)
VALUES
  (@todos_config_id, 'title', 'Title', 'text', 'e.g. Buy groceries', 1, 1, 1, 1, 1, NULL, 1),
  (@todos_config_id, 'description', 'Description', 'textarea', 'Describe the task...', 0, 0, 0, 0, 1, NULL, 2),
  (@todos_config_id, 'priority', 'Priority', 'select', '', 0, 1, 1, 1, 1, '["Low","Medium","High"]', 3),
  (@todos_config_id, 'due_date', 'Due Date', 'date', '', 0, 0, 1, 1, 1, NULL, 4),
  (@todos_config_id, 'completed', 'Completed', 'toggle', '', 0, 0, 0, 1, 1, NULL, 5);
