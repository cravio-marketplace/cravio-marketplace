/**
 * useMenu — vendor menu CRUD helpers.
 *
 * Exposes both short (`remove`, `create`, `update`) and descriptive
 * (`removeItem`, `doRestock`) aliases so call sites can pick whichever
 * reads best in their context without renaming the hook surface.
 *
 * Each mutation awaits the backend, then re-fetches so the local state
 * matches what the server says is canonical.
 */
import { useCallback, useEffect, useState } from 'react';
import * as menuApi from '../api/menu';

export function useMenu() {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        try {
            const { data } = await menuApi.fetchMenu();
            if (data?.success) setMenu(data.menu);
            setError(null);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = async (payload) => {
        await menuApi.createItem(payload);
        await refresh();
    };
    const update = async (id, payload) => {
        await menuApi.updateItem(id, payload);
        await refresh();
    };
    const remove = async (id) => {
        await menuApi.deleteItem(id);
        await refresh();
    };
    const setAvailability = async (id, available) => {
        await menuApi.toggleAvailability(id, available);
        await refresh();
    };
    const restock = async (id, quantity) => {
        await menuApi.restock(id, quantity);
        await refresh();
    };

    return {
        menu,
        loading,
        error,
        refresh,
        create,
        update,
        remove,
        removeItem: remove,
        setAvailability,
        restock,
        doRestock: restock,
    };
}