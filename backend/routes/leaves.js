const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* JWT middleware */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json("No token");

  jwt.verify(token, "secret", (err, user) => {
    if (err) return res.status(403).json("Invalid token");
    req.user = user;
    next();
  });
}

/* Employee apply leave */
router.post("/", auth, (req, res) => {
  const { from_date, to_date, days, type, remarks, comp_off_date } = req.body;

  console.log("POST /leaves data:", { from_date, to_date, days, type, remarks, comp_off_date });

  db.query(
    `
    INSERT INTO leaves
    (user_id, from_date, to_date, days, type, remarks, comp_off_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      req.user.id,
      from_date,
      type === "leave" ? to_date : from_date,  // for comp off, to_date = from_date
      days,
      type,
      remarks,
      type === "compoff" ? comp_off_date : null,
      "pending",
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json("ok");
    }
  );
});

/* Employee own leaves */
router.get("/my", auth, (req, res) => {
  db.query(
    `
    SELECT
      id,
      user_id,
      DATE_FORMAT(from_date,'%Y-%m-%d') as from_date,
      DATE_FORMAT(to_date,'%Y-%m-%d') as to_date,
      DATE_FORMAT(comp_off_date,'%Y-%m-%d') as comp_off_date,
      days,
      type,
      remarks,
      status
    FROM leaves
    WHERE user_id=?
    ORDER BY id DESC
    `,
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* Admin all leaves */
router.get("/all", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json("Admin only");

  db.query(
    `
    SELECT
      l.id,
      u.name,
      DATE_FORMAT(l.from_date,'%Y-%m-%d') as from_date,
      DATE_FORMAT(l.to_date,'%Y-%m-%d') as to_date,
      DATE_FORMAT(l.comp_off_date,'%Y-%m-%d') as comp_off_date,
      l.days,
      l.type,
      l.remarks,
      l.status
    FROM leaves l
    JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC
    `,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* Admin approve/reject */
router.put("/:id", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json("Admin only");

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json("Invalid status");

  db.query(
    "UPDATE leaves SET status=? WHERE id=?",
    [status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) return res.status(404).json("Leave not found");
      res.json({ message: "updated", status });
    }
  );
});

module.exports = router;
