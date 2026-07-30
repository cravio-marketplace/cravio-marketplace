/**
 * EmptyState — illustrated "nothing here yet" block.
 *
 * Variants pull a small built-in SVG so we don't depend on an external
 * illustration set.
 */
import Button from './Button';

const variants = {
    menu: {
        title: 'No menu yet 🍽️',
        body: 'Add your first dish to start receiving orders.',
        cta: '+ Add your first dish',
    },
    orders: {
        title: 'No orders yet',
        body: 'New orders will pop up here in real time.',
        cta: null,
    },
    featured: {
        title: 'No featured items yet',
        body: 'Promote a menu item to put it at the top of the student feed.',
        cta: 'Pick an item to feature',
    },
    support: {
        title: 'No tickets yet',
        body: 'Reach out to our support team and we’ll get back within 24 hours.',
        cta: 'Contact support',
    },
    search: {
        title: 'Nothing matches your filters',
        body: 'Try clearing your search or selecting a different category.',
        cta: 'Clear filters',
    },
};

export default function EmptyState({ variant = 'menu', onAction, action, illustration }) {
    const v = variants[variant] || variants.menu;
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6">
            <div className="mb-4">
                {illustration || <DefaultIllustration variant={variant} />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{v.title}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">{v.body}</p>
            {(onAction || action) && v.cta && (
                <Button className="mt-5" onClick={onAction}>
                    {action || v.cta}
                </Button>
            )}
        </div>
    );
}

function DefaultIllustration({ variant }) {
    const palettes = {
        menu: ['#FFE2C2', '#FF6B00'],
        orders: ['#E0F2FE', '#0284C7'],
        featured: ['#FEF3C7', '#D97706'],
        support: ['#F3E8FF', '#7C3AED'],
        search: ['#F3F4F6', '#6B7280'],
    };
    const [bg, fg] = palettes[variant] || palettes.menu;
    return (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
            <circle cx="60" cy="60" r="56" fill={bg} opacity="0.6" />
            <circle cx="60" cy="60" r="36" fill={fg} opacity="0.18" />
            <circle cx="60" cy="60" r="20" fill={fg} opacity="0.35" />
            <circle cx="60" cy="60" r="9" fill={fg} />
        </svg>
    );
}
