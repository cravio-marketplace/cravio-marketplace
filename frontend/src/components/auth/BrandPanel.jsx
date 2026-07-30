/**
 * BrandPanel — the orange brand panel used on every public auth screen.
 * Lives here so Login, SignUp, ForgotPassword, and VerifyPending render
 * identically. Hidden on mobile (<lg), where the form panel owns the screen.
 */
export default function BrandPanel() {
    return (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-orange-500 via-brand-orange-600 to-brand-orange-700 text-white p-12 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" aria-hidden>
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white" />
                <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white" />
            </div>

            <div className="relative">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-lg">
                        C
                    </div>
                    <span className="text-2xl font-semibold tracking-tight">Cravio</span>
                </div>
            </div>

            <div className="relative max-w-md">
                <h1 className="text-4xl font-semibold leading-tight">
                    Run your kitchen, grow your business.
                </h1>
                <p className="text-white/80 mt-4 text-base leading-relaxed">
                    Manage your menu, accept orders, track revenue and reach more customers
                    — all from one dashboard.
                </p>
                <div className="mt-10 grid grid-cols-3 gap-4 text-center">
                    <Stat label="Vendors" value="500+" />
                    <Stat label="Orders / mo" value="12k" />
                    <Stat label="Cities" value="6" />
                </div>
            </div>

            <div className="relative text-sm text-white/70">Vendor dashboard</div>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl bg-white/10 backdrop-blur py-3">
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-xs text-white/70 mt-0.5">{label}</div>
        </div>
    );
}