/**
 * ResetPassword — landed on from the email link. Supabase Auth put a recovery
 * session in the URL hash; we wait for that to resolve before showing the
 * new-password form.
 *
 * If no recovery session is active (e.g. user opened the URL directly) we
 * send them to /forgot-password.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import AuthShell from '../components/auth/AuthShell';
import PasswordStrength from '../components/auth/PasswordStrength';
import { useAuth } from '../contexts/AuthContext';
import { hasRecoverySession } from '../api/auth';
import { isStrongPassword, passwordsMatch } from '../utils/validators';

export default function ResetPassword() {
    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Give Supabase a tick to parse the hash, then check.
        let cancelled = false;
        (async () => {
            await new Promise((r) => setTimeout(r, 100));
            const ok = await hasRecoverySession();
            if (cancelled) return;
            if (!ok) navigate('/forgot-password', { replace: true });
            else setReady(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const submit = async (e) => {
        e.preventDefault();
        const next = {
            password: isStrongPassword(password),
            confirm: passwordsMatch(password, confirm),
        };
        setErrors(next);
        if (Object.values(next).some(Boolean)) return;

        setLoading(true);
        try {
            const { error } = await updatePassword(password);
            if (error) throw error;
            setDone(true);
            toast.success('Password updated');
        } catch (err) {
            toast.error(err?.message || 'Could not update password');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={26} />
                    </div>
                    <Link to="/login" className="block">
                        <Button size="lg" className="w-full">
                            Continue to sign in
                        </Button>
                    </Link>
                </div>
            </AuthShell>
        );
    }

    if (!ready) {
        return (
            <AuthShell title="Verifying reset link…" subtitle="One moment.">
                <p className="text-sm text-gray-500 text-center">Loading…</p>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Set a new password" subtitle="Choose a strong password you don't reuse elsewhere.">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Input
                        type={show ? 'text' : 'password'}
                        label="New password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={errors.password}
                        hint="8+ chars with letters and numbers"
                        autoComplete="new-password"
                        leftIcon={<Lock size={16} />}
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShow((v) => !v)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label={show ? 'Hide password' : 'Show password'}
                            >
                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        }
                        required
                    />
                    <PasswordStrength value={password} />
                </div>
                <Input
                    type={show ? 'text' : 'password'}
                    label="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={errors.confirm}
                    autoComplete="new-password"
                    required
                />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Update password
                </Button>
            </form>
        </AuthShell>
    );
}