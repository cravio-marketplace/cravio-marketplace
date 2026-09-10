/**
 * Login page.
 *
 * Renders the shared AuthShell + the email/password form. On success the
 * auth context is updated and routing happens at the App level — this page
 * doesn't navigate. On 403 with a verification_status the user is routed to
 * /pending or shown a RejectedBanner inline.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import AuthShell from '../components/auth/AuthShell';
import RejectedBanner from '../components/auth/RejectedBanner';

function loginErrorMessage(err) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (data?.code === 'EMAIL_NOT_VERIFIED') {
        return 'Please verify your email before signing in.';
    }

    if (data?.code === 'INVALID_CREDENTIALS') {
        return 'Incorrect email or password.';
    }

    if (status === 403 && data?.error) {
        return data.error;
    }

    if (err.isNetworkError) {
        return err.friendlyMessage;
    }

    return data?.error || 'Unable to sign in. Please try again.';
}

export default function Login() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rejected, setRejected] = useState(null); // { reason } | null

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setRejected(null);

        if (!email || !password) {
            setError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            await signIn({ email, password });
            toast.success('Login successful! Redirecting to your dashboard...');
            navigate('/dashboard');
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
        
            if (data?.code === 'EMAIL_NOT_VERIFIED') {
                const message = 'Please verify your email before signing in.';
                setError(message);
                toast.error(message);
                return;
            }
        
            if (status === 403 && data?.verification_status === 'pending') {
                toast.success('Your account is pending admin approval.');
                navigate('/pending');
                return;
            }
        
            if (status === 403 && data?.verification_status === 'rejected') {
                setRejected({
                    reason: data.rejected_reason || data.error,
                });
        
                setError(
                    data.error ||
                    'Your vendor application was rejected.'
                );
        
                return;
            }
        
            const message = loginErrorMessage(err);
        
            setError(message);
            toast.error(message);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Sign in to your account"
            subtitle="Welcome back. Please enter your details."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {rejected && <RejectedBanner reason={rejected.reason} />}

                {error && !rejected && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <Input
                    type="email"
                    label="Email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    leftIcon={<Mail size={16} />}
                    required
                />

                <div>
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        leftIcon={<Lock size={16} />}
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        }
                        required
                    />
                    <div className="flex justify-end mt-1.5">
                        <Link
                            to="/forgot-password"
                            className="text-xs font-medium text-brand-orange hover:text-brand-orange-600"
                        >
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Sign in
                </Button>
            </form>

            <p className="text-sm text-gray-600 text-center mt-8">
                Don't have an account?{' '}
                <Link
                    to="/signup"
                    className="font-semibold text-brand-orange hover:text-brand-orange-600"
                >
                    Apply to become a vendor
                </Link>
            </p>
        </AuthShell>
    );
}