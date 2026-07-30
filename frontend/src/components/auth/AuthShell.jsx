/**
 * AuthShell — shared branded layout for every public auth screen.
 *
 * Composes the BrandPanel with a form panel that accepts a title, subtitle,
 * and the page's content as children. Pages no longer render their own brand
 * panel — that's why BrandPanel was extracted.
 *
 * Long forms (SignUp) get a sticky footer: the form panel scrolls and the
 * submit button stays pinned, so the CTA is always visible even with the
 * opening-hours editor on screen.
 */
import BrandPanel from './BrandPanel';

export default function AuthShell({ title, subtitle, children, maxWidth = 'max-w-sm' }) {
    return (
        <div className="min-h-screen flex">
            <BrandPanel />

            {/* Form panel — a flex column so the footer (when used) can
                sticky to the bottom of the visible area. */}
            <div className="flex-1 flex flex-col p-6 sm:p-10">
                <div className={`w-full ${maxWidth} mx-auto flex flex-col flex-1 min-h-0`}>
                    <div className="lg:hidden flex items-center gap-2.5 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-brand-orange-500 text-white flex items-center justify-center font-bold">
                            C
                        </div>
                        <span className="text-xl font-semibold text-gray-900">Cravio</span>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>
                        )}
                    </div>

                    <div className="mt-6 flex-1 min-h-0 flex flex-col">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * AuthFormBody — the scrollable middle of a long form. Sits between the
 * title and the AuthFormFooter and is the only piece that scrolls.
 */
export function AuthFormBody({ children }) {
    return (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-4">{children}</div>
    );
}

/**
 * AuthFormFooter — pins a submit button (and secondary links) to the
 * bottom of the form panel. Gradient fade keeps the last scroll line
 * from being clipped.
 */
export function AuthFormFooter({ children, className = '' }) {
    return (
        <div
            className={`pt-4 pb-1 bg-gradient-to-t from-white via-white/95 to-transparent ${className}`}
        >
            {children}
        </div>
    );
}
