const router = require("express").Router();
const multer = require("multer");
const PDFParser = require("pdf2json");
const db = require("../config/db");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

const KNOWN_DEPTS = [
  "CMD", "DIRECTOR", "DIRECTOR'S OFFICE", "HUMAN RESOURCES", "EHS",
  "VMCPL", "ASIA POWER", "PROCUREMENT", "PILLAIPAKKAM", "VHRSPL",
  "DOMESTIC", "INTERNATIONAL", "FINANCE", "CONFERENCE", "CHEYYAR",
  "KOVUR", "RECEPTION", "VOMSPL", "SECURITY", "ELECTRICIAN",
  "IT SERVICE", "TRANSPORT", "CAFETERIA", "ORGANIC", "VBMS",
  "ACCOUNTS", "VMCL", "GRAPHIC", "WEB DESIGN", "MANAGEMENT",
  "ISO", "SOFTWARE", "DEVELOPMENT", "STORES", "EXECUTION",
  "ASSET", "LOGISTICS", "BUSINESS", "DIGITAL", "MARKETING",
  "PRODUCTS", "SYSTEM ADMIN", "BOARD", "MET",
];

function isDeptName(text) {
  if (!text || text.length < 2) return false;
  const skip = ["Names", "Intercom", "S.No", "VOLTECH", "Revision", "Ph:"];
  if (skip.some((s) => text.toUpperCase().includes(s.toUpperCase()))) return false;
  if (/^\d/.test(text)) return false;
  if (text.includes("/") && text.split("/").length > 1) {
    const parts = text.split("/").map((p) => p.trim());
    if (parts.some((p) => /^\d/.test(p))) return false;
  }
  const upper = text.toUpperCase();
  return KNOWN_DEPTS.some((k) => upper.includes(k)) ||
    (upper === text && text.length > 3 && !/\d{3}/.test(text));
}

function parseIntercomPDF(filePath) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (e) => reject(e.parserError));
    parser.on("pdfParser_dataReady", (data) => {
      try {
        const results = [];
        const pages = data.Pages || [];

        for (const page of pages) {
          const texts = page.Texts || [];
          const items = [];
          for (const t of texts) {
            for (const r of t.R || []) {
              const decoded = decodeURIComponent(r.T || "").trim();
              if (!decoded) continue;
              items.push({ x: t.x, y: t.y, text: decoded });
            }
          }
          if (items.length === 0) continue;

          const snoRanges = [[2, 3.2], [17, 18.3], [32, 33.5], [47.5, 48.7], [59.5, 60.7]];
          const nameRanges = [[3.2, 5.5], [18.3, 19.3], [33.5, 35.5], [48.7, 50.5], [60.7, 62.5]];
          const deptRanges = [[5.5, 9.5], [19.3, 25], [35.5, 39.5], [50.5, 53.5], [62.5, 66]];
          const intercomRanges = [[13, 15.5], [28.5, 31.5], [43.5, 46.5], [55.5, 58.5], [68, 71]];

          const inRange = (x, range) => x >= range[0] && x <= range[1];

          const getField = (item) => {
            const x = item.x;
            for (let c = 0; c < 5; c++) {
              if (inRange(x, intercomRanges[c])) return { col: c, field: "intercom" };
              if (inRange(x, snoRanges[c])) return { col: c, field: "sno" };
              if (inRange(x, deptRanges[c])) return { col: c, field: "dept" };
              if (inRange(x, nameRanges[c])) return { col: c, field: "name" };
            }
            return null;
          };

          const currentDept = ["General", "General", "General", "General", "General"];
          const sorted = items.sort((a, b) => a.y - b.y || a.x - b.x);
          const yBands = [];
          let band = [sorted[0]];
          for (let i = 1; i < sorted.length; i++) {
            if (Math.abs(sorted[i].y - band[0].y) < 0.5) {
              band.push(sorted[i]);
            } else {
              yBands.push(band);
              band = [sorted[i]];
            }
          }
          yBands.push(band);

          for (const yBand of yBands) {
            const colData = [{}, {}, {}, {}, {}];
            for (const item of yBand) {
              const info = getField(item);
              if (!info) continue;
              colData[info.col][info.field] = item.text.trim();
            }

            for (let c = 0; c < 5; c++) {
              const d = colData[c];

              if (d.dept && isDeptName(d.dept)) {
                currentDept[c] = d.dept.replace(/\s+/g, " ").trim();
              }

              if (d.sno && d.name && d.intercom) {
                const snoVal = parseInt(d.sno);
                if (!isNaN(snoVal) && snoVal >= 1 && snoVal <= 50) {
                  results.push({
                    department: currentDept[c],
                    sno: snoVal,
                    name: d.name.replace(/\s+/g, " ").trim(),
                    intercom: d.intercom.replace(/\s+/g, " ").trim(),
                  });
                }
              }
            }
          }
        }

        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
    parser.loadPDF(filePath);
  });
}

router.get("/list", (req, res) => {
  const q = "SELECT id, department, sno, name, intercom FROM intercom_list ORDER BY department, sno";
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/search", (req, res) => {
  const term = `%${req.query.q || ""}%`;
  const q = `SELECT id, department, sno, name, intercom
    FROM intercom_list
    WHERE name LIKE ? OR intercom LIKE ? OR department LIKE ?
    ORDER BY department, sno`;
  db.query(q, [term, term, term], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/departments", (req, res) => {
  const q = "SELECT DISTINCT department FROM intercom_list ORDER BY department";
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => r.department));
  });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tmpPath = req.file.path;
  try {
    const entries = await parseIntercomPDF(tmpPath);

    if (entries.length === 0) {
      fs.unlinkSync(tmpPath);
      return res.status(400).json({ error: "No intercom data found in PDF" });
    }

    const oldData = await new Promise((resolve, reject) => {
      db.query("SELECT department, sno, name, intercom FROM intercom_list", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const oldMap = {};
    oldData.forEach((r) => {
      oldMap[`${r.department}|${r.sno}|${r.name}|${r.intercom}`] = true;
    });

    const newEntries = entries.filter(
      (e) => !oldMap[`${e.department}|${e.sno}|${e.name}|${e.intercom}`]
    );

    await new Promise((resolve, reject) => {
      db.query("DELETE FROM intercom_list", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (entries.length > 0) {
      const values = entries.map((e) => [e.department, e.sno, e.name, e.intercom]);
      await new Promise((resolve, reject) => {
        db.query("INSERT INTO intercom_list (department, sno, name, intercom) VALUES ?", [values], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    fs.unlinkSync(tmpPath);

    const sqlLines = ["-- Truncate old data", "DELETE FROM intercom_list;", "", "-- Insert new intercom entries"];
    for (const e of entries) {
      const dept = e.department.replace(/'/g, "''");
      const name = e.name.replace(/'/g, "''");
      const intercom = e.intercom.replace(/'/g, "''");
      sqlLines.push(
        `INSERT INTO intercom_list (department, sno, name, intercom) VALUES ('${dept}', ${e.sno}, '${name}', '${intercom}');`
      );
    }

    res.json({
      message: "Intercom list updated successfully",
      totalInserted: entries.length,
      newEntries: newEntries.length,
      changedEntries: newEntries,
      sql: sqlLines.join("\n"),
    });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to parse PDF: " + err.message });
  }
});

module.exports = router;
