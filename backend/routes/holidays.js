const router = require("express").Router();
const db = require("../config/db");

const toFlag = (v) => (v === undefined || v === null || v === "" ? 1 : v ? 1 : 0);
const toNullDate = (v) => (v === undefined || v === null || v === "" ? null : v);

// The replacement day must be a real date that is not itself a holiday.
const validateReplacement = (replacement_date, date) =>
  new Promise((resolve, reject) => {
    if (!replacement_date) return resolve(null);
    if (replacement_date === date) {
      return reject(new Error("Replacement day must be a different date than the holiday."));
    }
    db.query(
      "SELECT id FROM holidays WHERE DATE(date) = DATE(?) LIMIT 1",
      [replacement_date],
      (err, rows) => {
        if (err) return reject(err);
        if (rows.length) return reject(new Error("That replacement date is already a holiday."));
        resolve(replacement_date);
      }
    );
  });

// Get all holidays
router.get("/list", (req, res) => {
  const query =
    "SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, has_compensation, DATE_FORMAT(replacement_date, '%Y-%m-%d') AS replacement_date FROM holidays ORDER BY date DESC";
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

  // Holidays in the given month/year, plus holidays from any month whose
  // replacement working day lands in this month.
  const query = `
    SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, has_compensation,
           DATE_FORMAT(replacement_date, '%Y-%m-%d') AS replacement_date
    FROM holidays
    WHERE (YEAR(date) = ? AND MONTH(date) = ?)
       OR (replacement_date IS NOT NULL AND YEAR(replacement_date) = ? AND MONTH(replacement_date) = ?)
    ORDER BY date ASC
  `;
  db.query(query, [year, month, year, month], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch holidays" });
    res.json(results);
  });
});
// Create holiday
router.post("/create", async (req, res) => {
  const { name, date } = req.body;
  const hasComp = toFlag(req.body.has_compensation);
  if (!name || !date) return res.status(400).json({ message: "Name and date are required" });

  try {
    const repl = await validateReplacement(toNullDate(req.body.replacement_date), date);
    const query = "INSERT INTO holidays (name, date, has_compensation, replacement_date) VALUES (?, ?, ?, ?)";
    db.query(query, [name, date, hasComp, repl], (err) => {
      if (err) return res.status(500).json({ message: "Failed to create holiday" });
      res.json({ message: "Holiday added successfully" });
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Update holiday
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, date } = req.body;
  const hasComp = toFlag(req.body.has_compensation);
  if (!name || !date) return res.status(400).json({ message: "Name and date are required" });

  try {
    const repl = await validateReplacement(toNullDate(req.body.replacement_date), date);
    const query = "UPDATE holidays SET name=?, date=?, has_compensation=?, replacement_date=? WHERE id=?";
    db.query(query, [name, date, hasComp, repl, id], (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to update holiday" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Holiday not found" });
      res.json({ message: "Holiday updated successfully" });
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
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
