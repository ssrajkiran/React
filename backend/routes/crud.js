const router = require("express").Router();
const db = require("../config/db");

// ══════════════════════════════════════════
// ADMIN: Manage form_configs themselves
// (MUST be before /:module routes)
// ══════════════════════════════════════════

// GET /api/crud/admin/all  →  All configs (including inactive)
router.get("/admin/all", (req, res) => {
  db.query("SELECT * FROM form_configs ORDER BY id", (err, configs) => {
    if (err) return res.status(500).json({ message: "Query failed" });
    res.json(configs);
  });
});

// GET /api/crud/admin/:id  →  Config with fields
router.get("/admin/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM form_configs WHERE id=?", [id], (err, configs) => {
    if (err) return res.status(500).json({ message: "Query failed" });
    if (!configs.length) return res.status(404).json({ message: "Config not found" });

    db.query("SELECT * FROM form_fields WHERE config_id=? ORDER BY sort_order", [id], (err2, fields) => {
      if (err2) return res.status(500).json({ message: "Fields query failed" });
      res.json({ config: configs[0], fields });
    });
  });
});

// POST /api/crud/admin  →  Create config
router.post("/admin", (req, res) => {
  const { config, fields } = req.body;
  if (!config || !config.module_name || !config.table_name) {
    return res.status(400).json({ message: "module_name and table_name are required" });
  }

  db.query(
    "INSERT INTO form_configs (module_name, table_name, display_name, api_route, icon, primary_color, menu_key, search_placeholder, page_title, empty_message, empty_sub_message, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      config.module_name,
      config.table_name,
      config.display_name || config.module_name,
      config.api_route || `/api/crud/${config.module_name}`,
      config.icon || "bi-grid",
      config.primary_color || "#5048E5",
      config.menu_key || null,
      config.search_placeholder || "Search...",
      config.page_title || "All Items",
      config.empty_message || "No items found",
      config.empty_sub_message || "Add your first item to get started",
      config.is_active !== undefined ? (config.is_active ? 1 : 0) : 1,
    ],
    (err, result) => {
      if (err) {
        console.error("Config insert error:", err);
        return res.status(500).json({ message: "Failed to create config", error: err.message });
      }

      const configId = result.insertId;

      if (fields && fields.length) {
        const fieldValues = fields.map((f, i) => [
          configId,
          f.field_key,
          f.field_label,
          f.field_type || "text",
          f.placeholder || "",
          f.default_value || null,
          f.options ? JSON.stringify(f.options) : null,
          f.is_required ? 1 : 0,
          f.is_searchable ? 1 : 0,
          f.is_sortable !== undefined ? (f.is_sortable ? 1 : 0) : 1,
          f.is_unique ? 1 : 0,
          f.show_in_table !== undefined ? (f.show_in_table ? 1 : 0) : 1,
          f.show_in_form !== undefined ? (f.show_in_form ? 1 : 0) : 1,
          f.show_in_detail !== undefined ? (f.show_in_detail ? 1 : 0) : 1,
          f.table_width || "auto",
          f.table_align || "left",
          f.validation_regex || null,
          f.validation_message || null,
          f.min_value || null,
          f.max_value || null,
          f.min_length || null,
          f.max_length || null,
          f.depends_on || null,
          f.depends_value || null,
          f.help_text || "",
          f.sort_order !== undefined ? f.sort_order : i,
        ]);

        let inserted = 0;
        fieldValues.forEach((v) => {
          db.query(
            "INSERT INTO form_fields (config_id, field_key, field_label, field_type, placeholder, default_value, options, is_required, is_searchable, is_sortable, is_unique, show_in_table, show_in_form, show_in_detail, table_width, table_align, validation_regex, validation_message, min_value, max_value, min_length, max_length, depends_on, depends_value, help_text, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            v,
            (err2) => {
              if (err2) console.error("Field insert error:", err2);
              inserted++;
              if (inserted === fieldValues.length) {
                res.json({ message: "Config created successfully", id: configId });
              }
            }
          );
        });
      } else {
        res.json({ message: "Config created successfully", id: configId });
      }
    }
  );
});

// PUT /api/crud/admin/:id  →  Update config
router.put("/admin/:id", (req, res) => {
  const { id } = req.params;
  const { config, fields } = req.body;

  if (!config) return res.status(400).json({ message: "Config data is required" });

  db.query(
    "UPDATE form_configs SET module_name=?, table_name=?, display_name=?, api_route=?, icon=?, primary_color=?, menu_key=?, search_placeholder=?, page_title=?, empty_message=?, empty_sub_message=?, is_active=? WHERE id=?",
    [
      config.module_name,
      config.table_name,
      config.display_name || config.module_name,
      config.api_route || `/api/crud/${config.module_name}`,
      config.icon || "bi-grid",
      config.primary_color || "#5048E5",
      config.menu_key || null,
      config.search_placeholder || "Search...",
      config.page_title || "All Items",
      config.empty_message || "No items found",
      config.empty_sub_message || "Add your first item to get started",
      config.is_active !== undefined ? (config.is_active ? 1 : 0) : 1,
      id,
    ],
    (err) => {
      if (err) {
        console.error("Config update error:", err);
        return res.status(500).json({ message: "Failed to update config", error: err.message });
      }

      if (fields && fields.length) {
        db.query("DELETE FROM form_fields WHERE config_id=?", [id], (err2) => {
          if (err2) return res.status(500).json({ message: "Failed to replace fields" });

          const fieldValues = fields.map((f, i) => [
            id,
            f.field_key,
            f.field_label,
            f.field_type || "text",
            f.placeholder || "",
            f.default_value || null,
            f.options ? JSON.stringify(f.options) : null,
            f.is_required ? 1 : 0,
            f.is_searchable ? 1 : 0,
            f.is_sortable !== undefined ? (f.is_sortable ? 1 : 0) : 1,
            f.is_unique ? 1 : 0,
            f.show_in_table !== undefined ? (f.show_in_table ? 1 : 0) : 1,
            f.show_in_form !== undefined ? (f.show_in_form ? 1 : 0) : 1,
            f.show_in_detail !== undefined ? (f.show_in_detail ? 1 : 0) : 1,
            f.table_width || "auto",
            f.table_align || "left",
            f.validation_regex || null,
            f.validation_message || null,
            f.min_value || null,
            f.max_value || null,
            f.min_length || null,
            f.max_length || null,
            f.depends_on || null,
            f.depends_value || null,
            f.help_text || "",
            f.sort_order !== undefined ? f.sort_order : i,
          ]);

          let inserted = 0;
          fieldValues.forEach((v) => {
            db.query(
              "INSERT INTO form_fields (config_id, field_key, field_label, field_type, placeholder, default_value, options, is_required, is_searchable, is_sortable, is_unique, show_in_table, show_in_form, show_in_detail, table_width, table_align, validation_regex, validation_message, min_value, max_value, min_length, max_length, depends_on, depends_value, help_text, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
              v,
              (err3) => {
                if (err3) console.error("Field insert error:", err3);
                inserted++;
                if (inserted === fieldValues.length) {
                  res.json({ message: "Config updated successfully" });
                }
              }
            );
          });
        });
      } else {
        res.json({ message: "Config updated successfully" });
      }
    }
  );
});

// DELETE /api/crud/admin/:id  →  Delete config + fields
router.delete("/admin/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM form_fields WHERE config_id=?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Failed to delete fields" });
    db.query("DELETE FROM form_configs WHERE id=?", [id], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Failed to delete config" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Config not found" });
      res.json({ message: "Config deleted successfully" });
    });
  });
});

// ══════════════════════════════════════════
// DYNAMIC CRUD ROUTES
// ══════════════════════════════════════════

// GET /api/crud/:module/config  →  Config only
router.get("/:module/config", (req, res) => {
  const { module: moduleName } = req.params;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const config = configs[0];

    db.query("SELECT * FROM form_fields WHERE config_id=? ORDER BY sort_order", [config.id], (err2, fields) => {
      if (err2) return res.status(500).json({ message: "Fields query failed" });

      res.json({
        config: {
          id: config.id,
          module_name: config.module_name,
          table_name: config.table_name,
          display_name: config.display_name,
          api_route: config.api_route,
          icon: config.icon,
          primary_color: config.primary_color,
          menu_key: config.menu_key,
          search_placeholder: config.search_placeholder,
          page_title: config.page_title,
          empty_message: config.empty_message,
          empty_sub_message: config.empty_sub_message,
        },
        fields: fields.map((f) => ({
          id: f.id,
          field_key: f.field_key,
          field_label: f.field_label,
          field_type: f.field_type,
          placeholder: f.placeholder,
          default_value: f.default_value,
          options: f.options ? (typeof f.options === "string" ? JSON.parse(f.options) : f.options) : null,
          is_required: !!f.is_required,
          is_searchable: !!f.is_searchable,
          is_sortable: !!f.is_sortable,
          is_unique: !!f.is_unique,
          show_in_table: !!f.show_in_table,
          show_in_form: !!f.show_in_form,
          show_in_detail: !!f.show_in_detail,
          table_width: f.table_width,
          table_align: f.table_align,
          validation_regex: f.validation_regex,
          validation_message: f.validation_message,
          min_value: f.min_value,
          max_value: f.max_value,
          min_length: f.min_length,
          max_length: f.max_length,
          depends_on: f.depends_on,
          depends_value: f.depends_value,
          help_text: f.help_text,
          sort_order: f.sort_order,
        })),
      });
    });
  });
});

// GET /api/crud/:module  →  List all records
router.get("/:module", (req, res) => {
  const { module: moduleName } = req.params;
  const { search, sort, order, page, limit } = req.query;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const config = configs[0];
    const table = config.table_name;

    db.query("SELECT * FROM form_fields WHERE config_id=? ORDER BY sort_order", [config.id], (err2, fields) => {
      if (err2) return res.status(500).json({ message: "Fields query failed" });

      let query = `SELECT * FROM \`${table}\``;
      const params = [];

      if (search) {
        const searchable = fields.filter((f) => f.is_searchable);
        if (searchable.length) {
          const likeClauses = searchable.map((f) => `\`${f.field_key}\` LIKE ?`);
          query += " WHERE " + likeClauses.join(" OR ");
          searchable.forEach(() => params.push(`%${search}%`));
        }
      }

      const sortField = sort || "id";
      const sortDir = order === "desc" ? "DESC" : "ASC";
      const validSort = fields.find((f) => f.field_key === sortField) || { field_key: "id" };
      query += ` ORDER BY \`${validSort.field_key}\` ${sortDir}`;

      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 100;
      const offset = (pageNum - 1) * pageSize;
      query += " LIMIT ? OFFSET ?";
      params.push(pageSize, offset);

      db.query(query, params, (err3, rows) => {
        if (err3) return res.status(500).json({ message: "Data query failed", error: err3.message });

        let countQuery = `SELECT COUNT(*) as total FROM \`${table}\``;
        const countParams = [];
        if (search) {
          const searchable = fields.filter((f) => f.is_searchable);
          if (searchable.length) {
            const likeClauses = searchable.map((f) => `\`${f.field_key}\` LIKE ?`);
            countQuery += " WHERE " + likeClauses.join(" OR ");
            searchable.forEach(() => countParams.push(`%${search}%`));
          }
        }

        db.query(countQuery, countParams, (err4, countResult) => {
          if (err4) return res.status(500).json({ message: "Count query failed" });

          res.json({
            config: {
              module_name: config.module_name,
              display_name: config.display_name,
              icon: config.icon,
              primary_color: config.primary_color,
              search_placeholder: config.search_placeholder,
              page_title: config.page_title,
              empty_message: config.empty_message,
              empty_sub_message: config.empty_sub_message,
            },
            fields: fields.map((f) => ({
              field_key: f.field_key,
              field_label: f.field_label,
              field_type: f.field_type,
              placeholder: f.placeholder,
              default_value: f.default_value,
              options: f.options ? (typeof f.options === "string" ? JSON.parse(f.options) : f.options) : null,
              is_required: !!f.is_required,
              is_searchable: !!f.is_searchable,
              is_sortable: !!f.is_sortable,
              is_unique: !!f.is_unique,
              show_in_table: !!f.show_in_table,
              show_in_form: !!f.show_in_form,
              show_in_detail: !!f.show_in_detail,
              table_width: f.table_width,
              table_align: f.table_align,
              validation_regex: f.validation_regex,
              validation_message: f.validation_message,
              min_value: f.min_value,
              max_value: f.max_value,
              min_length: f.min_length,
              max_length: f.max_length,
              depends_on: f.depends_on,
              depends_value: f.depends_value,
              help_text: f.help_text,
              sort_order: f.sort_order,
            })),
            data: rows,
            total: countResult[0].total,
            page: pageNum,
            pageSize,
          });
        });
      });
    });
  });
});

// GET /api/crud/:module/:id  →  Single record
router.get("/:module/:id", (req, res) => {
  const { module: moduleName, id } = req.params;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const table = configs[0].table_name;

    db.query(`SELECT * FROM \`${table}\` WHERE id=?`, [id], (err2, rows) => {
      if (err2) return res.status(500).json({ message: "Query failed" });
      if (!rows.length) return res.status(404).json({ message: "Record not found" });
      res.json(rows[0]);
    });
  });
});

// POST /api/crud/:module  →  Create record
router.post("/:module", (req, res) => {
  const { module: moduleName } = req.params;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const config = configs[0];
    const table = config.table_name;

    db.query("SELECT * FROM form_fields WHERE config_id=? AND show_in_form=1 ORDER BY sort_order", [config.id], (err2, fields) => {
      if (err2) return res.status(500).json({ message: "Fields query failed" });

      const body = req.body;

      for (const field of fields) {
        if (field.is_required) {
          const val = body[field.field_key];
          if (val === undefined || val === null || val === "") {
            return res.status(400).json({ message: `${field.field_label} is required` });
          }
        }
        if (field.validation_regex && body[field.field_key]) {
          const regex = new RegExp(field.validation_regex);
          if (!regex.test(String(body[field.field_key]))) {
            return res.status(400).json({ message: field.validation_message || `${field.field_label} is invalid` });
          }
        }
      }

      const formFields = fields.filter((f) => f.field_type !== "hidden" || body[f.field_key] !== undefined);
      const keys = formFields.map((f) => f.field_key);
      const values = keys.map((k) => {
        let val = body[k];
        if (val === undefined || val === null) {
          const field = fields.find((f) => f.field_key === k);
          val = field?.default_value || null;
        }
        if (typeof val === "boolean") val = val ? 1 : 0;
        return val;
      });

      const placeholders = keys.map(() => "?").join(", ");

      db.query(`INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`, values, (err3, result) => {
        if (err3) {
          console.error("Insert error:", err3);
          return res.status(500).json({ message: "Failed to create record", error: err3.message });
        }
        res.json({ message: "Record created successfully", id: result.insertId });
      });
    });
  });
});

// PUT /api/crud/:module/:id  →  Update record
router.put("/:module/:id", (req, res) => {
  const { module: moduleName, id } = req.params;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const config = configs[0];
    const table = config.table_name;

    db.query("SELECT * FROM form_fields WHERE config_id=? AND show_in_form=1 ORDER BY sort_order", [config.id], (err2, fields) => {
      if (err2) return res.status(500).json({ message: "Fields query failed" });

      const body = req.body;

      for (const field of fields) {
        if (field.is_required) {
          const val = body[field.field_key];
          if (val === undefined || val === null || val === "") {
            return res.status(400).json({ message: `${field.field_label} is required` });
          }
        }
      }

      const setClauses = [];
      const values = [];

      fields.forEach((f) => {
        if (body[f.field_key] !== undefined) {
          let val = body[f.field_key];
          if (typeof val === "boolean") val = val ? 1 : 0;
          setClauses.push(`\`${f.field_key}\` = ?`);
          values.push(val);
        }
      });

      if (setClauses.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(id);

      db.query(`UPDATE \`${table}\` SET ${setClauses.join(", ")} WHERE id=?`, values, (err3, result) => {
        if (err3) {
          console.error("Update error:", err3);
          return res.status(500).json({ message: "Failed to update record", error: err3.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Record not found" });
        }
        res.json({ message: "Record updated successfully" });
      });
    });
  });
});

// DELETE /api/crud/:module/:id  →  Delete record
router.delete("/:module/:id", (req, res) => {
  const { module: moduleName, id } = req.params;

  db.query("SELECT * FROM form_configs WHERE module_name=? AND is_active=1", [moduleName], (err, configs) => {
    if (err) return res.status(500).json({ message: "Config query failed" });
    if (!configs.length) return res.status(404).json({ message: "Module not found" });

    const table = configs[0].table_name;

    db.query(`DELETE FROM \`${table}\` WHERE id=?`, [id], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Failed to delete record" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Record not found" });
      res.json({ message: "Record deleted successfully" });
    });
  });
});

module.exports = router;
