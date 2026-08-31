/**
 * Image upload helper.
 *
 * Single source of truth for everything that pushes a file to Supabase
 * Storage. Centralising this gives us:
 *   - one place to enforce the 5 MB size limit (Supabase default is
 *     50 MB which is too generous for menu photos)
 *   - one place to translate storage errors into a friendly toast
 *   - one place to compute the public URL the controllers expect
 *
 * Folder conventions (must match the storage RLS policies):
 *   menu/<timestamp>.<ext>          → menu item photos
 *   vendors/<auth.uid()>/<name>     → vendor logo / cover
 *
 * The functions return `{ url, path }` so callers can store both the
 * public URL (for the database) and the storage path (for delete).
 */
import supabase from './supabaseClient';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const FRIENDLY = {
    'Payload too large': 'Image is too large (max 5 MB).',
    'Invalid mime type': 'That file type is not supported.',
    'duplicate': 'That file already exists.',
};

function friendlyError(err) {
    const msg = err?.message || 'Upload failed';
    for (const [needle, replacement] of Object.entries(FRIENDLY)) {
        if (msg.includes(needle)) return replacement;
    }
    return msg;
}

function safeExt(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
}

/**
 * Upload a menu item photo. Returns { url, path } on success and throws
 * a typed Error on failure (with a friendly message).
 */
export async function uploadMenuImage(file) {
    if (!file) throw new Error('No file selected');
    if (file.size > MAX_BYTES) throw new Error(friendlyError({ message: 'Payload too large' }));

    const path = `menu/${Date.now()}.${safeExt(file.name)}`;
    const { error } = await supabase.storage
        .from('menu-images')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(friendlyError(error));

    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    return { url: data.publicUrl, path };
}

/**
 * Upload a vendor asset (logo or cover). The path is namespaced under
 * the vendor's auth.uid() so the storage RLS policies accept the write.
 *
 * @param {string} kind  "logo" | "cover"
 * @param {File}   file
 * @param {string} vendorId  auth.uid() — passed explicitly so callers
 *                           don't have to import the supabase client
 */
export async function uploadVendorAsset(kind, file, vendorId) {
    if (!file) throw new Error('No file selected');
    if (!['logo', 'cover'].includes(kind)) throw new Error('Unknown asset kind');
    if (file.size > MAX_BYTES) throw new Error(friendlyError({ message: 'Payload too large' }));

    const path = `vendors/${vendorId}/${kind}-${Date.now()}.${safeExt(file.name)}`;
    const { error } = await supabase.storage
        .from('menu-images')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(friendlyError(error));

    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    return { url: data.publicUrl, path };
}

/**
 * Best-effort delete. Storage cleanup isn't critical to user flows so
 * we swallow errors and just log — the next upload will overwrite the
 * old file in the menu/ folder by timestamp.
 */
export async function deleteFromStorage(path) {
    if (!path) return;
    try {
        await supabase.storage.from('menu-images').remove([path]);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[uploads] delete failed', e);
    }
}
