const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());
app.use(express.json());

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

app.use("/api/tasks_report", require("./routes/taskreports"));

app.listen(5000,()=>console.log("Backend running"));

