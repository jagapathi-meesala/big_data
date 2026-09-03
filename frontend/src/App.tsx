import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import LiveDisaster from './pages/LiveDisaster';
import Incidents from './pages/Incidents';
import Resources from './pages/Resources';
import Allocations from './pages/Allocations';
import Hospitals from './pages/Hospitals';
import Shelters from './pages/Shelters';
import EmergencyRoutes from './pages/EmergencyRoutes';
import Volunteers from './pages/Volunteers';
import EmergencyRequests from './pages/EmergencyRequests';
import Weather from './pages/Weather';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Layout Wrapper */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Dashboard Layout Wrapper */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/live-map" element={<LiveDisaster />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/escape-routes" element={<EmergencyRoutes />} />
        <Route path="/shelters" element={<Shelters />} />
        <Route path="/volunteers" element={<Volunteers />} />
        <Route path="/sos-requests" element={<EmergencyRequests />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
