/**
 * VerifyOtp — pre-signup identity verification.
 *
 * Step 1: vendor chooses a channel (email or phone) and enters their address.
 * Step 2: backend sends a 6-digit code to that channel.
 * Step 3: vendor types the code. On success we stash the verified contact
 *   in sessionStorage and route to /signup.
 *
 * The sessionStorage key (`cravio.verifiedContact`) is the contract with
 * SignUp.jsx — it must contain at least { channel, value, email, phone }
 * where email / phone are best-guess for whichever channel was used (the
 * other is left empty so SignUp can show only what's relevant).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowRight, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { VERIFIED_KEY } from './SignUp';
import { isEmail, isPhone } from '../utils/validators';

const CHANNELS = [
    { key: 'email', label: 'Email', icon: Mail, placeholder: 'you@business.com' },
    { key: 'phone', label: 'Phone', icon: Phone, placeholder: '08012345678' },
];

export default function VerifyOtp() {
    const { sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('collect'); // 'collect' | 'verify'
    const [channel, setChannel] = useState('email');
    const [contact, setContact] = useState({ email: '', phone: '' });
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const [channelStatus, setChannelStatus] = useState(null); // 'sent' | 'error' | null

    const [token, setToken] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef([]);

    // Resend cooldown ticker.
    useEffect(() => {
        if (resendCooldown <= 0) return undefined;
        const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // Reset code UI whenever the user switches channel mid-flow.
    useEffect(() => {
        setToken(['', '', '', '', '', '']);
        setChannelStatus(null);
        setVerifyError('');
    }, [channel]);

    const addressForChannel = () => {
        if (channel === 'email') return contact.email.trim();
        // Normalise Nigerian numbers into E.164 for the Supabase phone OTP.
        const raw = String(contact.phone || '').replace(/\s/g, '');
        if (raw.startsWith('+')) return raw;
        if (raw.startsWith('0')) return `+234${raw.slice(1)}`;
        return `+${raw}`;
    };

    const validateContact = () => {
        const value = addressForChannel();
        const err = channel === 'email' ? isEmail(value) : isPhone(contact.phone);
        setErrors({ [channel]: err });
        return !err;
    };

    const send = async () => {
        if (!validateContact()) return;
        setSending(true);
        try {
            await sendOtp({
                channel,
                email: channel === 'email' ? contact.email.trim() : undefined,
                phone: channel === 'phone' ? addressForChannel() : undefined,
            });
            setChannelStatus('sent');
            setStep('verify');
            setResendCooldown(60);
            toast.success(`Verification code sent to your ${channel}`);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } catch (err) {
            if (err.isNetworkError) {
                toast.error(err.message);
            } else {
                toast.error(err.response?.data?.error || 'Could not send code');
            }
            setChannelStatus('error');
        } finally {
            setSending(false);
        }
    };

    const tokenHandlers = {
        onChange: (index, value) => {
            const digits = value.replace(/\D/g, '').slice(0, 1);
            setToken((prev) => {
                const next = [...prev];
                next[index] = digits;
                return next;
            });
            if (digits && inputRefs.current[index + 1]) inputRefs.current[index + 1].focus();
        },
        onKeyDown: (index, e) => {
            if (e.key === 'Backspace' && !e.currentTarget.value && inputRefs.current[index - 1]) {
                inputRefs.current[index - 1].focus();
            }
        },
        onPaste: (e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (!pasted) return;
            e.preventDefault();
            const padded = pasted.split('').concat(Array(6 - pasted.length).fill(''));
            setToken(padded);
        },
    };

    const submitCode = async (e) => {
        e.preventDefault();
        setVerifyError('');

        const t = token.join('');
        if (t.length !== 6) {
            setVerifyError('Enter all 6 digits');
            return;
        }

        setVerifying(true);
        try {
            await verifyOtp({
                channel,
                email: channel === 'email' ? contact.email.trim() : undefined,
                phone: channel === 'phone' ? addressForChannel() : undefined,
                token: t,
            });
            // Stash whatever we know. SignUp only reads the field matching the
            // chosen channel, so the unused one can stay empty.
            sessionStorage.setItem(
                VERIFIED_KEY,
                JSON.stringify({
                    channel,
                    email: channel === 'email' ? contact.email.trim() : '',
                    phone: channel === 'phone' ? contact.phone.trim() : '',
                })
            );
            toast.success('Identity verified');
            navigate('/signup', { replace: true });
        } catch (err) {
            if (err.isNetworkError) {
                setVerifyError(err.message);
            } else {
                const data = err.response?.data;
                setVerifyError(data?.error || 'Code is invalid or expired');
                if (data?.code === 'invalid_token') {
                    setToken(['', '', '', '', '', '']);
                    inputRefs.current[0]?.focus();
                }
            }
        } finally {
            setVerifying(false);
        }
    };

    const activeChannel = CHANNELS.find((c) => c.key === channel);
    const ChannelIcon = activeChannel.icon;

    if (step === 'collect') {
        return (
            <AuthShell
                title="Verify your identity"
                subtitle="Pick where we should send a 6-digit code to confirm your vendor application."
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                    className="space-y-5"
                >
                    <ChannelToggle value={channel} onChange={setChannel} />

                    <Input
                        type={channel === 'email' ? 'email' : 'tel'}
                        label={activeChannel.label}
                        placeholder={activeChannel.placeholder}
                        value={channel === 'email' ? contact.email : contact.phone}
                        onChange={(e) =>
                            setContact((prev) => ({
                                ...prev,
                                [channel]: e.target.value,
                            }))
                        }
                        leftIcon={<ChannelIcon size={16} />}
                        error={errors[channel]}
                        autoComplete={channel === 'email' ? 'email' : 'tel'}
                        required
                    />

                    <Button
                        type="submit"
                        size="lg"
                        loading={sending}
                        className="w-full text-base font-semibold shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 hover:-translate-y-0.5 transition-all"
                    >
                        Send code <ArrowRight size={18} />
                    </Button>
                </form>

                <p className="text-sm text-center text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-brand-orange font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Enter your code"
            subtitle={`We sent a 6-digit code to your ${channel}.`}
        >
            <form onSubmit={submitCode} className="space-y-6">
                <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                        <span className="text-gray-400">
                            <ChannelIcon size={16} />
                        </span>{' '}
                        {activeChannel.label} code
                        {channelStatus === 'error' && (
                            <span className="ml-2 text-xs text-amber-600 font-normal">
                                could not be sent
                            </span>
                        )}
                    </label>
                    <div className="flex gap-2" onPaste={tokenHandlers.onPaste}>
                        {token.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => {
                                    inputRefs.current[i] = el;
                                }}
                                value={digit}
                                onChange={(e) => tokenHandlers.onChange(i, e.target.value)}
                                onKeyDown={(e) => tokenHandlers.onKeyDown(i, e)}
                                inputMode="numeric"
                                maxLength={1}
                                className="w-10 h-12 text-center text-lg font-semibold rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                                aria-label={`${activeChannel.label} digit ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {verifyError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {verifyError}
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    loading={verifying}
                    className="w-full text-base font-semibold shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 hover:-translate-y-0.5 transition-all"
                >
                    <ShieldCheck size={18} /> Verify and continue
                </Button>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <button
                        type="button"
                        onClick={() => {
                            setStep('collect');
                            setToken(['', '', '', '', '', '']);
                            setVerifyError('');
                        }}
                        className="inline-flex items-center gap-1 hover:text-gray-800"
                    >
                        <ArrowLeft size={12} /> Change {channel}
                    </button>
                    <button
                        type="button"
                        disabled={resendCooldown > 0 || sending}
                        onClick={send}
                        className="inline-flex items-center gap-1 disabled:opacity-50 hover:text-gray-800"
                    >
                        <RefreshCw size={12} />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                </div>
            </form>
        </AuthShell>
    );
}

function ChannelToggle({ value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Send code via</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
                {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    const active = value === c.key;
                    return (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => onChange(c.key)}
                            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                active
                                    ? 'bg-white text-brand-orange shadow-sm border border-brand-orange/20'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-pressed={active}
                        >
                            <Icon size={16} />
                            {c.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
