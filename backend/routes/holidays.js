const router = require("express").Router();
const db = require("../config/db");

// Get all holidays
router.get("/list", (req, res) => {
  const query = "SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM holidays";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch holidays" });
    res.json(results); // date is string YYYY-MM-DD
  });
});

router.get("/", (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ message: "Year and month are required" });
  }

  // Select holidays in the given month/year
  const query = `
    SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date
    FROM holidays
    WHERE YEAR(date) = ? AND MONTH(date) = ?
  `;
  db.query(query, [year, month], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch holidays" });
    res.json(results);
  });
});
// Create holiday
router.post("/create", (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ message: "Name and date are required" });

  const query = "INSERT INTO holidays (name, date) VALUES (?, ?)";
  db.query(query, [name, date], (err) => {
    if (err) return res.status(500).json({ message: "Failed to create holiday" });
    res.json({ message: "Holiday added successfully" });
  });
});

// Update holiday
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ message: "Name and date are required" });

  const query = "UPDATE holidays SET name=?, date=? WHERE id=?";
  db.query(query, [name, date, id], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to update holiday" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Holiday not found" });
    res.json({ message: "Holiday updated successfully" });
  });
});

// Delete holiday
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM holidays WHERE id=?";
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to delete holiday" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Holiday not found" });
    res.json({ message: "Holiday deleted successfully" });
  });
});

module.exports = router;