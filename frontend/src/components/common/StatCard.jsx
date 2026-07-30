/**
 * StatCard — small KPI tile used in the dashboard hero row.
 */
import Card from './Card';

export default function StatCard({ label, value, icon: Icon, accent = 'orange' }) {
    const accents = {
        orange: 'bg-brand-orange-50 text-brand-orange',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <Card className="p-5 flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            {Icon && (
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent] || accents.orange}`}>
                    <Icon size={22} />
                </div>
            )}
        </Card>
    );
}
