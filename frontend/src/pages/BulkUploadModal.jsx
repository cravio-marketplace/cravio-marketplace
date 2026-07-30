/**
 * BulkUploadModal — drag a CSV of items to seed the menu quickly.
 *
 * CSV columns: name, price, category, available, quantity, low_stock_threshold, meal_time
 */
import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import API from '../api/client';

export default function BulkUploadModal({ onClose, onComplete }) {
    const [rows, setRows] = useState([]);
    const [filename, setFilename] = useState('');
    const [saving, setSaving] = useState(false);

    const handleFile = (file) => {
        if (!file) return;
        setFilename(file.name);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
                const parsed = (res.data || []).map((r) => ({
                    name: r.name,
                    price: Math.round(parseFloat(r.price) * 100) || 0,
                    category: r.category || null,
                    available: r.available !== 'false',
                    quantity: r.quantity ? parseInt(r.quantity, 10) : null,
                    low_stock_threshold: r.low_stock_threshold ? parseInt(r.low_stock_threshold, 10) : 5,
                    meal_time: r.meal_time ? r.meal_time.split('|') : [],
                }));
                setRows(parsed.filter((r) => r.name && r.price));
            },
        });
    };

    const submit = async () => {
        if (rows.length === 0) {
            toast.error('No valid rows to import');
            return;
        }
        setSaving(true);
        try {
            for (const r of rows) {
                await API.post('/menu', r);
            }
            toast.success(`Imported ${rows.length} items`);
            onComplete?.();
            onClose?.();
        } catch (e) {
            toast.error('Some rows failed to import');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Bulk menu upload"
            size="md"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} loading={saving} disabled={rows.length === 0}>
                        Import {rows.length} item{rows.length === 1 ? '' : 's'}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-600 mb-3">
                Drop a CSV with columns: <code className="text-xs bg-gray-100 px-1 rounded">name, price, category, available, quantity, low_stock_threshold, meal_time</code>.
                Meal times are pipe-separated (e.g. <code className="text-xs bg-gray-100 px-1 rounded">breakfast|lunch</code>).
            </p>
            <label className="block rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center cursor-pointer hover:bg-gray-50">
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Upload className="mx-auto text-gray-400" size={20} />
                <p className="text-sm font-medium text-gray-700 mt-2">
                    {filename || 'Click to choose a CSV file'}
                </p>
                <p className="text-xs text-gray-400 mt-1">UTF-8, with header row</p>
            </label>
            {rows.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="text-left px-3 py-2">Name</th>
                                <th className="text-left px-3 py-2">Price</th>
                                <th className="text-left px-3 py-2">Category</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.slice(0, 50).map((r, idx) => (
                                <tr key={idx}>
                                    <td className="px-3 py-2">{r.name}</td>
                                    <td className="px-3 py-2">₦{(r.price / 100).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.category || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}
