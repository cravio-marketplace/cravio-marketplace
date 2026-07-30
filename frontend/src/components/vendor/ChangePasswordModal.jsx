/**
 * ChangePasswordModal — verify current password, set a new one.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { changePassword } from '../../api/auth';

export default function ChangePasswordModal({ onClose }) {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (form.next !== form.confirm) {
            toast.error('Passwords do not match');
            return;
        }
        if (form.next.length < 8) {
            toast.error('Use at least 8 characters');
            return;
        }
        setSaving(true);
        try {
            await changePassword({ current_password: form.current, new_password: form.next });
            toast.success('Password updated');
            onClose?.();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Change password"
            size="sm"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} loading={saving}>
                        Update password
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <Input
                    type="password"
                    label="Current password"
                    value={form.current}
                    onChange={(e) => setForm({ ...form, current: e.target.value })}
                    required
                />
                <Input
                    type="password"
                    label="New password"
                    value={form.next}
                    onChange={(e) => setForm({ ...form, next: e.target.value })}
                    required
                    hint="At least 8 characters"
                />
                <Input
                    type="password"
                    label="Confirm new password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    required
                />
            </form>
        </Modal>
    );
}
