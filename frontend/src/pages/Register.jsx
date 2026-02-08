import { useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";

export default function Register(){

 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [role,setRole]=useState("employee");

 const submit = async()=>{
  try{
   await api.post("/auth/register",{name,email,password,role});
   alert("Registered Successfully");
   location="/";
  }catch{
   alert("Registration failed");
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

 <h2 style={{textAlign:"center"}}>Create Account</h2>

 <input
  placeholder="Full Name"
  onChange={e=>setName(e.target.value)}
  style={input}
 />

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

 <select onChange={e=>setRole(e.target.value)} style={input}>
  <option value="employee">Employee</option>
  <option value="admin">Admin</option>
 </select>

 <button onClick={submit} style={btn}>
  Register
 </button>

 <p style={{textAlign:"center"}}>
  Already have account? <Link to="/">Login</Link>
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
 background:"#16a34a",
 color:"#fff",
 border:"none",
 borderRadius:5,
 cursor:"pointer"
};
