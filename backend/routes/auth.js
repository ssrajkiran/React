const router=require("express").Router();
const db=require("../config/db");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

router.post("/register",(req,res)=>{
 const {name,email,password,role}=req.body;

 const hash=bcrypt.hashSync(password,10);

 db.query(
 "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
 [name,email,hash,role],
 ()=>res.send("ok")
 );
});

router.post("/login",(req,res)=>{
 const {email,password}=req.body;

 db.query(
 "SELECT * FROM users WHERE email=?",
 [email],
 (e,r)=>{
  if(!r.length) return res.sendStatus(401);

  if(!bcrypt.compareSync(password,r[0].password))
   return res.sendStatus(401);

  const token=jwt.sign({id:r[0].id,role:r[0].role},"secret");

  res.json({token,role:r[0].role});
 });
});

module.exports=router;
