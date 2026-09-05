CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  menu_key VARCHAR(100) NOT NULL,
  can_view TINYINT(1) DEFAULT 1,
  can_create TINYINT(1) DEFAULT 0,
  can_edit TINYINT(1) DEFAULT 0,
  can_delete TINYINT(1) DEFAULT 0,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_menu (role_id, menu_key)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('employee', 'Standard employee access');

-- Admin permissions (full access to everything)
INSERT INTO role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete) VALUES
  (1, 'dashboard', 1, 0, 0, 0),
  (1, 'leave_dashboard', 1, 0, 0, 0),
  (1, 'timesheet_dashboard', 1, 0, 0, 0),
  (1, 'attendance', 1, 1, 1, 1),
  (1, 'attendance_report', 1, 0, 0, 0),
  (1, 'task', 1, 1, 1, 1),
  (1, 'task_report', 1, 0, 0, 0),
  (1, 'timesheet', 1, 1, 1, 1),
  (1, 'ai_summary', 1, 1, 0, 0),
  (1, 'summary_history', 1, 0, 0, 0),
  (1, 'users', 1, 1, 1, 1),
  (1, 'holidays', 1, 1, 1, 1),
  (1, 'roles', 1, 1, 1, 1),
  (1, 'todo', 1, 1, 1, 1),
  (1, 'profile', 1, 1, 0, 0);

-- Employee permissions (limited access)
INSERT INTO role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete) VALUES
  (2, 'dashboard', 1, 0, 0, 0),
  (2, 'leave_dashboard', 1, 0, 0, 0),
  (2, 'timesheet_dashboard', 1, 0, 0, 0),
  (2, 'attendance', 1, 1, 0, 0),
  (2, 'attendance_report', 0, 0, 0, 0),
  (2, 'task', 1, 0, 0, 0),
  (2, 'task_report', 0, 0, 0, 0),
  (2, 'timesheet', 1, 1, 0, 0),
  (2, 'ai_summary', 0, 0, 0, 0),
  (2, 'summary_history', 0, 0, 0, 0),
  (2, 'users', 0, 0, 0, 0),
  (2, 'holidays', 0, 0, 0, 0),
  (2, 'roles', 0, 0, 0, 0),
  (2, 'todo', 1, 1, 1, 1),
  (2, 'profile', 1, 1, 0, 0);
