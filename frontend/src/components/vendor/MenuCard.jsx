/**
 * MenuCard — single menu item as a card (replaces the old table row).
 */
import { Coffee, Edit2, Eye, EyeOff, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import Badge from '../common/Badge';
import { MEAL_TIME_OPTIONS } from '../../utils/constants';
import { formatNaira } from '../../utils/formatters';

function stockState(item) {
    if (item.quantity === null || item.quantity === undefined) {
        return { tone: 'green', label: 'Unlimited' };
    }
    const threshold = item.low_stock_threshold ?? 5;
    if (item.quantity <= 0) return { tone: 'red', label: 'Out of stock' };
    if (item.quantity <= threshold) return { tone: 'orange', label: `Low: ${item.quantity} left` };
    return { tone: 'green', label: `${item.quantity} in stock` };
}

export default function MenuCard({ item, onEdit, onDelete, onToggleAvailability, onRestock }) {
    const stock = stockState(item);
    const mealIcons = (item.meal_time || [])
        .map((m) => MEAL_TIME_OPTIONS.find((o) => o.id === m))
        .filter(Boolean);

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-soft overflow-hidden flex flex-col">
            <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-orange-50 to-brand-orange-100">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-brand-orange-300">
                        <ImageIcon size={48} />
                    </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                    {mealIcons.map((m) => (
                        <span
                            key={m.id}
                            className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-sm"
                            title={m.label}
                        >
                            {m.icon}
                        </span>
                    ))}
                </div>
                <button
                    onClick={() => onEdit?.(item)}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white"
                    title="Edit item"
                >
                    <Edit2 size={14} />
                </button>
            </div>
            <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    <p className="font-bold text-brand-orange-500 whitespace-nowrap">
                        {formatNaira(item.price)}
                    </p>
                </div>
                {item.category && (
                    <span className="self-start text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.category}
                    </span>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <Badge tone={stock.tone} dot>
                        {stock.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                        {onRestock && item.quantity !== null && (
                            <button
                                onClick={() => onRestock(item)}
                                className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                                title="Restock"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => onToggleAvailability?.(item)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                item.available
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-gray-400 bg-gray-100'
                            }`}
                            title={item.available ? 'Available' : 'Hidden'}
                        >
                            {item.available ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                            onClick={() => onDelete?.(item)}
                            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
