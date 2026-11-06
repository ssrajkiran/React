const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// ── VERIFY TOKEN MIDDLEWARE ──
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

// ── HELPER: Format date nicely ──
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── POST /api/chatbot/message ──
router.post("/message", verifyToken, async (req, res) => {
  const { message = "", context = {} } = req.body;
  const user = req.user || {};
  const role = user.role || "employee";
  const userName = user.name || "User";
  const text = message.trim().toLowerCase();

  // Helper function for DB query as promise
  const queryDb = (sql, params = []) =>
    new Promise((resolve) => {
      try {
        db.query(sql, params, (err, rows) => {
          if (err) resolve(null);
          else resolve(rows);
        });
      } catch {
        resolve(null);
      }
    });

  try {
    // 1. GREETING / INTRO
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you|help|start)\b/i.test(text)) {
      const suggestions = [
        "How do I log timesheet?",
        "What is the leave policy?",
        "Upcoming holidays",
        "My tasks and modules",
        "Switch theme to dark",
      ];
      if (role === "admin") {
        suggestions.push("How many pending leaves?", "How to add a new user?");
      }

      return res.json({
        reply: `Hello **${userName}**! 👋 I am your **Voltech AI Assistant**.\n\nI can help you with anything across the system:\n- 🕒 **Timesheet & Man Hours** (logging work, meeting logs, daily totals)\n- 🏖️ **Attendance & Leaves** (policies, leave types, applying, status)\n- 📅 **Holidays** (upcoming company & national holidays)\n- 📋 **Modules & Tasks** (tracking tasks, statuses)\n- ⚙️ **Personalization** (theme switching, accent colors, fonts)\n${role === "admin" ? "- 👥 **Admin Tools** (user management, roles, approval workflows)\n" : ""}\nHow may I assist you today?`,
        suggestions,
        quickLinks: [
          { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
          { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
          { label: "Holidays", path: "/holidays", icon: "bi-calendar-event" },
          { label: "Settings", path: "/settings", icon: "bi-gear" },
        ],
      });
    }

    // 2. TIMESHEET / HOURS QUERIES
    if (/timesheet|hour|log work|meeting|man hrs|work description/i.test(text)) {
      // Check if user is asking for today's hours
      if (/today|how many hours|my hours|logged/i.test(text)) {
        const todayRows = await queryDb(
          "SELECT man_hrs, work_description, task FROM timesheet WHERE created_by = ? AND date = CURDATE()",
          [user.id]
        );

        if (todayRows && todayRows.length > 0) {
          const totalHrs = todayRows.reduce((sum, r) => sum + (Number(r.man_hrs) || 0), 0);
          return res.json({
            reply: `📊 **Today's Timesheet Summary for ${userName}:**\n\n- **Total Hours Logged Today:** \`${totalHrs.toFixed(1)}h\` (Target: 8.0h)\n- **Entries Logged:** ${todayRows.length}\n\n${todayRows.map((r, i) => `${i + 1}. \`${r.man_hrs}h\` — ${r.work_description || "Work entry"}`).join("\n")}\n\nNeed to add more hours? Click below to open the Timesheet Form.`,
            quickLinks: [
              { label: "Open Timesheet Form", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-pencil-square" },
              { label: "Timesheet Dashboard", path: role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard", icon: "bi-speedometer2" },
            ],
            suggestions: ["How do I log a meeting?", "What is the daily hours target?", "Show leave policy"],
          });
        }
      }

      // General timesheet guidelines
      return res.json({
        reply: `🕒 **Timesheet Logging Guidelines:**\n\n1. **Standard Timesheet:**\n   - Navigate to **Timesheet > Timesheet Form**\n   - Select your **Project** and active **Module**\n   - Enter **Start Time** and **End Time**\n   - The system automatically calculates **Man Hours**\n   - Provide a clear **Work Description** and submit\n\n2. **Meeting Entry:**\n   - In the Type dropdown, select **Meeting**\n   - Project & Module fields are automatically hidden for quick meeting logging!\n\n3. **Daily Target:** Standard full-time daily requirement is **8.0 man hours** (40 hours/week).`,
        quickLinks: [
          { label: "Go to Timesheet Form", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
          { label: "View Timesheet Dashboard", path: role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard", icon: "bi-graph-up" },
        ],
        suggestions: ["Check my hours today", "How to apply for permission?", "Upcoming holidays"],
      });
    }

    // 3. ATTENDANCE & LEAVES QUERIES
    if (/leave|attendance|casual|sick|permission|wfh|work from home|half day/i.test(text)) {
      // Check if user is asking for their own leaves
      if (/my leave|my request|status|balance/i.test(text)) {
        const leaveRows = await queryDb(
          "SELECT leave_type, from_date, to_date, status, reason FROM leaves WHERE user_id = ? ORDER BY id DESC LIMIT 4",
          [user.id]
        );

        if (leaveRows && leaveRows.length > 0) {
          const listStr = leaveRows
            .map(
              (l, i) =>
                `${i + 1}. **${l.leave_type}** (${formatDate(l.from_date)} → ${formatDate(l.to_date)})\n   - Status: **${l.status}**\n   - Reason: ${l.reason || "Not specified"}`
            )
            .join("\n");

          return res.json({
            reply: `🏖️ **Your Recent Leave Requests:**\n\n${listStr}\n\nYou can view full attendance details or submit a new request below.`,
            quickLinks: [
              { label: "Apply New Leave", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-plus-circle" },
              { label: "Attendance Report", path: "/employee/report", icon: "bi-calendar3" },
            ],
            suggestions: ["What are the leave types?", "How does permission work?", "Check upcoming holidays"],
          });
        }
      }

      // Leave Policy and Types Overview
      return res.json({
        reply: `📋 **Voltech Attendance & Leave Policy:**\n\n- **Casual Leave (CL):** For personal commitments and planned leaves. Apply in advance.\n- **Sick Leave (SL):** For medical illness. A doctor's certificate may be required for 3+ consecutive days.\n- **Permission:** Short absence during work hours (max **2 hours** per slot).\n- **Half Day (HD):** First half (morning) or second half (afternoon) absence (counted as 0.5 day).\n- **Work From Home (WH):** Approved remote working day.\n- **Present on Holiday (PH):** Comp-off eligible when working on official holidays.\n\n**To apply:** Go to **Attendance**, click **Apply Leave**, select leave type and date range, and click Submit.`,
        quickLinks: [
          { label: "Apply for Leave", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-plus" },
          { label: "Attendance Report", path: "/employee/report", icon: "bi-file-earmark-text" },
        ],
        suggestions: ["Check my leave status", "How does permission work?", "Upcoming holidays"],
      });
    }

    // 4. UPCOMING HOLIDAYS
    if (/holiday|festival|vacation|off day|diwali|pongal|new year|christmas/i.test(text)) {
      const holidayRows = await queryDb(
        "SELECT holiday_name, holiday_date, holiday_day FROM holidays WHERE holiday_date >= CURDATE() ORDER BY holiday_date ASC LIMIT 6"
      );

      if (holidayRows && holidayRows.length > 0) {
        const holidayList = holidayRows
          .map((h, i) => `${i + 1}. **${h.holiday_name}** — ${formatDate(h.holiday_date)} (${h.holiday_day || "Holiday"})`)
          .join("\n");

        return res.json({
          reply: `📅 **Upcoming Official Holidays:**\n\n${holidayList}\n\nPlan your leaves around these holidays!`,
          quickLinks: [{ label: "View All Holidays", path: "/holidays", icon: "bi-calendar-event" }],
          suggestions: ["How to apply for leave?", "Log timesheet", "Switch theme to dark"],
        });
      }

      return res.json({
        reply: `📅 **Holidays Information:**\n\nYou can view the complete yearly holiday calendar on the **Holidays** page.\n\nAll official national, state, and festival holidays are marked with non-working status.`,
        quickLinks: [{ label: "Open Holidays Page", path: "/holidays", icon: "bi-calendar-event" }],
        suggestions: ["Leave policy", "My timesheet hours", "My tasks"],
      });
    }

    // 5. TASKS & MODULES
    if (/task|module|project|in progress|completed task/i.test(text)) {
      const taskRows = await queryDb(
        "SELECT t.task_name, t.status, p.project_name FROM task t LEFT JOIN projects p ON t.project_id = p.id WHERE t.status != 'Completed' LIMIT 5"
      );

      let taskSnippet = "";
      if (taskRows && taskRows.length > 0) {
        taskSnippet = `\n\n**Active Tasks in the System:**\n` +
          taskRows.map((t, i) => `${i + 1}. **${t.task_name}** (${t.project_name || "Project"}) — \`${t.status}\``).join("\n");
      }

      return res.json({
        reply: `📋 **Modules & Task Management:**\n\n- **In Progress:** Tasks currently being worked on by developers/team members.\n- **Completed:** Tasks that have been completed, reviewed, and finalized.${taskSnippet}\n\nClick below to view the module board or module reports.`,
        quickLinks: [
          { label: "View Modules", path: "/tasks", icon: "bi-kanban" },
          { label: "Module Report", path: "/tasks/report", icon: "bi-bar-chart" },
        ],
        suggestions: ["How to log hours for a task?", "My leave status", "Upcoming holidays"],
      });
    }

    // 6. ADMIN-SPECIFIC QUERIES (Pending requests, adding users, roles)
    if (role === "admin" && /pending|admin|add user|create user|role|permission list|approval/i.test(text)) {
      const pendingLeaves = await queryDb("SELECT COUNT(*) as count FROM leaves WHERE status = 'Pending'");
      const totalUsers = await queryDb("SELECT COUNT(*) as count FROM users");
      const todayTeamHours = await queryDb("SELECT SUM(man_hrs) as total FROM timesheet WHERE date = CURDATE()");

      const pCount = pendingLeaves?.[0]?.count ?? 0;
      const uCount = totalUsers?.[0]?.count ?? 0;
      const hTotal = Number(todayTeamHours?.[0]?.total || 0).toFixed(1);

      return res.json({
        reply: `🛡️ **Admin Live Operations Summary:**\n\n- **Pending Leave Approvals:** \`${pCount}\` request(s) awaiting your review\n- **Total Active Users:** \`${uCount}\` employees\n- **Team Hours Logged Today:** \`${hTotal}h\`\n\n**Admin Shortcuts:**\n1. Review & Approve Leaves: Navigate to **Attendance**\n2. Add / Edit Employees: Navigate to **Users**\n3. Configure Roles & Permissions: Navigate to **Roles**\n4. Timesheet AI Summary: Generate date-range PDF reports under **Timesheet Report**`,
        quickLinks: [
          { label: "Review Pending Leaves", path: "/admin/leaves", icon: "bi-clipboard-check" },
          { label: "Manage Users", path: "/employee/userslist", icon: "bi-people" },
          { label: "Configure Roles", path: "/admin/roles", icon: "bi-shield-lock" },
          { label: "Timesheet Report", path: "/admin/ai-summary", icon: "bi-file-earmark-pdf" },
        ],
        suggestions: ["Upcoming holidays", "Check today's team hours", "Theme settings"],
      });
    }

    // 7. PERSONALIZATION / THEME ACTIONS
    if (/theme|dark|light|accent|color|font|personalize|customization/i.test(text)) {
      let action = null;
      let replyText = `🎨 **Personalization & Theme Controls:**\n\nYou can customize your workspace completely under **Personalization**:\n- **Theme Mode:** Light Mode, Dark Mode\n- **Sidebar Style:** White, Dark Navy, or Vibrant Themed Gradients\n- **Accent Colors:** Teal, Blue, Indigo, Purple, Rose, Emerald, Orange, White, or Any Custom Color Hex\n- **Typography:** 5 High-legibility font families (Poppins, Inter, Nunito, Roboto, System)`;

      if (/dark/i.test(text)) {
        action = { type: "set_theme", value: "dark" };
        replyText = `🌙 Switched to **Dark Mode** for you! The entire UI and sidebar have adapted.`;
      } else if (/light/i.test(text)) {
        action = { type: "set_theme", value: "light" };
        replyText = `☀️ Switched to **Light Mode** for you!`;
      } else if (/blue/i.test(text)) {
        action = { type: "set_accent", value: "blue" };
        replyText = `💙 Changed accent theme to **Blue**!`;
      } else if (/teal/i.test(text)) {
        action = { type: "set_accent", value: "teal" };
        replyText = `🌊 Changed accent theme to **Teal**!`;
      } else if (/purple/i.test(text)) {
        action = { type: "set_accent", value: "purple" };
        replyText = `💜 Changed accent theme to **Purple**!`;
      } else if (/rose/i.test(text)) {
        action = { type: "set_accent", value: "rose" };
        replyText = `🌹 Changed accent theme to **Rose**!`;
      } else if (/orange/i.test(text)) {
        action = { type: "set_accent", value: "orange" };
        replyText = `🍊 Changed accent theme to **Orange**!`;
      } else if (/emerald/i.test(text)) {
        action = { type: "set_accent", value: "emerald" };
        replyText = `🌿 Changed accent theme to **Emerald**!`;
      }

      return res.json({
        reply: replyText,
        action,
        quickLinks: [{ label: "Open Personalization Settings", path: "/settings", icon: "bi-palette" }],
        suggestions: ["Switch to dark mode", "Switch to light mode", "Leave policy", "My hours today"],
      });
    }

    // 8. PROFILE & TODO
    if (/profile|my name|who am i|todo|my task/i.test(text)) {
      return res.json({
        reply: `👤 **User Profile & Task Planning:**\n\n- **User:** ${userName}\n- **Role:** ${role.toUpperCase()}\n\nManage your personal details on **My Profile**, or plan your daily work items on **My Todo**!`,
        quickLinks: [
          { label: "My Profile", path: "/profile", icon: "bi-person-circle" },
          { label: "My Todo", path: "/todo", icon: "bi-check2-square" },
        ],
        suggestions: ["Log timesheet", "Leave policy", "Upcoming holidays"],
      });
    }

    // 9. DEFAULT / SMART INTEL
    return res.json({
      reply: `I understand you asked: *"${message}"*.\n\nHere are the top things I can do for you right away:\n- 🕒 **Check / Log Timesheets** (track daily 8h target)\n- 🏖️ **Apply / Check Leaves & Permissions**\n- 📅 **View Company Holidays**\n- 📋 **Check Modules & Active Tasks**\n- 🎨 **Change Themes & Accents**\n\nChoose an option below or ask me a more specific question!`,
      quickLinks: [
        { label: "Timesheet", path: role === "admin" ? "/admin/timesheet" : "/employee/timesheet", icon: "bi-clock-history" },
        { label: "Attendance", path: role === "admin" ? "/admin/leaves" : "/employee/leaves", icon: "bi-calendar-check" },
        { label: "Holidays", path: "/holidays", icon: "bi-calendar-event" },
        { label: "Modules", path: "/tasks", icon: "bi-kanban" },
      ],
      suggestions: [
        "What are my hours today?",
        "How do I apply for leave?",
        "Show upcoming holidays",
        "Switch theme to dark",
      ],
    });
  } catch (error) {
    console.error("Chatbot processing error:", error);
    return res.status(500).json({
      reply: "I am ready to help! You can ask me about timesheets, leaves, holidays, tasks, or theme settings.",
      suggestions: ["How do I log timesheet?", "Leave policy", "Upcoming holidays"],
    });
  }
});

module.exports = router;
