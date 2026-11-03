const db = require("../config/db");

// Freezed modules shown by default in the timesheet module dropdown for every project.
// They are NOT stored as task/module rows - they only exist as a timesheet value
// ("FV::<name>") and report as status "Completed" whenever an entry is made.
const FREEZED_MODULES = [
  "Requirement Gathering",
  "Meeting & Discussion",
  "Document Preparation",
  "Deployment",
  "KT",
  "Enhancement",
];

const FREEZED_PREFIX = "FV::";

const isFreezedName = (name) =>
  FREEZED_MODULES.includes(String(name || "").trim());

const fvValue = (name) => FREEZED_PREFIX + String(name).trim();

// Accepts "FV::<name>" (virtual freezed value) or a plain freezed module name.
// Returns the module name, or null when the value is not a freezed module.
const parseFreezedValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (str.startsWith(FREEZED_PREFIX)) {
    const name = str.slice(FREEZED_PREFIX.length).trim();
    return isFreezedName(name) ? name : null;
  }
  return isFreezedName(str) ? str : null;
};

// Quoted SQL literal list: 'Requirement Gathering','Meeting & Discussion',...
const freezedLiterals = () =>
  FREEZED_MODULES.map((n) => `'${n.replace(/'/g, "''")}'`).join(",");

// Module name for a timesheet entry (handles freezed values, normal modules, permission rows, meeting rows)
const taskNameSql = (ts = "ts", t = "t") =>
  `IFNULL(${t}.task, CASE
    WHEN ${ts}.task LIKE 'FV::%' THEN SUBSTRING(${ts}.task, 5)
    WHEN ${ts}.task = 'MEETING' OR ${ts}.entry_type = 'meeting' THEN IFNULL(NULLIF(${ts}.work_description, ''), 'Meeting')
    WHEN LOWER(IFNULL(${ts}.work_description, '')) LIKE '%meeting%' THEN IFNULL(NULLIF(${ts}.work_description, ''), 'Meeting')
    WHEN ${ts}.task = 'BREAK' OR ${ts}.entry_type IN ('break', 'permission') THEN 'Break'
    WHEN LOWER(IFNULL(${ts}.work_description, '')) IN ('break', 'permission') THEN 'Break'
    ELSE IFNULL(${ts}.work_description, 'Break')
  END)`;

// Module status for a timesheet entry - freezed modules and meetings are always Completed
const taskStatusSql = (ts = "ts", t = "t") =>
  `CASE
    WHEN ${t}.task IN (${freezedLiterals()}) OR ${ts}.task LIKE 'FV::%' THEN 'Completed'
    WHEN ${t}.status IS NOT NULL THEN ${t}.status
    WHEN ${ts}.task = 'MEETING' OR ${ts}.entry_type = 'meeting' THEN 'Completed'
    WHEN LOWER(IFNULL(${ts}.work_description, '')) LIKE '%meeting%' THEN 'Completed'
    WHEN ${ts}.task = 'BREAK' OR ${ts}.entry_type IN ('break', 'permission') THEN 'Break'
    WHEN LOWER(IFNULL(${ts}.work_description, '')) IN ('break', 'permission') THEN 'Break'
    WHEN ${ts}.work_description IN ('Break', 'Permission') THEN 'Break'
    ELSE 'Break'
  END`;

// Project name fallback: if no project row joined, distinguish Meeting vs Permission
const projectNameSql = (ts = "ts", p = "p") =>
  `CASE
    WHEN ${p}.project_name IS NOT NULL THEN ${p}.project_name
    WHEN ${ts}.task = 'MEETING' OR ${ts}.entry_type = 'meeting' THEN 'Meeting'
    WHEN LOWER(IFNULL(${ts}.work_description, '')) LIKE '%meeting%' THEN 'Meeting'
    WHEN ${ts}.task = 'BREAK' OR ${ts}.entry_type IN ('break', 'permission') THEN 'Break'
    WHEN LOWER(IFNULL(${ts}.work_description, '')) IN ('break', 'permission') THEN 'Break'
    WHEN ${ts}.work_description IN ('Break', 'Permission') THEN 'Break'
    ELSE 'Break'
  END`;

// Status for a task-row based query (no timesheet alias needed) - freezed names are always Completed
const taskRowStatusSql = (t = "t") =>
  `CASE WHEN ${t}.task IN (${freezedLiterals()}) THEN 'Completed' ELSE ${t}.status END`;

// Project join that also works for freezed (virtual) entries via timesheet.project_id
const projectJoinSql = (ts = "ts", t = "t") =>
  `LEFT JOIN projects p ON COALESCE(${t}.project_id, ${ts}.project_id) = p.id`;

const columnExists = (tableName, columnName, cb) => {
  db.query(
    "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
    (err, rows) => {
      if (err) return cb(err);
      cb(null, Number(rows[0] && rows[0].c) > 0);
    }
  );
};

// One-time migrations:
// 1. add timesheet.project_id (needed to report the project of freezed entries)
// 2. remove freezed modules that were previously created as task rows -
//    their timesheet entries are converted to virtual "FV::<name>" values first
// 3. add timesheet.entry_type (to distinguish 'project', 'permission', 'meeting')
function runFreezedMigrations(callback) {
  const ensureEntryType = (done) => {
    columnExists("timesheet", "entry_type", (errEt, existsEt) => {
      if (errEt) return done(errEt);
      if (existsEt) return done(null);
      db.query(
        "ALTER TABLE timesheet ADD COLUMN entry_type VARCHAR(20) DEFAULT 'project' AFTER project_id",
        (errAlter) => {
          if (errAlter) return done(errAlter);
          console.log("Migration: added timesheet.entry_type column");
          db.query(
            `UPDATE timesheet
             SET entry_type = CASE
               WHEN work_description IN ('Break', 'Permission') THEN 'break'
               WHEN LOWER(IFNULL(work_description, '')) LIKE '%meeting%' THEN 'meeting'
               WHEN task IS NOT NULL OR project_id IS NOT NULL THEN 'project'
               ELSE 'break'
             END,
             work_description = CASE
               WHEN work_description = 'Permission' THEN 'Break'
               ELSE work_description
             END
             WHERE entry_type IS NULL OR entry_type = '' OR entry_type = 'permission' OR work_description = 'Permission'`,
            () => done(null)
          );
        }
      );
    });
  };

  columnExists("timesheet", "project_id", (err, exists) => {
    if (err) return callback(err);

    const convertAndDelete = () => {
      const lits = freezedLiterals();
      const convertSql = `
        UPDATE timesheet ts
        JOIN task t ON ts.task = t.id
        SET ts.project_id = IFNULL(ts.project_id, t.project_id),
            ts.task = CONCAT('${FREEZED_PREFIX}', t.task)
        WHERE t.task IN (${lits})
          AND t.assigned_to = ''
          AND t.status = 'Completed'
      `;
      db.query(convertSql, (err2) => {
        if (err2) return callback(err2);
        const deleteSql = `
          DELETE FROM task
          WHERE task IN (${lits}) AND assigned_to = '' AND status = 'Completed'
        `;
        db.query(deleteSql, (err3, result) => {
          if (err3) return callback(err3);
          if (result && result.affectedRows > 0) {
            console.log(`Freezed modules cleanup: removed ${result.affectedRows} seeded task row(s)`);
          }
          ensureEntryType(callback);
        });
      });
    };

    if (exists) return convertAndDelete();

    db.query("ALTER TABLE timesheet ADD COLUMN project_id INT NULL AFTER task", (err2) => {
      if (err2) return callback(err2);
      console.log("Migration: added timesheet.project_id column");
      convertAndDelete();
    });
  });
}

module.exports = {
  FREEZED_MODULES,
  FREEZED_PREFIX,
  isFreezedName,
  fvValue,
  parseFreezedValue,
  freezedLiterals,
  taskNameSql,
  taskStatusSql,
  taskRowStatusSql,
  projectJoinSql,
  projectNameSql,
  columnExists,
  runFreezedMigrations,
};
