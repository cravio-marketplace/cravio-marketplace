/**
 * useMenu — vendor menu CRUD helpers.
 */
import { useCallback, useEffect, useState } from 'react';
import * as menuApi from '../api/menu';

export function useMenu() {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const { data } = await menuApi.fetchMenu();
            if (data?.success) setMenu(data.menu);
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

    return { menu, loading, refresh, create, update, remove, setAvailability, restock };
}
