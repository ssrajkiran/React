import { useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";

export default function Login(){

 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");

 const login=async()=>{
  try{
   const r=await api.post("/auth/login",{email,password});
   localStorage.setItem("token",r.data.token);
   location = r.data.role==="admin" ? "/admin" : "/employee";
  }catch{
   alert("Invalid Login");
  }
 };

 return(
 <div style={{
  minHeight:"100vh",
  display:"flex",
  justifyContent:"center",
  alignItems:"center",
  background:"#f2f4f8"
 }}>

 <div style={{
  width:350,
  background:"#fff",
  padding:30,
  borderRadius:10,
  boxShadow:"0 0 10px rgba(0,0,0,.1)"
 }}>

 <h2 style={{textAlign:"center"}}>Leave Management</h2>

 <input
  placeholder="Email"
  onChange={e=>setEmail(e.target.value)}
  style={input}
 />

 <input
  type="password"
  placeholder="Password"
  onChange={e=>setPassword(e.target.value)}
  style={input}
 />

 <button onClick={login} style={btn}>
  Login
 </button>

 <p style={{textAlign:"center"}}>
  New user? <Link to="/register">Register</Link>
 </p>

 </div>

 </div>
 );
}

const input={
 width:"100%",
 padding:10,
 marginTop:15,
 borderRadius:5,
 border:"1px solid #ccc",
 outline:"none"
};

const btn={
 width:"100%",
 marginTop:20,
 padding:10,
 background:"#4f46e5",
 color:"#fff",
 border:"none",
 borderRadius:5,
 cursor:"pointer"
};
