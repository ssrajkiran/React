require("dotenv").config();

const cron = require("node-cron");
const nodemailer = require("nodemailer");
const db = require("../config/db");

// Daily leave report recipients
const NOTIFY_TO = [
  "g.santhoshkumar@voltechgroup.com",
  "shyamganesh.p@voltechgroup.com",
];
const NOTIFY_CC = ["rajkiran.s@voltechgroup.com"];

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function leaveTypeLabel(row) {
  const base = row.type === "compoff" ? "Comp Off" : "Leave";
  if (row.half_day_type === "first_half") return `${base} (First Half)`;
  if (row.half_day_type === "second_half") return `${base} (Second Half)`;
  return base;
}

function durationLabel(row) {
  if (row.from_date === row.to_date) return row.from_date;
  return `${row.from_date} to ${row.to_date}`;
}

// Approved leaves that cover the current day (MySQL CURDATE so the server's
// timezone decides "today", matching dateStrings output used elsewhere).
async function getTodayLeaves() {
  const [rows] = await db.promise().query(
    `SELECT u.name, u.email, l.type, l.from_date, l.to_date, l.days,
            l.half_day_type, l.remarks,
            DATE_FORMAT(CURDATE(), '%W, %d %M %Y') AS today
       FROM leaves l
       INNER JOIN users u ON u.id = l.user_id
      WHERE l.status = 'approved'
        AND CURDATE() BETWEEN l.from_date AND l.to_date
      ORDER BY u.name ASC`,
    []
  );
  return rows;
}

function buildReportHtml(rows) {
  const today = rows[0].today;

  const cards = rows.map((row, index) => `
        <!-- Person ${index + 1} -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;overflow:hidden;">
          <tr>
            <td style="background:#f9fafb;padding:12px 20px;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:15px;font-weight:700;color:#111827;font-family:Arial,sans-serif;">${esc(row.name)}</span>
              <span style="font-size:13px;color:#6b7280;font-family:Arial,sans-serif;"> &lt;${esc(row.email)}&gt;</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 20px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;padding:6px 0;width:35%;font-size:14px;font-family:Arial,sans-serif;">Leave Type</td>
                  <td style="font-weight:500;padding:6px 0;font-size:14px;font-family:Arial,sans-serif;color:#111827;">${esc(leaveTypeLabel(row))}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;padding:6px 0;width:35%;font-size:14px;font-family:Arial,sans-serif;">Date</td>
                  <td style="font-weight:500;padding:6px 0;font-size:14px;font-family:Arial,sans-serif;color:#111827;">${esc(durationLabel(row))}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;padding:6px 0;width:35%;font-size:14px;font-family:Arial,sans-serif;">Reason</td>
                  <td style="font-weight:500;padding:6px 0;font-size:14px;font-family:Arial,sans-serif;color:#111827;">${esc(row.remarks || "-")}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#185FA5;padding:28px 32px 24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#ffffff;font-family:Arial,sans-serif;text-align:center;line-height:36px;margin-right:10px;">LM</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:13px;color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;">Leave Management System</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:12px 0 0;font-size:22px;font-weight:500;color:#ffffff;font-family:Arial,sans-serif;">Daily Leave Report</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <p style="margin:0 0 6px;font-size:15px;color:#111827;line-height:1.7;font-family:Arial,sans-serif;">
              The following ${rows.length === 1 ? "person is" : "people are"} on leave today,
              <strong style="font-weight:700;">${esc(today)}</strong>:
            </p>

            <div style="height:14px;"></div>
${cards}

            <p style="font-size:14px;color:#6b7280;margin:8px 0 0;line-height:1.7;font-family:Arial,sans-serif;">
              This report is generated automatically every day at 8:00 AM.
            </p>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:20px;">
              <tr>
                <td style="font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">This is an automated message — do not reply.</td>
                <td align="right" style="font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">Sent via erp.notification</td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Fetch today's approved leaves and email the report. Skips silently when
// nobody is on leave (weekends/holidays produce no mail).
async function sendDailyLeaveEmail() {
  try {
    const rows = await getTodayLeaves();
    if (!rows.length) {
      console.log("[daily-leave-email] No approved leaves today — skipping.");
      return { sent: false, reason: "no-leaves", count: 0 };
    }

    const info = await createTransporter().sendMail({
      from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
      to: NOTIFY_TO.join(", "),
      cc: NOTIFY_CC.join(", "),
      subject: `Daily Leave Report — ${rows[0].today} (${rows.length} on leave)`,
      html: buildReportHtml(rows),
    });

    console.log(`[daily-leave-email] Sent report for ${rows.length} leave(s): ${info.response || info.messageId}`);
    return { sent: true, count: rows.length };
  } catch (err) {
    console.error("[daily-leave-email] Failed to send:", err.message || err);
    return { sent: false, reason: "error", error: err.message };
  }
}

// Schedule the report for every day at 8:00 AM (IST unless CRON_TZ overrides).
function scheduleDailyLeaveEmail() {
  cron.schedule("0 8 * * *", () => { sendDailyLeaveEmail(); }, {
    timezone: process.env.CRON_TZ || "Asia/Kolkata",
  });
  console.log("[daily-leave-email] Scheduled daily at 08:00 " + (process.env.CRON_TZ || "Asia/Kolkata"));
}

// Sends the same report template with dummy entries — used to preview the
// email layout without waiting for real leaves.
async function sendDummyLeaveReport(to = "rajkiran.s@voltechgroup.com") {
  try {
    const tz = process.env.CRON_TZ || "Asia/Kolkata";
    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: tz,
    });
    const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());

    const rows = [
      {
        name: "Test Employee One", email: "test.one@voltechgroup.com",
        type: "leave", from_date: todayIso, to_date: todayIso,
        days: 1, half_day_type: "full",
        remarks: "Not feeling well — resting at home. (dummy entry)",
        today,
      },
      {
        name: "Test Employee Two", email: "test.two@voltechgroup.com",
        type: "compoff", from_date: todayIso, to_date: todayIso,
        days: 0.5, half_day_type: "second_half",
        remarks: "Personal work in the afternoon. (dummy entry)",
        today,
      },
    ];

    const info = await createTransporter().sendMail({
      from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject: `[TEST] Daily Leave Report — ${today}`,
      html: buildReportHtml(rows),
    });

    console.log(`[daily-leave-email] Dummy report sent to ${to}: ${info.response || info.messageId}`);
    return { sent: true, to, response: info.response || info.messageId || "ok" };
  } catch (err) {
    console.error("[daily-leave-email] Dummy send failed:", err.message || err);
    return { sent: false, to, error: err.message };
  }
}

module.exports = { sendDailyLeaveEmail, scheduleDailyLeaveEmail, getTodayLeaves, sendDummyLeaveReport };
