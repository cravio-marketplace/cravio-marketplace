/**
 * SupportView — create and review support tickets.
 *
 * Tickets are categorised (Technical Issue, Order Problem, Menu Help,
 * Billing, Other) and move through Open → In Progress → Resolved → Closed.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Headphones, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { fetchTickets, createTicket } from '../api/support';
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function SupportView() {
    const { vendor } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ subject: '', message: '', category: 'Technical Issue' });

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await fetchTickets();
            setTickets(data.tickets || []);
        } catch {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.message) {
            toast.error('Add a subject and a message');
            return;
        }
        setSubmitting(true);
        try {
            await createTicket(form);
            toast.success('Ticket sent — we will reply within 24h');
            setForm({ subject: '', message: '', category: 'Technical Issue' });
            setShowForm(false);
            load();
        } catch {
            toast.error('Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Support</h2>
                    <p className="text-sm text-gray-500">
                        Reach out to the Cravio team — we usually reply within 24h.
                    </p>
                </div>
                <Button onClick={() => setShowForm((v) => !v)}>
                    {showForm ? (
                        <>
                            <X size={14} /> Cancel
                        </>
                    ) : (
                        <>
                            <Plus size={14} /> New ticket
                        </>
                    )}
                </Button>
            </div>

            {showForm && (
                <Card className="p-5">
                    <form onSubmit={submit} className="space-y-4">
                        <Input
                            label="Subject"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            placeholder="Briefly describe the issue"
                        />
                        <Select
                            label="Category"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            options={SUPPORT_CATEGORIES}
                        />
                        <Textarea
                            label="Message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Tell us what's happening…"
                            rows={5}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting}>
                                Submit ticket
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {loading ? (
                <Card className="p-6 text-center text-gray-500">Loading…</Card>
            ) : tickets.length === 0 ? (
                <Card className="p-6">
                    <EmptyState
                        variant="support"
                        action="New ticket"
                        onAction={() => setShowForm(true)}
                    />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {tickets.map((t) => {
                        const status = SUPPORT_STATUSES.find((s) => s.value === t.status) || SUPPORT_STATUSES[0];
                        return (
                            <li key={t.id}>
                                <Card className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{t.subject}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {t.category || 'Other'} · {formatDate(t.created_at)}
                                            </p>
                                        </div>
                                        <Badge tone={status.color} dot>
                                            {status.label}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{t.message}</p>
                                    {t.admin_reply && (
                                        <div className="mt-3 rounded-xl bg-brand-orange-50 p-3">
                                            <p className="text-xs text-brand-orange-700 font-medium mb-1">
                                                Cravio team replied
                                            </p>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {t.admin_reply}
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
