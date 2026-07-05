import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const LogActivity = lazy(() => import('./pages/LogActivity'));
const Logs = lazy(() => import('./pages/Logs'));
const Projects = lazy(() => import('./pages/Projects'));
const Engineers = lazy(() => import('./pages/Engineers'));
const Customers = lazy(() => import('./pages/Customers'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const Import = lazy(() => import('./pages/Import'));
const Billing = lazy(() => import('./pages/Billing'));
const Status = lazy(() => import('./pages/Status'));
const Digest = lazy(() => import('./pages/Digest'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Settings = lazy(() => import('./pages/Settings'));
const Quotes = lazy(() => import('./pages/Quotes'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Booking = lazy(() => import('./pages/Booking'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Variance = lazy(() => import('./pages/Variance'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function PageFallback() {
  return <div style={{ padding: 24, color: '#64748b', fontSize: 14 }}>Loading…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/book/:slug" element={<Booking />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="logs" element={<Logs />} />
            <Route path="logs/new" element={<LogActivity />} />
            <Route path="projects" element={<Projects />} />
            <Route path="engineers" element={<Engineers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="import" element={<Import />} />
            <Route path="billing" element={<Billing />} />
            <Route path="status" element={<Status />} />
            <Route path="digest" element={<Digest />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="tickets" element={<SupportTickets />} />
            <Route path="variance" element={<Variance />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
