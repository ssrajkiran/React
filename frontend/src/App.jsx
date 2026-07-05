import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Employee from "./pages/Dashboard/Employeedashboard";
import Admin from "./pages/Dashboard/AdminDashboard";
import Leaves from "./pages/Form/leaves.jsx";
import AdminLeaves from "./pages/Form/adminleaves.jsx";
import Profile from "./pages/profile.jsx";
import User from "./pages/User/userlist.jsx";
import Report from "./pages/Report/report.jsx";
import CreateUser from "./pages/User/createuser.jsx";
import Holiday from "./pages/Holiday/holiday.jsx";
import TaskList from "./pages/Task/tasklist.jsx";
import TaskReport from "./pages/Task/taskreport.jsx";
import AISummary from "./pages/AI/AISummary";
import AIHistory from "./pages/AI/AIhistory.jsx";
import Todo from "./pages/Todo/Todo.jsx";
import EmployeeTimesheet from "./pages/Timesheet/EmployeeTimesheetList.jsx";
import AdminTimesheet from "./pages/Timesheet/AdminTimesheetList.jsx";

export default function App() {
  const location = useLocation(); // ✅ ADD THIS

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* ✅ KEY FIX HERE */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/employee" element={<Employee />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/employee/leaves" element={<Leaves />} />
        <Route path="/admin/leaves" element={<AdminLeaves />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/employee/timesheet" element={<EmployeeTimesheet />} />
        <Route path="/admin/timesheet" element={<AdminTimesheet />} />
        <Route path="/employee/report" element={<Report />} />
        <Route path="/employee/userslist" element={<User />} />
        <Route path="/admin/users/create" element={<CreateUser />} />
        <Route path="/holidays" element={<Holiday />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/admin/ai-summary" element={<AISummary />} />
        <Route path="/admin/ai-summary/history" element={<AIHistory />} />
        <Route path="/tasks/report" element={<TaskReport />} />
         <Route path="/todo" element={<Todo />} />
      </Routes>
    </>
  );
}
