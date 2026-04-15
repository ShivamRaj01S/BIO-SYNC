import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import DonorDashboard from './pages/donor/DonorDashboardView.jsx';
import PatientDashboard from './pages/patient/PatientDashboardView.jsx';
import HospitalDashboard from './pages/hospital/HospitalDashboardView.jsx';
import AdminDashboard from './pages/admin/AdminDashboardView.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="brand-pill">Loading BIO SYNC...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login mode="login" />} />
        <Route path="register" element={<Login mode="register" />} />
        <Route path="donor/*" element={<ProtectedRoute roles={['donor']}><DonorDashboard /></ProtectedRoute>} />
        <Route path="patient/*" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="hospital/*" element={<ProtectedRoute roles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />
        <Route path="admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
