/**
 * VerifyPending — what we show after signup, while an admin reviews the
 * account. Also rendered at /pending?status=rejected for rejected vendors
 * coming from the login flow.
 */
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/common/Button';
import RejectedBanner from '../components/auth/RejectedBanner';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyPending() {
    const { vendor, signOut, isAuthenticated } = useAuth();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const status = params.get('status') || vendor?.verification_status || 'pending';
    const reason = vendor?.rejected_reason;
    const isRejected = status === 'rejected';

    const handleSignOut = () => {
        signOut();
        navigate('/login', { replace: true });
    };

    return (
        <AuthShell
            title={isRejected ? 'Application rejected' : 'Awaiting approval'}
            subtitle={
                isRejected
                    ? 'Your vendor application was not approved.'
                    : 'Thanks for joining Cravio!'
            }
        >
            <div className="space-y-4 text-center">
                <div
                    className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${
                        isRejected
                            ? 'bg-red-50 text-red-600'
                            : 'bg-brand-orange-50 text-brand-orange-600'
                    }`}
                >
                    {isRejected ? <AlertTriangle size={28} /> : <Clock size={28} />}
                </div>

                {isRejected ? (
                    <>
                        <RejectedBanner reason={reason} />
                        <p className="text-xs text-gray-400">
                            Reach out to support if you'd like to appeal or reapply with updated
                            information.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-600">
                            Your account is awaiting email verification. Please check your inbox and
                            follow the link to activate your account.
                        </p>
                        <p className="text-xs text-gray-400">
                            {isAuthenticated
                                ? 'In the meantime, you can sign out and come back later.'
                                : 'You can return to sign in once your email is verified.'}
                        </p>
                    </>
                )}

                <div className="flex flex-col gap-2 pt-2">
                    <Link to="/login" className="w-full">
                        <Button variant="ghost" className="w-full">
                            <LogIn size={14} /> Back to sign in
                        </Button>
                    </Link>
                    {isAuthenticated && (
                        <Button variant="ghost" onClick={handleSignOut} className="w-full">
                            <LogOut size={14} /> Sign out
                        </Button>
                    )}
                </div>
            </div>
        </AuthShell>
    );
}