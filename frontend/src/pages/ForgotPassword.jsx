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
            toast.error(err?.message || 'Could not send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Reset your password"
            subtitle={
                sent
                    ? 'Check your inbox for a reset link.'
                    : 'Enter the email tied to your vendor account.'
            }
        >
            {sent ? (
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={26} />
                    </div>
                    <p className="text-sm text-gray-600">
                        We sent a password-reset link to <span className="font-medium">{email}</span>.
                        The link expires in 1 hour.
                    </p>
                    <Link to="/login" className="block">
                        <Button variant="ghost" className="w-full">
                            <ArrowLeft size={14} /> Back to sign in
                        </Button>
                    </Link>
                </div>
            ) : (
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
                    <Button type="submit" size="lg" loading={loading} className="w-full">
                        Send reset link
                    </Button>
                    <p className="text-sm text-center text-gray-500">
                        Remembered it?{' '}
                        <Link to="/login" className="text-brand-orange font-medium hover:underline">
                            Back to sign in
                        </Link>
                    </p>
                </form>
            )}
        </AuthShell>
    );
}