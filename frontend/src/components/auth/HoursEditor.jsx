/**
 * HoursEditor — per-day opening hours. 7 rows (Mon–Sun), each with an
 * "Open" toggle and Open/Close time scrollers. Closed days hide the
 * scrollers entirely.
 *
 * Emits a structured object via onChange, e.g.
 *   {
 *     mon: { open: "08:00", close: "21:00" },
 *     wed: null,
 *     ...
 *   }
 *
 * The time scroller is a horizontal strip of snap-to buttons spaced 15
 * minutes apart. Vendors on mobile can flick through the day without
 * tapping a fiddly native time picker.
 *
 * Backend stores this as a compact CSV in `vendors.opening_hours` (text
 * column, so it stays backwards-compatible):
 *   "mon:08:00-21:00,tue:08:00-21:00,wed:08:00-21:00"
 *
 * `hoursToPayload()` collapses the structured value into that CSV,
 * `parseHoursPayload()` decodes it back for read-only displays like the
 * Settings page.
 */

const DAYS = [
    { key: 'mon', label: 'Monday', short: 'Mon' },
    { key: 'tue', label: 'Tuesday', short: 'Tue' },
    { key: 'wed', label: 'Wednesday', short: 'Wed' },
    { key: 'thu', label: 'Thursday', short: 'Thu' },
    { key: 'fri', label: 'Friday', short: 'Fri' },
    { key: 'sat', label: 'Saturday', short: 'Sat' },
    { key: 'sun', label: 'Sunday', short: 'Sun' },
];

const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '21:00';

// 24 hours × 4 (15-minute slots) = 96. We step every 15 min and the
// scroller generates the labels.
const STEP_MIN = 15;

function formatLabel(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function generateSlots() {
    const slots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += STEP_MIN) {
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return slots;
}

const SLOTS = generateSlots();

function normalise(value) {
    // Build a complete 7-day object from whatever the caller passed in.
    // Accepts either the structured shape OR the CSV payload stored in the
    // backend, so the editor can round-trip after a save.
    const out = {};
    const decoded = typeof value === 'string' ? parseHoursPayload(value) : value;
    for (const { key } of DAYS) {
        const day = decoded?.[key];
        if (day && typeof day.open === 'string' && typeof day.close === 'string') {
            out[key] = { open: day.open, close: day.close };
        } else {
            out[key] = null;
        }
    }
    return out;
}

function snapToStep(hhmm) {
    if (!hhmm) return DEFAULT_OPEN;
    const [h, m] = hhmm.split(':').map(Number);
    const snapped = Math.round(m / STEP_MIN) * STEP_MIN;
    if (snapped === 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`;
    return `${String(h).padStart(2, '0')}:${String(snapped).padStart(2, '0')}`;
}

/**
 * Decode the CSV payload back into a structured object.
 *   "mon:08:00-21:00,wed:08:00-21:00"
 *     → { mon: { open: '08:00', close: '21:00' }, wed: { ... } }
 *
 * Tolerates malformed entries (returns null for that day rather than
 * throwing) so a corrupt row never breaks the page.
 */
export function parseHoursPayload(payload) {
    if (!payload || typeof payload !== 'string') return null;
    const out = {};
    const parts = payload.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
        const m = part.match(/^([a-z]{3}):(\d{2}:\d{2})-(\d{2}:\d{2})$/i);
        if (!m) continue;
        const [, key, open, close] = m;
        if (!out[key]) out[key] = { open, close };
    }
    return Object.keys(out).length ? out : null;
}

/**
 * Build a short human-readable summary for read-only displays, e.g.
 *   "Mon–Fri 8:00 AM – 9:00 PM · Sat 10:00 AM – 6:00 PM"
 *
 * Falls back to "Closed all week" when nothing is set.
 */
export function formatHoursSummary(payload) {
    const decoded = parseHoursPayload(payload);
    if (!decoded) return null;
    const openDays = DAYS.filter(({ key }) => decoded[key]);
    if (openDays.length === 0) return null;

    // Group consecutive days with identical hours.
    const groups = [];
    let run = [];
    let prev = null;
    for (const day of openDays) {
        const hours = `${decoded[day.key].open}-${decoded[day.key].close}`;
        if (prev && prev.hours === hours && run.length) {
            run.push(day);
        } else {
            if (run.length) groups.push({ days: run, hours: prev.hours });
            run = [day];
            prev = { hours };
        }
    }
    if (run.length) groups.push({ days: run, hours: prev.hours });

    const labelFor = (range) => {
        const first = range[0].short;
        const last = range[range.length - 1].short;
        return first === last ? first : `${first}–${last}`;
    };

    return groups
        .map((g) => {
            const [open, close] = g.hours.split('-');
            return `${labelFor(g.days)} ${formatLabel(open)} – ${formatLabel(close)}`;
        })
        .join(' · ');
}

export default function HoursEditor({ value, onChange }) {
    const hours = normalise(value);

    const update = (key, patch) => {
        const next = { ...hours, [key]: patch };
        onChange?.(next);
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {DAYS.map(({ key, label }) => {
                const day = hours[key];
                const isOpen = day !== null;
                return (
                    <DayRow
                        key={key}
                        label={label}
                        isOpen={isOpen}
                        open={day?.open}
                        close={day?.close}
                        onToggle={(checked) =>
                            update(
                                key,
                                checked
                                    ? {
                                          open: snapToStep(DEFAULT_OPEN),
                                          close: snapToStep(DEFAULT_CLOSE),
                                      }
                                    : null
                            )
                        }
                        onOpenChange={(v) => update(key, { ...day, open: v })}
                        onCloseChange={(v) => update(key, { ...day, close: v })}
                    />
                );
            })}
        </div>
    );
}

function DayRow({ label, isOpen, open, close, onToggle, onOpenChange, onCloseChange }) {
    return (
        <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-gray-700">{label}</span>

                {/* Big, tappable toggle — feels like a switch even though it's a checkbox */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={isOpen}
                    aria-label={`${label} ${isOpen ? 'open' : 'closed'}`}
                    onClick={() => onToggle(!isOpen)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange-300 focus-visible:ring-offset-1 ${
                        isOpen ? 'bg-brand-orange-500' : 'bg-gray-300'
                    }`}
                >
                    <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            isOpen ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                    />
                </button>

                <span className={`text-xs font-medium ${isOpen ? 'text-brand-orange-600' : 'text-gray-400'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                </span>
            </div>

            {isOpen && (
                <div className="mt-2 ml-[120px] space-y-2">
                    <TimeScroller
                        label="Opens at"
                        value={open}
                        onChange={onOpenChange}
                    />
                    <TimeScroller
                        label="Closes at"
                        value={close}
                        onChange={onCloseChange}
                    />
                </div>
            )}
        </div>
    );
}

function TimeScroller({ label, value, onChange }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    {label}
                </span>
                <span className="text-xs font-semibold text-gray-700">{formatLabel(value)}</span>
            </div>
            <div
                className="flex overflow-x-auto gap-1.5 py-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
                role="listbox"
                aria-label={label}
            >
                {SLOTS.map((slot) => {
                    const active = slot === value;
                    return (
                        <button
                            key={slot}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => onChange(slot)}
                            className={`snap-center flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                                active
                                    ? 'bg-brand-orange-500 text-white border-brand-orange-500 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange-300 hover:text-brand-orange-600'
                            }`}
                        >
                            {formatLabel(slot)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Helper for the parent: collapse the structured value into the shape the
 *  backend expects when submitting signup. */
export function hoursToPayload(value) {
    if (!value) return undefined;
    // Compact form: only include open days so the column doesn't bloat.
    const open = Object.entries(value)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}:${v.open}-${v.close}`);
    return open.length ? open.join(',') : undefined;
}
