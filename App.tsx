
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import HistoryPage from './pages/HistoryPage';
import ComparisonPage from './pages/ComparisonPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import VendorsPage from './pages/VendorsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';

// ProtectedRoute now accepts an optional 'allowedRoles' prop
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div>Loading...</div>;
    
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // RBAC Check: If specific roles are required, and the user doesn't match, kick them to home
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<ProtectedRoute><Layout><UploadPage /></Layout></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><Layout><VendorsPage /></Layout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>} />
          <Route path="/comparison" element={<ProtectedRoute><Layout><ComparisonPage /></Layout></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><Layout><NotesPage /></Layout></ProtectedRoute>} />
          
          {/* CRITICAL: Protect Settings Page so only Admins can access it */}
          <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                  <Layout><SettingsPage /></Layout>
              </ProtectedRoute>
          } />
          
          <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
