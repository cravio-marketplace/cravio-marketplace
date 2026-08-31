/**
 * App entry. Owns the auth-aware routing.
 *
 * - Public routes: /login, /signup, /forgot-password, /reset-password
 * - Authed-but-pending: /pending (pending and rejected vendors land here)
 * - Approved-only: /dashboard
 *
 * <RequireAuth> decides where to send the user based on auth state +
 * verification_status. No view-state machine in App anymore — react-router
 * owns the URLs.
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import VerifyPending from './pages/VerifyPending';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';

/**
 * Gate the dashboard behind an approved vendor. Pending and rejected vendors
 * get bounced to /pending; unauthenticated visitors get bounced to /login.
 */
function RequireAuth({ children }) {
    const { isAuthenticated, vendor } = useAuth();
    const location = useLocation();
    const status = vendor?.verification_status;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    if (status === 'pending' || status === 'rejected') {
        return <Navigate to="/pending" replace />;
    }
    if (status !== 'open' && status !== 'approved') {
        return <Navigate to="/login" replace />;
    }
    return children;
}

/**
 * Public auth pages should not be reachable while already signed in.
 * Authed users get sent to /dashboard (or /pending if not approved).
 */
function RedirectIfAuthed({ children }) {
    const { isAuthenticated, vendor } = useAuth();
    if (!isAuthenticated) return children;
    const status = vendor?.verification_status;
    if (status === 'pending' || status === 'rejected') return <Navigate to="/pending" replace />;
    if (status === 'open' || status === 'approved') return <Navigate to="/dashboard" replace />;
    return children;
}

function Shell() {
    return (
        <Routes>
            {/* Public auth */}
            <Route
                path="/login"
                element={
                    <RedirectIfAuthed>
                        <Login />
                    </RedirectIfAuthed>
                }
            />
                <Route
                    path="/signup"
                    element={
                        <RedirectIfAuthed>
                            <SignUp />
                        </RedirectIfAuthed>
                    }
                />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Pending / rejected — authed vendors only */}
            <Route
                path="/pending"
                element={
                    <RequireAuthSoft>
                        <VerifyPending />
                    </RequireAuthSoft>
                }
            />

            {/* Dashboard — approved vendors only */}
            <Route
                path="/dashboard"
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />

            {/* Default + catch-all */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

/**
 * Soft auth gate for /pending: must be authenticated, but any status is OK.
 * Unauthed visitors are bounced to /login.
 */
function RequireAuthSoft({ children }) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3500,
                    style: {
                        borderRadius: '12px',
                        background: '#111827',
                        color: '#fff',
                        fontSize: '14px',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    },
                    success: { iconTheme: { primary: '#FF6B00', secondary: '#fff' } },
                }}
            />
            <Shell />
        </AuthProvider>
    );
}