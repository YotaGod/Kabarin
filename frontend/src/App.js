import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, roleHome } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CitizenDashboard from "./pages/CitizenDashboard";
import SubmitReport from "./pages/SubmitReport";
import ReportDetail from "./pages/ReportDetail";
import CityMap from "./pages/CityMap";
import OfficerDashboard from "./pages/OfficerDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminDepartments from "./pages/AdminDepartments";
import AdminOfficers from "./pages/AdminOfficers";
import AdminRouting from "./pages/AdminRouting";

function RootRedirect() {
    const { user } = useAuth();
    if (user) return <Navigate to={roleHome(user.role)} replace />;
    return <Landing />;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/citizen" element={<ProtectedRoute roles={["citizen", "officer", "admin"]}><CitizenDashboard /></ProtectedRoute>} />
                    <Route path="/citizen/submit" element={<ProtectedRoute roles={["citizen", "officer", "admin"]}><SubmitReport /></ProtectedRoute>} />
                    <Route path="/citizen/map" element={<ProtectedRoute roles={["citizen", "officer", "admin"]}><CityMap /></ProtectedRoute>} />
                    <Route path="/reports/:id" element={<ProtectedRoute roles={["citizen", "officer", "admin"]}><ReportDetail /></ProtectedRoute>} />

                    <Route path="/officer" element={<ProtectedRoute roles={["officer", "admin"]}><OfficerDashboard /></ProtectedRoute>} />
                    <Route path="/officer/map" element={<ProtectedRoute roles={["officer", "admin"]}><CityMap /></ProtectedRoute>} />

                    <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
                    <Route path="/admin/departments" element={<ProtectedRoute roles={["admin"]}><AdminDepartments /></ProtectedRoute>} />
                    <Route path="/admin/officers" element={<ProtectedRoute roles={["admin"]}><AdminOfficers /></ProtectedRoute>} />
                    <Route path="/admin/routing" element={<ProtectedRoute roles={["admin"]}><AdminRouting /></ProtectedRoute>} />
                    <Route path="/admin/map" element={<ProtectedRoute roles={["admin"]}><CityMap /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
