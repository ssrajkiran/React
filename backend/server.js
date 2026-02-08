const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",require("./routes/auth"));
app.use("/api/leaves",require("./routes/leaves"));

app.listen(5000,()=>console.log("Backend running"));
