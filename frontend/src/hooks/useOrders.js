/**
 * Vendor order feed with authenticated Supabase Realtime and REST fallback.
 * Realtime is only trusted after the browser session identity is verified
 * against the vendor ID enforced by the orders RLS policy.
 */
import { useCallback, useEffect, useState } from 'react';
import * as ordersApi from '../api/orders';
import supabase from '../api/supabaseClient';

export function useOrders(vendorId) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [realtimeStatus, setRealtimeStatus] = useState('connecting');

    const refresh = useCallback(async () => {
        if (!vendorId) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await ordersApi.fetchOrders();
            if (data?.success) setOrders(data.orders || []);
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
            setRealtimeStatus('disconnected');
            return undefined;
        }

        let disposed = false;
        let channel = null;
        let pollTimer = null;
        let reconnectTimer = null;
        let connected = false;
        let subscribing = false;

        const startPolling = () => {
            if (!pollTimer && !disposed) {
                pollTimer = window.setInterval(() => {
                    void refresh();
                }, 15000);
            }
        };

        const stopPolling = () => {
            if (pollTimer) window.clearInterval(pollTimer);
            pollTimer = null;
        };

        const subscribe = async () => {
            if (disposed || subscribing || connected) return;
            subscribing = true;
            setRealtimeStatus('connecting');

            try {
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                const session = sessionData?.session;
                if (sessionError || !session || session.user?.id !== vendorId) {
                    if (!disposed) setRealtimeStatus('identity_mismatch');
                    startPolling();
                    subscribing = false;
                    return;
                }

                // Verify the access token with Supabase Auth, not just cached user data.
                const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
                if (userError || userData?.user?.id !== vendorId) {
                    if (!disposed) setRealtimeStatus('identity_mismatch');
                    startPolling();
                    subscribing = false;
                    return;
                }

                if (channel) {
                    await supabase.removeChannel(channel);
                    channel = null;
                }

                channel = supabase
                    .channel(`vendor-orders-${vendorId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'orders',
                            filter: `vendor_id=eq.${vendorId}`,
                        },
                        () => {
                            void refresh();
                        }
                    )
                    .subscribe((status) => {
                        if (disposed) return;
                        if (status === 'SUBSCRIBED') {
                            connected = true;
                            setRealtimeStatus('connected');
                            stopPolling();
                        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                            connected = false;
                            setRealtimeStatus('polling');
                            startPolling();
                        }
                    });
                subscribing = false;
            } catch (subscribeError) {
                subscribing = false;
                connected = false;
                if (!disposed) setRealtimeStatus('polling');
                startPolling();
            }
        };

        setRealtimeStatus('connecting');
        startPolling();
        void refresh();
        void subscribe();

        reconnectTimer = window.setInterval(() => {
            if (!connected) void subscribe();
        }, 30000);

        const handleOnline = () => {
            if (!connected) void subscribe();
            void refresh();
        };
        window.addEventListener('online', handleOnline);

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session || session.user?.id !== vendorId) {
                connected = false;
                setRealtimeStatus('identity_mismatch');
                startPolling();
                return;
            }
            connected = false;
            void subscribe();
        });

        return () => {
            disposed = true;
            stopPolling();
            if (reconnectTimer) window.clearInterval(reconnectTimer);
            window.removeEventListener('online', handleOnline);
            authListener?.subscription?.unsubscribe();
            if (channel) void supabase.removeChannel(channel);
        };
    }, [vendorId, refresh]);

    return { orders, loading, error, refresh, realtimeStatus };
}
