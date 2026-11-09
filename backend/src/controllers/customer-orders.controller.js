/**
 * Customer order endpoints.
 *
 * Orders are written to the existing vendor-facing public.orders table so
 * the current vendor dashboard and realtime subscription continue to work.
 * Prices and vendor ownership are always read from Supabase, never trusted
 * from the browser cart.
 */
const supabase = require('../config/supabase');

const MAX_LINES = 30;
const MAX_QUANTITY_PER_LINE = 20;

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function create(req, res, next) {
    try {
        const customer = req.customer;
        const {
            vendor_id: vendorId,
            items,
            student_name: studentName,
            student_phone: studentPhone,
            pickup_point: pickupPoint,
            pickup_instructions: pickupInstructions,
            payment_method: paymentMethod,
            client_order_id: clientOrderId,
        } = req.body || {};

        if (!vendorId || typeof vendorId !== 'string') {
            return res.status(400).json({ error: 'A valid vendor is required.' });
        }
        if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
            return res.status(400).json({ error: 'Your cart must contain between 1 and 30 items.' });
        }
        if (cleanText(studentName, 80).length < 2) {
            return res.status(400).json({ error: 'Enter your full name.' });
        }
        if (!/^\+?[0-9\s()-]{10,18}$/.test(cleanText(studentPhone, 24))) {
            return res.status(400).json({ error: 'Enter a valid phone number.' });
        }
        if (cleanText(pickupPoint, 160).length < 3) {
            return res.status(400).json({ error: 'Enter your campus pickup point.' });
        }
        if (paymentMethod !== 'cash') {
            return res.status(400).json({ error: 'Only Cash on Pickup is currently available.' });
        }
        if (!/^[0-9a-f-]{36}$/i.test(String(clientOrderId || ''))) {
            return res.status(400).json({ error: 'A valid checkout request ID is required.' });
        }

        // A retry with the same request ID must not create a duplicate order.
        const { data: priorOrder, error: priorError } = await supabase
            .from('orders')
            .select('id,vendor_id,customer_id,status,total_price,payment_method,payment_status,created_at')
            .eq('customer_id', customer.id)
            .eq('client_order_id', clientOrderId)
            .maybeSingle();
        if (priorError) throw priorError;
        if (priorOrder) return res.status(200).json({ success: true, order: priorOrder, duplicate: true });

        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .select('id,business_name,verification_status,is_accepting_orders,status')
            .eq('id', vendorId)
            .maybeSingle();
        if (vendorError) throw vendorError;
        if (!vendor || vendor.verification_status !== 'accepted' || vendor.is_accepting_orders !== true || vendor.status === 'closed') {
            return res.status(409).json({ error: 'This vendor is not accepting orders right now.' });
        }

        const quantities = new Map();
        for (const line of items) {
            const itemId = Number(line?.menu_item_id);
            const quantity = Number(line?.quantity);
            if (!Number.isSafeInteger(itemId) || itemId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY_PER_LINE) {
                return res.status(400).json({ error: 'One or more cart items are invalid.' });
            }
            const combinedQuantity = (quantities.get(itemId) || 0) + quantity;
            if (combinedQuantity > MAX_QUANTITY_PER_LINE) {
                return res.status(400).json({ error: 'The quantity for an item cannot exceed 20.' });
            }
            quantities.set(itemId, combinedQuantity);
        }

        const ids = [...quantities.keys()];
        const { data: menuItems, error: menuError } = await supabase
            .from('menu_items')
            .select('id,vendor_id,name,price,available,quantity')
            .eq('vendor_id', vendorId)
            .in('id', ids);
        if (menuError) throw menuError;
        if (!menuItems || menuItems.length !== ids.length) {
            return res.status(409).json({ error: 'Some items in your cart are no longer available. Refresh the menu and try again.' });
        }

        const orderLines = [];
        let total = 0;
        for (const menuItem of menuItems) {
            const quantity = quantities.get(Number(menuItem.id));
            if (menuItem.available !== true) {
                return res.status(409).json({ error: `${menuItem.name} is currently unavailable.` });
            }
            if (menuItem.quantity !== null && menuItem.quantity !== undefined && menuItem.quantity < quantity) {
                return res.status(409).json({ error: `There is not enough stock for ${menuItem.name}. Please update your cart.` });
            }
            const unitPrice = Number(menuItem.price);
            if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
                return res.status(409).json({ error: `The price for ${menuItem.name} is invalid. Please contact the vendor.` });
            }
            total += unitPrice * quantity;
            orderLines.push({
                menu_item_id: menuItem.id,
                name: menuItem.name,
                quantity,
                price: unitPrice,
            });
        }
        if (!Number.isSafeInteger(total) || total < 0) {
            return res.status(400).json({ error: 'The order total is invalid.' });
        }

        const { data: order, error: insertError } = await supabase
            .from('orders')
            .insert({
                vendor_id: vendorId,
                customer_id: customer.id,
                client_order_id: clientOrderId,
                student_name: cleanText(studentName, 80),
                student_phone: cleanText(studentPhone, 24),
                pickup_point: cleanText(pickupPoint, 160),
                pickup_instructions: cleanText(pickupInstructions, 500) || null,
                items: orderLines,
                total_price: total,
                payment_method: 'cash',
                payment_status: 'unpaid',
                status: 'pending',
            })
            .select('id,vendor_id,customer_id,student_name,items,total_price,payment_method,payment_status,status,pickup_point,pickup_instructions,created_at')
            .single();

        // If a simultaneous retry raced the first insert, return the order
        // created by that request instead of surfacing a duplicate failure.
        if (insertError?.code === '23505') {
            const { data: racedOrder, error: racedError } = await supabase
                .from('orders')
                .select('id,vendor_id,customer_id,status,total_price,payment_method,payment_status,created_at')
                .eq('customer_id', customer.id)
                .eq('client_order_id', clientOrderId)
                .maybeSingle();
            if (racedError) throw racedError;
            if (racedOrder) return res.status(200).json({ success: true, order: racedOrder, duplicate: true });
        }
        if (insertError) throw insertError;

        return res.status(201).json({ success: true, order });
    } catch (error) {
        return next(error);
    }
}

async function listMine(req, res, next) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('id,vendor_id,customer_id,student_name,items,total_price,payment_method,payment_status,status,pickup_code,pickup_point,pickup_instructions,created_at,updated_at')
            .eq('customer_id', req.customer.id)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return res.json({ success: true, orders: data || [] });
    } catch (error) {
        return next(error);
    }
}

async function getMine(req, res, next) {
    try {
        const orderId = Number(req.params.orderId);
        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({ error: 'Invalid order ID.' });
        }
        const { data, error } = await supabase
            .from('orders')
            .select('id,vendor_id,customer_id,student_name,items,total_price,payment_method,payment_status,status,pickup_code,pickup_point,pickup_instructions,created_at,updated_at')
            .eq('id', orderId)
            .eq('customer_id', req.customer.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Order not found.' });
        return res.json({ success: true, order: data });
    } catch (error) {
        return next(error);
    }
}

module.exports = { create, listMine, getMine };
