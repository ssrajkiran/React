const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* ==============================
   AUTH MIDDLEWARE
=============================== */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secret", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
};

/* ==============================
   HELPERS
=============================== */
const uid = (req) => req.user.id;

const TODO_SELECT = `
  SELECT id, title, description, priority,
         DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
         completed, created_at
FROM todos
`;

const formatTodo = (r) => ({ ...r, completed: r.completed === 1 });

/* ==============================
   GET TODO FORM CONFIG
=============================== */
router.get("/config", verifyToken, (req, res) => {
  db.query(
    `SELECT ff.id, ff.field_key, ff.field_label, ff.field_type,
            ff.placeholder, ff.default_value, ff.options,
            ff.is_required, ff.is_searchable, ff.is_sortable,
            ff.show_in_table, ff.show_in_form, ff.show_in_detail,
            ff.validation_regex, ff.validation_message,
            ff.min_value, ff.max_value, ff.min_length, ff.max_length,
            ff.depends_on, ff.depends_value, ff.help_text, ff.sort_order
     FROM form_configs fc
     JOIN form_fields ff ON ff.config_id = fc.id
     WHERE fc.module_name = 'todos' AND fc.is_active = 1
     ORDER BY ff.sort_order`,
    (err, fields) => {
      if (err) return res.status(500).json({ message: "Failed to fetch config" });
      const parsed = fields.map((f) => ({
        ...f,
        options: f.options ? (typeof f.options === "string" ? JSON.parse(f.options) : f.options) : null,
        is_required: !!f.is_required,
        is_searchable: !!f.is_searchable,
        is_sortable: !!f.is_sortable,
        show_in_table: !!f.show_in_table,
        show_in_form: !!f.show_in_form,
        show_in_detail: !!f.show_in_detail,
      }));
      res.json(parsed);
    }
  );
});

/* ==============================
   GET STATS  (before /:id)
=============================== */
router.get("/stats/summary", verifyToken, (req, res) => {
  db.query(
    `SELECT
       COUNT(*)           AS total,
       SUM(completed = 1) AS completed,
       SUM(completed = 0) AS active
     FROM todos
     WHERE user_id = ?`,
    [uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch stats" });
      const { total, completed, active } = results[0];
      res.json({ total, completed, active });
    }
  );
});

/* ==============================
   GET ALL TODOS
=============================== */
router.get("/", verifyToken, (req, res) => {
  const { filter = "All", search = "" } = req.query;

  db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todos'",
    (err, colRows) => {
      if (err) return res.status(500).json({ message: "Failed to fetch columns" });

      const cols = colRows.map((r) => r.COLUMN_NAME);
      const selectCols = ["id", "title", "description", "priority",
        "DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date",
        "completed", "created_at"
      ];

      cols.forEach((c) => {
        if (!["id","title","description","priority","due_date","completed","created_at","user_id"].includes(c)) {
          selectCols.push(`\`${c}\``);
        }
      });

      let sql = `SELECT ${selectCols.join(", ")} FROM todos WHERE user_id = ?`;
      const params = [uid(req)];

      if (filter === "Active")    { sql += " AND completed = 0"; }
      if (filter === "Completed") { sql += " AND completed = 1"; }

      if (search.trim()) {
        sql += " AND (title LIKE ? OR description LIKE ?)";
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      sql += " ORDER BY created_at DESC";

      db.query(sql, params, (err2, results) => {
        if (err2) return res.status(500).json({ message: "Failed to fetch todos" });
        const data = results.map(formatTodo);
        res.json({ data, total: data.length });
      });
    }
  );
});

/* ==============================
   GET SINGLE TODO
=============================== */
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM todos WHERE id = ? AND user_id = ?",
    [req.params.id, uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch todo" });
      if (!results.length) return res.status(404).json({ message: "Todo not found" });
      res.json(formatTodo(results[0]));
    }
  );
});

/* ==============================
   CREATE TODO
=============================== */
router.post("/create", verifyToken, (req, res) => {
  const body = req.body;
  const title = body.title || "";

  if (!title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todos'",
    (err, colRows) => {
      if (err) return res.status(500).json({ message: "Failed to load columns" });

      const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME));
      const cols = ["user_id"];
      const vals = [uid(req)];

      const coreFields = ["title", "description", "priority", "due_date"];
      const coreValues = {
        title: title.trim(),
        description: body.description || "",
        priority: body.priority || "Medium",
        due_date: body.due_date || null,
      };

      coreFields.forEach((k) => {
        if (existingCols.has(k)) {
          cols.push(k);
          vals.push(coreValues[k]);
        }
      });

      Object.keys(body).forEach((k) => {
        if (coreFields.includes(k)) return;
        if (k === "id" || k === "user_id" || k === "created_at" || k === "completed") return;
        if (existingCols.has(k)) {
          cols.push(k);
          vals.push(body[k]);
        }
      });

      const placeholders = cols.map(() => "?").join(", ");
      db.query(
        `INSERT INTO todos (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
        vals,
        (err2) => {
          if (err2) return res.status(500).json({ message: "Failed to create todo" });
          res.status(201).json({ message: "Todo created successfully" });
        }
      );
    }
  );
});

/* ==============================
   UPDATE TODO
=============================== */
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const body = req.body;

  if (body.title !== undefined && !String(body.title).trim()) {
    return res.status(400).json({ message: "Title cannot be empty" });
  }

  db.query(
    "SELECT * FROM todos WHERE id = ? AND user_id = ?",
    [id, uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch todo" });
      if (!results.length) return res.status(404).json({ message: "Todo not found" });

      db.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todos'",
        (err2, colRows) => {
          if (err2) return res.status(500).json({ message: "Failed to load columns" });

          const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME));
          const cur = results[0];
          const setClauses = [];
          const values = [];

          const coreMap = {
            title: body.title !== undefined ? String(body.title).trim() : cur.title,
            description: body.description !== undefined ? body.description : cur.description,
            priority: body.priority !== undefined ? body.priority : cur.priority,
            due_date: body.due_date !== undefined ? (body.due_date || null) : cur.due_date,
            completed: body.completed !== undefined ? (body.completed ? 1 : 0) : cur.completed,
          };

          Object.entries(coreMap).forEach(([k, v]) => {
            if (existingCols.has(k)) {
              setClauses.push(`\`${k}\` = ?`);
              values.push(v);
            }
          });

          Object.keys(body).forEach((k) => {
            if (k in coreMap) return;
            if (k === "id" || k === "user_id" || k === "created_at") return;
            if (existingCols.has(k)) {
              setClauses.push(`\`${k}\` = ?`);
              values.push(body[k]);
            }
          });

          if (setClauses.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
          }

          values.push(id, uid(req));

          db.query(
            `UPDATE todos SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?`,
            values,
            (err3, result) => {
              if (err3) return res.status(500).json({ message: "Failed to update todo" });
              if (result.affectedRows === 0) return res.status(404).json({ message: "Todo not found" });
              res.json({ message: "Todo updated successfully" });
            }
          );
        }
      );
    }
  );
});

/* ==============================
   DELETE TODO
=============================== */
router.delete("/:id", verifyToken, (req, res) => {
  db.query(
    "DELETE FROM todos WHERE id = ? AND user_id = ?",
    [req.params.id, uid(req)],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to delete todo" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Todo not found" });
      res.json({ message: "Todo deleted successfully" });
    }
  );
});

module.exports = router;
