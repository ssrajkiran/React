const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, "secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

// GET /api/roles/list - List all roles (for dropdowns, authenticated users)
router.get("/list", verifyToken, (req, res) => {
  db.query("SELECT id, name, description FROM roles ORDER BY name", (err, roles) => {
    if (err) return res.status(500).json({ message: "Database query failed" });
    res.json(roles);
  });
});

// GET /api/roles - List all roles
router.get("/", verifyToken, isAdmin, (req, res) => {
  db.query("SELECT * FROM roles", (err, roles) => {
    if (err) return res.status(500).json({ message: "Database query failed" });
    res.json(roles);
  });
});

// GET /api/roles/:id - Get single role with permissions
router.get("/:id", verifyToken, isAdmin, (req, res) => {
  db.query("SELECT * FROM roles WHERE id=?", [req.params.id], (err, role) => {
    if (err) return res.status(500).json({ message: "Database query failed" });
    if (!role.length) return res.status(404).json({ message: "Role not found" });

    db.query(
      "SELECT * FROM role_permissions WHERE role_id=?",
      [req.params.id],
      (err2, permissions) => {
        if (err2) return res.status(500).json({ message: "Database query failed" });
        res.json({ ...role[0], permissions });
      }
    );
  });
});

// POST /api/roles - Create new role
router.post("/", verifyToken, isAdmin, (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Role name is required" });
  }

  db.query(
    "INSERT INTO roles (name, description) VALUES (?, ?)",
    [name, description || ""],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Role name already exists" });
        }
        return res.status(500).json({ message: "Failed to create role" });
      }

      const roleId = result.insertId;

      if (!permissions || !permissions.length) {
        return res.json({ message: "Role created successfully", id: roleId });
      }

      const values = permissions.map((p) => [
        roleId,
        p.menu_key,
        p.can_view ? 1 : 0,
        p.can_create ? 1 : 0,
        p.can_edit ? 1 : 0,
        p.can_delete ? 1 : 0,
      ]);

      let inserted = 0;
      const total = values.length;

      values.forEach((v) => {
        db.query(
          "INSERT INTO role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)",
          v,
          (err3) => {
            if (err3) console.error("Permission insert error:", err3);
            inserted++;
            if (inserted === total) {
              res.json({ message: "Role created successfully", id: roleId });
            }
          }
        );
      });
    }
  );
});

// PUT /api/roles/:id - Update role
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { name, description, permissions } = req.body;
  const roleId = req.params.id;

  db.query("SELECT * FROM roles WHERE id=?", [roleId], (err, role) => {
    if (err) return res.status(500).json({ message: "Database query failed" });
    if (!role.length) return res.status(404).json({ message: "Role not found" });

    db.query(
      "UPDATE roles SET name=?, description=? WHERE id=?",
      [name || role[0].name, description !== undefined ? description : role[0].description, roleId],
      (err2) => {
        if (err2) {
          if (err2.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Role name already exists" });
          }
          return res.status(500).json({ message: "Failed to update role" });
        }

        if (permissions && permissions.length) {
          db.query("DELETE FROM role_permissions WHERE role_id=?", [roleId], (err3) => {
            if (err3) return res.status(500).json({ message: "Failed to update permissions" });

            const values = permissions.map((p) => [
              roleId,
              p.menu_key,
              p.can_view ? 1 : 0,
              p.can_create ? 1 : 0,
              p.can_edit ? 1 : 0,
              p.can_delete ? 1 : 0,
            ]);

            let inserted = 0;
            const total = values.length;

            values.forEach((v) => {
              db.query(
                "INSERT INTO role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)",
                v,
                (err4) => {
                  if (err4) console.error("Permission insert error:", err4);
                  inserted++;
                  if (inserted === total) {
                    res.json({ message: "Role updated successfully" });
                  }
                }
              );
            });
          });
        } else {
          res.json({ message: "Role updated successfully" });
        }
      }
    );
  });
});

// DELETE /api/roles/:id - Delete role
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  const roleId = req.params.id;

  db.query("SELECT * FROM roles WHERE id=?", [roleId], (err, role) => {
    if (err) return res.status(500).json({ message: "Database query failed" });
    if (!role.length) return res.status(404).json({ message: "Role not found" });

    if (role[0].name === "admin" || role[0].name === "employee") {
      return res.status(400).json({ message: "Cannot delete default roles" });
    }

    db.query("DELETE FROM roles WHERE id=?", [roleId], (err2) => {
      if (err2) return res.status(500).json({ message: "Failed to delete role" });
      res.json({ message: "Role deleted successfully" });
    });
  });
});

// GET /api/roles/:id/permissions - Get permissions for a role
router.get("/:id/permissions", verifyToken, (req, res) => {
  db.query(
    `SELECT rp.menu_key, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete 
     FROM role_permissions rp 
     WHERE rp.role_id = ?`,
    [req.params.id],
    (err, permissions) => {
      if (err) return res.status(500).json({ message: "Database query failed" });
      res.json(permissions);
    }
  );
});

module.exports = router;
