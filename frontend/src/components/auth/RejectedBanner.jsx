/**
 * RejectedBanner — surfaced above the login form when the backend reports
 * verification_status === 'rejected', or on /pending?status=rejected.
 *
 * Renders the rejection reason if we have one, plus a mailto CTA so vendors
 * can chase the admin without leaving the page.
 */
import { AlertTriangle, Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'support@cravio.com';

export default function RejectedBanner({ reason, contactEmail = SUPPORT_EMAIL }) {
    return (
        <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
            <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="font-semibold">Your vendor application was rejected</p>
                    {reason && (
                        <p className="mt-1 text-red-700">
                            <span className="font-medium">Reason: </span>
                            {reason}
                        </p>
                    )}
                    <a
                        href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                            'Cravio vendor application — appeal'
                        )}`}
                        className="mt-3 inline-flex items-center gap-1.5 font-medium text-red-700 hover:text-red-900 underline underline-offset-2"
                    >
                        <Mail size={14} /> Contact {contactEmail}
                    </a>
                </div>
            </div>
        </div>
    );
}