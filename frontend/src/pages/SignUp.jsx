/**
 * SignUp page (full vendor application form).
 *
 * Vendor signup page.
 * Creates a pending vendor account.
 * Email verification is handled by Supabase.

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
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../contexts/AuthContext";

import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Textarea from "../components/common/Textarea";
import AuthShell, {
    AuthFormBody,
    AuthFormFooter,
} from "../components/auth/AuthShell";
import PasswordStrength from "../components/auth/PasswordStrength";
import CacUploader from "../components/auth/CacUploader";
import HoursEditor, {
    hoursToPayload,
} from "../components/auth/HoursEditor";

import {
    isStrongPassword,
    passwordsMatch,
    runValidators,
    minLength,
    isPhone,
} from "../utils/validators";


export default function SignUp() {
    const { signUp } = useAuth();
    const navigate = useNavigate();

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


    // Pre-fill the channel they verified on, and require the OTHER if it
    // was email (we need a phone number for delivery / contact).

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const validate = () => {
        // Build a plain { field: errorMessage | null } map. Each validator
        // returns null when the value is fine, or a string with the reason
        // when it isn't. We never put validators inside the submitted value.
        const next = {
            business_name: runValidators(form.business_name.trim(), [minLength(2)]),
            email: form.email.trim() ? null : 'Email is required',
            phone: form.phone.trim() ? null : 'Phone is required',
            password: isStrongPassword(form.password),
            confirm_password: passwordsMatch(form.password, form.confirm_password),
        };

        setErrors(next);

        // True iff every field has no error.
        return Object.values(next).every((v) => !v);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await signUp({
                business_name: form.business_name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password,
                description: form.description.trim() || undefined,
                address: form.address.trim() || undefined,
                opening_hours: hoursToPayload(hours),
                cac_document_url: cac.url || undefined,
            });
            
            toast.success(
                "Account created successfully. Check your email to verify your account."
            );
            
            navigate("/login", {
                replace: true,
                state: {
                    emailVerificationRequired: true,
                },
            });
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
                toast.error(
                    data?.error ??
                    err.message ??
                    "Unable to create your account."
                );
            }
        } finally {
            setLoading(false);
        }
    };

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
                        <Input
                            label="Business Email *"
                            type="email"
                            value={form.email}
                            onChange={set("email")}
                            leftIcon={<Mail size={16} />}
                            error={errors.email}
                            required
                        />

                        <Input
                            label="Phone Number *"
                            type="tel"
                            value={form.phone}
                            onChange={set("phone")}
                            leftIcon={<Phone size={16} />}
                            error={errors.phone}
                            required
                        />                    

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
                        disabled={loading}
                        size="lg"
                        className="w-full text-base font-semibold shadow-lg shadow-brand-orange-500/30 hover:shadow-xl hover:shadow-brand-orange-500/40 hover:-translate-y-0.5 transition-all"
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