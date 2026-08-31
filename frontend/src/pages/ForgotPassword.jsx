/**
 * ForgotPassword — email-only form that triggers a Supabase password-reset
 * email. The email contains a link back to /reset-password with a recovery
 * session in the URL hash.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPassword() {
    const { requestPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error } = await requestPasswordReset(email, redirectTo);
            if (error) throw error;
            setSent(true);
        } catch (err) {
            toast.error(err?.message || "Unable to send the password reset email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Reset your password"
            subtitle={
                sent
                    ? "Check your inbox for a reset link."
                    : "Enter the email tied to your vendor account."
            }
        >
            <div className="mb-6">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-orange"
                >
                    <ArrowLeft size={16} />
                    Back to Sign In
                </Link>
            </div>
    
            <form onSubmit={submit} className="space-y-4">
                <Input
                    type="email"
                    label="Email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail size={16} />}
                    autoComplete="email"
                    required
                />
    
                <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    className="w-full"
                >
                    Send reset link
                </Button>
    
                <p className="text-sm text-center text-gray-500">
                    Remembered it?{" "}
                    <Link
                        to="/login"
                        className="text-brand-orange font-medium hover:underline"
                    >
                        Back to sign in
                    </Link>
                </p>
            </form>
        </AuthShell>
    );
}