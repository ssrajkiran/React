import {Routes,Route} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Employee from "./pages/Employee";
import Admin from "./pages/Admin";

export default function App(){
 return(
 <Routes>
  <Route path="/" element={<Login/>}/>
  <Route path="/register" element={<Register/>}/>
  <Route path="/employee" element={<Employee/>}/>
  <Route path="/admin" element={<Admin/>}/>
 </Routes>
 );
}
