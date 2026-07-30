/**
 * SignUp page (full vendor application form).
 *
 * Gated behind successful OTP verification at /verify-otp — the verified
 * contact is read from sessionStorage. If it's missing the user is bounced
 * back to /verify-otp. The vendor can verify with email OR phone, so we
 * read whichever channel they used and only show the relevant pre-filled
 * field.
 *
 * Fields:
 *   - business name (required)
 *   - verified email OR phone (read-only, pre-filled)
 *   - the OTHER contact channel (required if email was verified, we still
 *     need a phone; optional if phone was verified)
 *   - password (+ confirm)
 *   - description, address (optional)
 *   - opening hours (per-day editor)
 *   - CAC document upload (optional)
 *
 * On success → toast + navigate('/pending'). The backend has created the
 * Supabase auth user but won't let them sign in until an admin approves.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, CheckCircle2, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import AuthShell, { AuthFormBody, AuthFormFooter } from '../components/auth/AuthShell';
import PasswordStrength from '../components/auth/PasswordStrength';
import CacUploader from '../components/auth/CacUploader';
import HoursEditor, { hoursToPayload } from '../components/auth/HoursEditor';
import {
    isStrongPassword,
    passwordsMatch,
    runValidators,
    minLength,
    isPhone,
} from '../utils/validators';

const VERIFIED_KEY = 'cravio.verifiedContact';

function readVerified() {
    try {
        const raw = sessionStorage.getItem(VERIFIED_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function SignUp() {
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const [verified, setVerified] = useState(() => readVerified());
    const [form, setForm] = useState({
        business_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        description: '',
        address: '',
    });
    const [hours, setHours] = useState(null);
    const [cac, setCac] = useState({ url: null, fileName: null });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // If the user landed here without verifying first, send them back.
    useEffect(() => {
        if (!verified?.channel || (!verified?.email && !verified?.phone)) {
            navigate('/verify-otp', { replace: true });
        }
    }, [verified, navigate]);

    // Pre-fill the channel they verified on, and require the OTHER if it
    // was email (we need a phone number for delivery / contact).
    useEffect(() => {
        if (!verified) return;
        setForm((prev) => ({
            ...prev,
            email: verified.email || prev.email,
            phone: verified.phone || prev.phone,
        }));
    }, [verified]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const otherChannelRequired = verified?.channel === 'email';
    const otherChannelValue = verified?.channel === 'email' ? form.phone : form.email;
    const otherChannelValid = useMemo(() => {
        if (!otherChannelRequired) return true;
        return !isPhone(otherChannelValue);
    }, [otherChannelRequired, otherChannelValue]);

    const validate = () => {
        const next = {
            business_name: runValidators(form.business_name, [minLength(2)]),
            password: isStrongPassword(form.password),
            confirm_password: passwordsMatch(form.password, form.confirm_password),
        };
        if (otherChannelRequired) {
            next[verified.channel === 'email' ? 'phone' : 'email'] = isPhone(otherChannelValue);
        }
        setErrors(next);
        return Object.values(next).every((v) => !v);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const verifiedEmail = verified.channel === 'email' ? verified.email : form.email.trim();
            const verifiedPhone = verified.channel === 'phone' ? verified.phone : form.phone.trim();

            await signUp({
                business_name: form.business_name.trim(),
                email: verifiedEmail,
                phone: verifiedPhone,
                password: form.password,
                description: form.description.trim() || undefined,
                address: form.address.trim() || undefined,
                opening_hours: hoursToPayload(hours),
                cac_document_url: cac.url || undefined,
            });
            // Clear the verified-contact stash so a back-nav doesn't reuse it.
            sessionStorage.removeItem(VERIFIED_KEY);
            toast.success('Account created — awaiting admin approval');
            navigate('/pending');
        } catch (err) {
            if (err.isNetworkError) {
                toast.error(err.message);
            } else {
                const data = err.response?.data;
                if (data?.code === 'duplicate_email') {
                    setErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
                } else if (data?.code === 'duplicate_phone') {
                    setErrors((prev) => ({ ...prev, phone: 'This phone number is already registered' }));
                }
                toast.error(data?.error || err.message || 'Sign up failed');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!verified?.channel || (!verified?.email && !verified?.phone)) {
        return (
            <AuthShell title="Sign up" subtitle="Verifying your details…">
                <p className="text-sm text-gray-500 text-center">Redirecting…</p>
            </AuthShell>
        );
    }

    const verifiedEmail = verified.channel === 'email' ? verified.email : '';
    const verifiedPhone = verified.channel === 'phone' ? verified.phone : '';
    const otherLabel = verified.channel === 'email' ? 'Phone' : 'Email';
    const otherValue = verified.channel === 'email' ? form.phone : form.email;
    const otherPlaceholder = verified.channel === 'email' ? '08012345678' : 'you@business.com';
    const otherType = verified.channel === 'email' ? 'tel' : 'email';
    const otherIcon = verified.channel === 'email' ? <Phone size={16} /> : <Mail size={16} />;
    const otherError = errors[verified.channel === 'email' ? 'phone' : 'email'];

    return (
        <AuthShell
            title="Open your Cravio kitchen"
            subtitle="Tell us about your business to get started."
            maxWidth="max-w-md"
        >
            <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
                <AuthFormBody>
                    <Input
                        label="Business name *"
                        value={form.business_name}
                        onChange={set('business_name')}
                        error={errors.business_name}
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {verifiedEmail && <ReadOnlyField icon={<Mail size={14} />} label="Email (verified)" value={verifiedEmail} />}
                        {verifiedPhone && <ReadOnlyField icon={<Phone size={14} />} label="Phone (verified)" value={verifiedPhone} />}
                    </div>

                    {otherChannelRequired && (
                        <Input
                            type={otherType}
                            label={`${otherLabel} *`}
                            placeholder={otherPlaceholder}
                            value={otherValue}
                            onChange={set(verified.channel === 'email' ? 'phone' : 'email')}
                            leftIcon={otherIcon}
                            error={otherError}
                            autoComplete={otherType === 'email' ? 'email' : 'tel'}
                            required
                        />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <Input
                                label="Password *"
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                error={errors.password}
                                hint="8+ chars with letters and numbers"
                                autoComplete="new-password"
                                leftIcon={<Lock size={16} />}
                                required
                            />
                            <PasswordStrength value={form.password} />
                        </div>
                        <Input
                            label="Confirm password *"
                            type="password"
                            value={form.confirm_password}
                            onChange={set('confirm_password')}
                            error={errors.confirm_password}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <Textarea
                        label="Description"
                        rows={2}
                        value={form.description}
                        onChange={set('description')}
                        placeholder="What makes your kitchen special?"
                    />

                    <Input
                        label="Address"
                        value={form.address}
                        onChange={set('address')}
                        placeholder="Campus / street address"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Opening hours
                        </label>
                        <HoursEditor value={hours} onChange={setHours} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CAC document <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <CacUploader value={cac} onChange={setCac} />
                    </div>
                </AuthFormBody>

                <AuthFormFooter>
                    <Button
                        type="submit"
                        loading={loading}
                        size="lg"
                        className="w-full text-base font-semibold shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 hover:-translate-y-0.5 transition-all"
                    >
                        <ArrowRight size={18} /> Create my vendor account
                    </Button>

                    <p className="text-sm text-center text-gray-500 mt-3">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-orange font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </AuthFormFooter>
            </form>
        </AuthShell>
    );
}

function ReadOnlyField({ icon, label, value }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <span className="text-gray-400">{icon}</span> {label}
            </label>
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-sm text-gray-800">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <span className="truncate">{value}</span>
            </div>
        </div>
    );
}

export { VERIFIED_KEY, readVerified };
