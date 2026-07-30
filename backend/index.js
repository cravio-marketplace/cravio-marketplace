require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase with SERVICE_ROLE key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use((req, res, next) => { req.supabase = supabase; next(); });

// ==================== HELPER: Auto-categorisation ====================
async function suggestCategory(vendorId, itemName, supabase) {
    const { data: rules } = await supabase
        .from('keyword_mappings')
        .select('keyword, category_id')
        .eq('vendor_id', vendorId);
    if (!rules) return null;
    const matched = rules.find(rule => itemName.toLowerCase().includes(rule.keyword.toLowerCase()));
    return matched ? matched.category_id : null;
}

// ==================== HELPER: Send admin notification via Formspree ====================
async function sendAdminNotification(subject, message, vendorData) {
    const FORMSPREE_ID = process.env.FORMSPREE_ID; // Add to .env
    if (!FORMSPREE_ID) return;
    try {
        await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject,
                message,
                vendor: vendorData,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Formspree notification failed:', error);
    }
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const { data: vendor, error: vendorError } = await supabase
        .from('vendors').select('*').eq('id', data.user.id).single();
    if (vendorError || !vendor) return res.status(403).json({ error: 'Not a registered vendor' });
    if (vendor.verification_status === 'pending') {
        return res.status(403).json({ error: 'Account pending admin approval' });
    }
    if (vendor.verification_status === 'rejected') {
        return res.status(403).json({ error: `Account rejected: ${vendor.rejected_reason || 'Please contact support'}` });
    }
    res.json({ success: true, token: data.session.access_token, vendor });
});

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, business_name, phone, description, address, opening_hours } = req.body;
    if (!email || !password || !business_name || !phone) {
        return res.status(400).json({ error: 'Email, password, business name, and phone are required' });
    }

    // Create user in auth (with email_confirm false so they can't log in until approved)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
    });
    if (authError) return res.status(500).json({ error: authError.message });

    // Insert into vendors with pending status
    const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
            id: authData.user.id,
            email: email,
            phone,
            business_name,
            description,
            address,
            opening_hours,
            verification_status: 'pending',
            is_accepting_orders: false,
        })
        .select()
        .single();
    if (vendorError) {
        // Clean up auth user if vendor insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: vendorError.message });
    }

    // Send admin notification via Formspree
    await sendAdminNotification(
        'New Vendor Registration',
        `Business: ${business_name}\nEmail: ${email}\nPhone: ${phone}\nDescription: ${description || 'N/A'}`,
        vendor
    );

    res.json({ success: true, message: 'Account created. Awaiting admin approval.' });
});

// ==================== MIDDLEWARE ====================
const verifyVendor = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await req.supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    const { data: vendor, error: vendorError } = await req.supabase
        .from('vendors').select('*').eq('id', user.id).single();
    if (vendorError || !vendor) return res.status(403).json({ error: 'Not a vendor' });
    if (vendor.verification_status !== 'open' && vendor.verification_status !== 'approved') {
        return res.status(403).json({ error: `Account not active (${vendor.verification_status})` });
    }
    req.vendor = vendor;
    req.user = user;
    next();
};

// ==================== VENDOR PROFILE & STATUS ====================
app.get('/api/vendor/me', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase.from('vendors').select('*').eq('id', req.vendor.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});

app.put('/api/vendor/profile', verifyVendor, async (req, res) => {
    const { business_name, phone, description, address, opening_hours, logo_url, cover_url } = req.body;
    const { data, error } = await req.supabase
        .from('vendors')
        .update({ business_name, phone, description, address, opening_hours, logo_url, cover_url })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});

app.patch('/api/vendor/status', verifyVendor, async (req, res) => {
    const { status, closure_message } = req.body;
    const { data, error } = await req.supabase
        .from('vendors')
        .update({ status, closure_message })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, vendor: data });
});

app.patch('/api/vendor/toggle-pause', verifyVendor, async (req, res) => {
    const newStatus = !req.vendor.is_accepting_orders;
    const { data, error } = await req.supabase
        .from('vendors')
        .update({ is_accepting_orders: newStatus })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, is_accepting_orders: data.is_accepting_orders });
});

app.patch('/api/vendor/toggle-sms', verifyVendor, async (req, res) => {
    const { data: vendor } = await req.supabase.from('vendors').select('sms_enabled').eq('id', req.vendor.id).single();
    const newStatus = !vendor.sms_enabled;
    const { data, error } = await req.supabase
        .from('vendors')
        .update({ sms_enabled: newStatus })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, sms_enabled: data.sms_enabled });
});

app.post('/api/vendor/change-password', verifyVendor, async (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password required' });
    }
    // Verify current password by attempting sign-in
    const { error: signError } = await req.supabase.auth.signInWithPassword({
        email: req.user.email,
        password: current_password,
    });
    if (signError) return res.status(401).json({ error: 'Current password incorrect' });
    // Update password
    const { error } = await req.supabase.auth.admin.updateUserById(req.user.id, { password: new_password });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Password updated' });
});

// ==================== ORDERS ====================
app.get('/api/orders', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, orders: data });
});

app.post('/api/orders/:orderId/accept', verifyVendor, async (req, res) => {
    const { orderId } = req.params;
    const { data, error } = await req.supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', orderId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, order: data });
});

app.post('/api/orders/:orderId/ready', verifyVendor, async (req, res) => {
    const { orderId } = req.params;
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
    const { data, error } = await req.supabase
        .from('orders')
        .update({ status: 'ready', pickup_code: pickupCode })
        .eq('id', orderId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, code: pickupCode, order: data });
});

app.post('/api/orders/:orderId/complete', verifyVendor, async (req, res) => {
    const { orderId } = req.params;
    const { code } = req.body;
    const { data: order } = await req.supabase
        .from('orders')
        .select('pickup_code')
        .eq('id', orderId)
        .eq('vendor_id', req.vendor.id)
        .single();
    if (!order || order.pickup_code !== code) return res.status(400).json({ error: 'Invalid code' });
    const { data, error } = await req.supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    // Decrease stock for variations if tracked
    // (optional: implement later)
    res.json({ success: true, order: data });
});

// ==================== MENU (with stock, meal times, variations) ====================
app.get('/api/menu', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('menu_items')
        .select('*, item_variants(*)')
        .eq('vendor_id', req.vendor.id)
        .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, menu: data });
});

app.get('/api/menu/:itemId', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('menu_items')
        .select('*, item_variants(*)')
        .eq('id', req.params.itemId)
        .eq('vendor_id', req.vendor.id)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/menu', verifyVendor, async (req, res) => {
    const { name, price, category, available, quantity, low_stock_threshold, meal_time, variations } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

    const suggestedCat = await suggestCategory(req.vendor.id, name, req.supabase);
    const finalCategory = category || suggestedCat;

    const { data: menuItem, error } = await req.supabase
        .from('menu_items')
        .insert({
            vendor_id: req.vendor.id,
            name,
            price,
            category: finalCategory,
            available: available !== undefined ? available : true,
            quantity: quantity || null,
            low_stock_threshold: low_stock_threshold || 5,
            meal_time: meal_time || []
        })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    if (variations && variations.length) {
        const variantInserts = variations.map(v => ({
            menu_item_id: menuItem.id,
            name: v.name,
            price: v.price,
            quantity: v.quantity || null,
            available: v.available !== false
        }));
        await req.supabase.from('item_variants').insert(variantInserts);
    }
    res.json({ success: true, item: menuItem });
});

app.put('/api/menu/:itemId', verifyVendor, async (req, res) => {
    const { itemId } = req.params;
    const { name, price, category, available, quantity, low_stock_threshold, meal_time, variations } = req.body;

    const { data, error } = await req.supabase
        .from('menu_items')
        .update({ name, price, category, available, quantity, low_stock_threshold, meal_time })
        .eq('id', itemId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    if (variations && Array.isArray(variations)) {
        await req.supabase.from('item_variants').delete().eq('menu_item_id', itemId);
        if (variations.length) {
            const variantInserts = variations.map(v => ({
                menu_item_id: parseInt(itemId),
                name: v.name,
                price: v.price,
                quantity: v.quantity || null,
                available: v.available !== false
            }));
            await req.supabase.from('item_variants').insert(variantInserts);
        }
    }
    res.json({ success: true, item: data });
});

app.delete('/api/menu/:itemId', verifyVendor, async (req, res) => {
    const { error } = await req.supabase
        .from('menu_items')
        .delete()
        .eq('id', req.params.itemId)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ==================== CUSTOM CATEGORIES ====================
app.get('/api/vendor/categories', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('vendor_categories')
        .select('*')
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/vendor/categories', verifyVendor, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    const { data, error } = await req.supabase
        .from('vendor_categories')
        .insert({ vendor_id: req.vendor.id, name })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/vendor/categories/:id', verifyVendor, async (req, res) => {
    const { error } = await req.supabase
        .from('vendor_categories')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ==================== KEYWORD MAPPINGS ====================
app.get('/api/vendor/keywords', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('keyword_mappings')
        .select('*, vendor_categories(name)')
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/vendor/keywords', verifyVendor, async (req, res) => {
    const { keyword, category_id } = req.body;
    if (!keyword || !category_id) return res.status(400).json({ error: 'Keyword and category required' });
    const { data, error } = await req.supabase
        .from('keyword_mappings')
        .insert({ vendor_id: req.vendor.id, keyword, category_id })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/vendor/keywords/:id', verifyVendor, async (req, res) => {
    const { error } = await req.supabase
        .from('keyword_mappings')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ==================== FEATURED ITEMS ====================
app.get('/api/vendor/featured', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('featured_items')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('priority', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/vendor/featured', verifyVendor, async (req, res) => {
    const { menu_item_id, priority, expires_at } = req.body;
    if (!menu_item_id) return res.status(400).json({ error: 'Menu item required' });
    const { data, error } = await req.supabase
        .from('featured_items')
        .insert({
            menu_item_id,
            vendor_id: req.vendor.id,
            priority: priority || 5,
            expires_at: expires_at || null
        })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/vendor/featured/:id', verifyVendor, async (req, res) => {
    const { error } = await req.supabase
        .from('featured_items')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ==================== SUPPORT TICKETS ====================
app.get('/api/support/tickets', verifyVendor, async (req, res) => {
    const { data, error } = await req.supabase
        .from('support_tickets')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/support/tickets', verifyVendor, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });
    const { data, error } = await req.supabase
        .from('support_tickets')
        .insert({ vendor_id: req.vendor.id, subject, message })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    // Also send email to admin via Formspree
    await sendAdminNotification(
        `Support Ticket: ${subject}`,
        `From vendor: ${req.vendor.business_name}\nMessage: ${message}`,
        req.vendor
    );

    res.json(data);
});

// ==================== ROOT & HEALTH ====================
app.get('/', (req, res) => res.json({ message: 'Cravio API running', version: '2.0' }));
app.get('/health', async (req, res) => {
    const { error } = await supabase.from('vendors').select('count', { count: 'exact', head: true });
    res.json({ status: 'healthy', supabase: error ? 'error' : 'connected' });
});

// 404 handler
app.use('*', (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` }));

app.listen(PORT, () => console.log(`🚀 Cravio backend running on http://localhost:${PORT}`));