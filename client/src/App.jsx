import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

import PrivateRoute from "./routes/PrivateRoute";
import LandingPage from "./pages/LandingPage/LandingPage";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import ActivateAccount from "./pages/Auth/ActivateAccount";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import CitizenDashboard from "./pages/Citizen/CitizenDashboard";
import ReportIssue from "./pages/Citizen/ReportIssue";
import MyComplaints from "./pages/Citizen/MyComplaints";
import ComplaintDetails from "./pages/Citizen/ComplaintDetails";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import VerifyIssues from "./pages/Admin/VerifyIssues";
import AssignOfficers from "./pages/Admin/AssignOfficers";
import StaffInvitations from "./pages/Admin/StaffInvitations";
import OfficerDashboard from "./pages/Officer/OfficerDashboard";
import OfficerWork from "./pages/Officer/OfficerWork";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} toastClassName="custom-toast" />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login isStaffPortal={false} />} />
          <Route path="/staff/login" element={<Login isStaffPortal={true} />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/join" element={<Signup />} />
          <Route path="/activate" element={<ActivateAccount />} />
          <Route path="/activate/:token" element={<ActivateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />

          {/* Citizen */}
          <Route
            path="/citizen/dashboard"
            element={
              <PrivateRoute allowedRoles={["CITIZEN"]}>
                <CitizenDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/citizen/report"
            element={
              <PrivateRoute allowedRoles={["CITIZEN"]}>
                <ReportIssue />
              </PrivateRoute>
            }
          />
          <Route
            path="/citizen/complaints"
            element={
              <PrivateRoute allowedRoles={["CITIZEN"]}>
                <MyComplaints />
              </PrivateRoute>
            }
          />
          <Route
            path="/complaint/:id"
            element={
              <PrivateRoute
                allowedRoles={[
                  "CITIZEN",
                  "MUNICIPAL_OFFICER",
                  "FIELD_WORKER",
                  "SYSTEM_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <ComplaintDetails />
              </PrivateRoute>
            }
          />

          {/* System Admin & Super Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedRoles={["SYSTEM_ADMIN", "SUPER_ADMIN"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/super-admin/dashboard"
            element={
              <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/verify"
            element={
              <PrivateRoute allowedRoles={["SYSTEM_ADMIN", "SUPER_ADMIN"]}>
                <VerifyIssues />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/assign"
            element={
              <PrivateRoute allowedRoles={["SYSTEM_ADMIN", "SUPER_ADMIN"]}>
                <AssignOfficers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/invitations"
            element={
              <PrivateRoute allowedRoles={["SYSTEM_ADMIN", "SUPER_ADMIN"]}>
                <StaffInvitations />
              </PrivateRoute>
            }
          />

          {/* Municipal Officer */}
          <Route
            path="/officer/dashboard"
            element={
              <PrivateRoute allowedRoles={["MUNICIPAL_OFFICER"]}>
                <OfficerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/officer/work"
            element={
              <PrivateRoute allowedRoles={["MUNICIPAL_OFFICER"]}>
                <OfficerWork />
              </PrivateRoute>
            }
          />
          <Route
            path="/officer/invitations"
            element={
              <PrivateRoute allowedRoles={["MUNICIPAL_OFFICER"]}>
                <StaffInvitations />
              </PrivateRoute>
            }
          />

          {/* Field Worker */}
          <Route
            path="/field-worker/dashboard"
            element={
              <PrivateRoute allowedRoles={["FIELD_WORKER"]}>
                <OfficerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/field-worker/work"
            element={
              <PrivateRoute allowedRoles={["FIELD_WORKER"]}>
                <OfficerWork />
              </PrivateRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
