import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning, ArrowRight } from 'lucide-react';
import supabase from '../api/supabaseClient';

export default function EmailConfirmed() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        let active = true;
        const hasProviderError = searchParams.has('error') || searchParams.has('error_description');
        if (hasProviderError) {
            setStatus('error');
            return () => { active = false; };
        }

        const checkSession = async () => {
            // Supabase JS processes the confirmation callback from the URL on load.
            const { data, error } = await supabase.auth.getSession();
            if (!active) return;
            if (error) setStatus('error');
            else if (data?.session?.user?.email_confirmed_at) setStatus('success');
            else setStatus('error');
        };
        checkSession();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!active) return;
            setStatus(session?.user?.email_confirmed_at ? 'success' : 'error');
        });
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [searchParams]);

    const success = status === 'success';
    const checking = status === 'checking';

    return (
        <main className="min-h-screen bg-[#fff8f3] px-5 py-10 flex items-center justify-center text-[#1f1f1f]">
            <section className="w-full max-w-md rounded-[28px] border border-[#f1e9e2] bg-white px-7 py-10 text-center shadow-xl sm:px-10">
                <Link to="/login" className="font-heading text-3xl font-bold tracking-tight">crav<span className="text-brand-orange">io</span></Link>
                <div className={`mx-auto mt-9 grid h-16 w-16 place-items-center rounded-2xl ${success ? 'bg-[#e9f8e6] text-[#368447]' : 'bg-[#fff1e8] text-brand-orange'}`}>
                    {success ? <CheckCircle2 size={32}/> : <MailWarning size={32}/>}
                </div>
                <p className="mt-6 text-[10px] font-extrabold tracking-[1.8px] text-[#b27a53]">{checking ? 'VERIFYING EMAIL' : success ? 'EMAIL VERIFIED' : 'CONFIRMATION LINK ISSUE'}</p>
                <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">{checking ? 'Confirming your email…' : success ? 'Your email has been confirmed!' : 'We couldn’t confirm your email'}</h1>
                <p className="mt-3 text-sm leading-6 text-[#817971]">{checking ? 'Please wait while Cravio verifies your confirmation link.' : success ? 'Your email address is now verified. Return to Cravio to continue with your vendor account.' : 'This link may have expired or already been used. Return to Cravio and contact support if you need a new confirmation link.'}</p>
                {!checking && <Link to="/login" className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white">Return to Cravio <ArrowRight size={16}/></Link>}
            </section>
        </main>
    );
}
