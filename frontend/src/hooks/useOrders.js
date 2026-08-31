/**
 * useOrders — subscribes to the vendor's order feed.
 *
 * - Fetches the initial list via the REST API.
 * - Subscribes to Supabase realtime `postgres_changes` so new orders appear
 *   live without a manual refresh.
 * - Exposes `error` so the UI can show a retry surface instead of a
 *   stale empty screen when the initial fetch fails.
 *
 * Returns `{ orders, loading, error, refresh }`.
 */
import { useCallback, useEffect, useState } from 'react';
import * as ordersApi from '../api/orders';
import supabase from '../api/supabaseClient';

export function useOrders(vendorId) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        if (!vendorId) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await ordersApi.fetchOrders();
            if (data?.success) setOrders(data.orders);
            setError(null);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [vendorId]);

    useEffect(() => {
        if (!vendorId) {
            setLoading(false);
            return;
        }
        refresh();

        const channel = supabase
            .channel(`orders-${vendorId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `vendor_id=eq.${vendorId}`,
                },
                () => refresh()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [vendorId, refresh]);

    return { orders, loading, error, refresh };
}