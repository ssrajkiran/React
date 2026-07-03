const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* ==============================
   VERIFY TOKEN MIDDLEWARE
================================ */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  jwt.verify(token, "secret", (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded; // contains id and role
    next();
  });
};

/* ==============================
   GET ATTENDANCE REPORT
   /api/attendance?year=2026&month=2
================================ */
router.get("/", verifyToken, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);

  if (!year || !month)
    return res.status(400).json({ error: "Year and month are required" });

  try {
    // 1️⃣ Fetch all users
    const [users] = await db.promise().query(
      `SELECT id, name FROM users ORDER BY name`
    );

    // 2️⃣ Fetch approved leaves for the month
    const [leaves] = await db.promise().query(
      `SELECT id, user_id, from_date, to_date, type, status, remarks
       FROM leaves
       WHERE status='approved' AND MONTH(from_date)=? AND YEAR(from_date)=?`,
      [month, year]
    );

    // 3️⃣ Fetch approved permissions
    const [permissions] = await db.promise().query(
      `SELECT id, user_id, date, hours, slot, status, remarks
       FROM permission
       WHERE status='approved' AND MONTH(date)=? AND YEAR(date)=?`,
      [month, year]
    );

    // 4️⃣ Days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // 5️⃣ Table headers
    const headers = ["User"];
    for (let d = 1; d <= daysInMonth; d++) headers.push(d);

    // 6️⃣ Build rows
    const rows = users.map((user) => {
      const row = { User: user.name };

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        const weekOfMonth = Math.ceil(day / 7);

        // Default status
        let display = "P";

        // Check if holiday
          const isHoliday =
        (dayOfWeek === 0 && (weekOfMonth === 1 || weekOfMonth === 3)) || // 1st & 3rd Sundays
        ((dayOfWeek === 6 || dayOfWeek === 0) && (weekOfMonth === 2 || weekOfMonth === 4)); 

        // Check DB leaves
        const leaveRecord = leaves.find(
          (l) =>
            l.user_id === user.id &&
            day >= new Date(l.from_date).getDate() &&
            day <= new Date(l.to_date).getDate()
        );

        // Check DB permissions
        const permissionRecord = permissions.find(
          (p) => p.user_id === user.id && day === new Date(p.date).getDate()
        );

        if (leaveRecord || permissionRecord) {
          // ✅ DB record exists → override holiday and show P
          display = "P";
          if (leaveRecord) {
            row[day] = {
              status: leaveRecord.type === "compoff" ? "C" : "L",
              detail: leaveRecord.remarks,
              from_date: leaveRecord.from_date,
              to_date: leaveRecord.to_date,
              days: (new Date(leaveRecord.to_date) - new Date(leaveRecord.from_date)) / (1000*60*60*24) + 1
            };
          } else if (permissionRecord) {
            row[day] = {
              status: "PP",
              detail: `${permissionRecord.hours}h ${permissionRecord.slot}`
            };
          }
        } else if (isHoliday) {
          // No DB entry → mark holiday
          display = "H";
          row[day] = { status: "H" };
        } else {
          // Normal day
          row[day] = { status: "P" };
        }
      }

      return row;
    });

    res.json({ year, month, headers, rows, daysInMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
