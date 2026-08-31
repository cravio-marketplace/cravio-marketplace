import { Inbox, Search, UtensilsCrossed, Star, ShoppingBag, LifeBuoy } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState — three usage modes:
 *
 * 1. Variant preset (variant="menu" | "search" | "featured" | "orders" | "support"):
 *    ships with a curated icon and a default copy. Override with title /
 *    description / actionLabel when you want custom copy.
 *
 * 2. Fully custom: pass `icon` + `title` + `description` to render anything.
 *
 * 3. Custom action: pass `action` (a node) or `actionLabel` + `onAction` for
 *    a default-styled Button.
 *
 * Why it's a switch instead of a registry: the variants stay in one place
 * so a future copy edit doesn't have to chase five files.
 */
const VARIANTS = {
  menu: {
    icon: UtensilsCrossed,
    title: 'No menu items yet',
    description: 'Add your first dish so students can start ordering.',
    actionLabel: 'Add item',
  },
  search: {
    icon: Search,
    title: 'Nothing matches that',
    description: 'Try a different search term or clear the filter.',
  },
  featured: {
    icon: Star,
    title: 'No featured items',
    description: 'Highlight a menu item to put it at the top of your page.',
  },
  orders: {
    icon: ShoppingBag,
    title: 'No orders yet',
    description: 'When students order, you’ll see them here in real time.',
  },
  support: {
    icon: LifeBuoy,
    title: 'Nothing here',
    description: 'Reach out to support and we’ll reply within 24 hours.',
  },
  inbox: {
    icon: Inbox,
    title: 'All caught up',
    description: 'Nothing new here right now.',
  },
};

export default function EmptyState({
  icon,
  variant,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}) {
  const preset = variant ? VARIANTS[variant] : null;
  const Icon = icon || preset?.icon;
  const finalTitle = title ?? preset?.title;
  const finalDescription = description ?? preset?.description;
  const finalActionLabel = actionLabel ?? preset?.actionLabel;

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-orange-50 text-brand-orange-500 flex items-center justify-center mb-4">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}
      {finalTitle && <h3 className="text-base font-semibold text-gray-900">{finalTitle}</h3>}
      {finalDescription && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm">{finalDescription}</p>
      )}
      {(action || (finalActionLabel && onAction)) && (
        <div className="mt-5">
          {action || <Button onClick={onAction}>{finalActionLabel}</Button>}
        </div>
      )}
    </div>
  );
}
