CREATE TABLE IF NOT EXISTS intercom_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(255) NOT NULL,
  sno INT NOT NULL,
  name VARCHAR(500) NOT NULL,
  intercom VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_intercom_name ON intercom_list(name);
CREATE INDEX idx_intercom_number ON intercom_list(intercom);
CREATE INDEX idx_intercom_dept ON intercom_list(department);
