/**
 * CacUploader — single-file picker that uploads the chosen CAC/business
 * registration document to the `cac-documents` Supabase Storage bucket and
 * returns the public URL via onChange.
 *
 * Rules:
 *   - one file at a time
 *   - PDF / JPG / PNG only
 *   - ≤ 5 MB
 *
 * Fallback behaviour: if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is
 * missing, the picker is disabled and the helper silently no-ops — signup
 * still works, the backend just receives `cac_document_url: null`.
 */
import { useRef, useState } from 'react';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import supabase from '../../api/supabaseClient';

const BUCKET = 'cac-documents';
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];

function envConfigured() {
    return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CacUploader({ value, onChange, disabled = false }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const ready = envConfigured();

    const pick = () => inputRef.current?.click();

    const clear = () => {
        setError('');
        onChange?.({ url: null, fileName: null });
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');

        if (!ACCEPTED.includes(file.type)) {
            setError('Only PDF, JPG, or PNG files are accepted');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('File is larger than 5 MB');
            return;
        }

        setUploading(true);
        try {
            // Use a temporary id so we can build the storage path even before
            // the auth user exists (signup happens after this upload).
            const path = `pending/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
            const { error: upErr } = await supabase.storage
                .from(BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
            onChange?.({ url: pub.publicUrl, fileName: file.name, size: file.size });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[CacUploader] upload failed', err);
            setError(err.message || 'Upload failed. Try again or skip for now.');
        } finally {
            setUploading(false);
        }
    };

    if (!ready) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                CAC upload is disabled (Supabase env not configured). You can submit without it.
            </div>
        );
    }

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFile}
                disabled={disabled || uploading}
            />

            {value?.url ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3">
                    <FileText size={18} className="text-brand-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{value.fileName}</p>
                        {value.size && (
                            <p className="text-xs text-gray-500">{formatSize(value.size)}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={clear}
                        disabled={uploading}
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Remove CAC document"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={pick}
                    disabled={disabled || uploading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-sm text-gray-600 hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
                >
                    {uploading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Uploading…
                        </>
                    ) : (
                        <>
                            <Upload size={16} /> Upload CAC document (optional)
                        </>
                    )}
                </button>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}