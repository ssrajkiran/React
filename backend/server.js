const express=require("express");
const cors=require("cors");
const db=require("./config/db");
const sessions=require("./utils/sessions");

const app=express();

app.use(cors());
app.use(express.json());

// Session revocation: rejects tokens whose jti was revoked (logout, or a
// different account logging in on the same browser with prevToken).
sessions.ensureTable(db, (err) => {
  if (err) console.error("Session table migration failed:", err.message || err);
});
app.use(sessions.revocationGate(db));

app.use("/api/auth",require("./routes/auth"));

app.use("/api/leaves",require("./routes/leaves"));

app.use("/api/leaves/users",require("./routes/leaves"));
app.use("/api/leaves/alladmin",require("./routes/leaves"));
app.use("/api/permission-remaining",require("./routes/leaves"));
app.use("/api/leaves/delete",require("./routes/leaves"));

app.use("/api/leaves/admin_userspanel",require("./routes/leaves"));
app.use("/api/leaves/adminpanel",require("./routes/leaves"));


app.use("/api/list", require("./routes/auth"));
app.use("/api/auth/profile",require("./routes/auth"));
app.use("/api/todos", require("./routes/todo"));


app.use("/api/attendance", require("./routes/attandance")); 


app.use("/api/timesheet", require("./routes/timesheet"));

app.use("/api/holidays", require("./routes/holidays"));

app.use("/api/tasks-project", require("./routes/tasksWithProject"));

app.use("/api/ai-summary", require("./routes/aiReport"));

app.use("/api/reports", require("./routes/reports"));

app.use("/api/tasks_report", require("./routes/taskreports"));

app.use("/api/roles", require("./routes/roles"));

app.use("/api/crud", require("./routes/crud"));

app.use("/api/intercom", require("./routes/intercom"));

app.use("/api/notifications", require("./routes/notifications"));

// Schema migration: timesheet.project_id + cleanup of legacy freezed module rows
require("./utils/freezedModules").runFreezedMigrations((err) => {
  if (err) console.error("Freezed modules migration failed:", err.message || err);
});

// Daily 8:00 AM email: everyone on approved leave today
require("./utils/dailyLeaveEmail").scheduleDailyLeaveEmail();

app.listen(5000,()=>console.log("Backend running"));

