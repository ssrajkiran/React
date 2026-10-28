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

// Module name for a timesheet entry (handles freezed values, normal modules, permission rows)
const taskNameSql = (ts = "ts", t = "t") =>
  `IFNULL(${t}.task, CASE WHEN ${ts}.task LIKE 'FV::%' THEN SUBSTRING(${ts}.task, 5) ELSE ${ts}.work_description END)`;

// Module status for a timesheet entry - freezed modules are always Completed
const taskStatusSql = (ts = "ts", t = "t") =>
  `CASE WHEN ${t}.task IN (${freezedLiterals()}) OR ${ts}.task LIKE 'FV::%' THEN 'Completed' ELSE IFNULL(${t}.status, 'Permission') END`;

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
function runFreezedMigrations(callback) {
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
          callback(null);
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
  runFreezedMigrations,
};
