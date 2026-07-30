-- ============================================================
-- Cravio Marketplace - Initial Schema
-- Version: 2.0
-- Date: 2025-06-17
-- ============================================================

-- ============================================================
-- 1. VENDORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    business_name VARCHAR(100),
    description TEXT,
    address TEXT,
    opening_hours TEXT,
    logo_url TEXT,
    cover_url TEXT,
    cac_document_url TEXT,
    is_accepting_orders BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'open',
    closure_message TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',
    rejected_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. MENU ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGSERIAL PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100),
    price INTEGER,
    category VARCHAR(50),
    available BOOLEAN DEFAULT true,
    quantity INTEGER,
    low_stock_threshold INTEGER DEFAULT 5,
    meal_time TEXT[] DEFAULT '{}'
);

-- ============================================================
-- 3. ITEM VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS item_variants (
    id BIGSERIAL PRIMARY KEY,
    menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER,
    available BOOLEAN DEFAULT true
);

-- ============================================================
-- 4. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id),
    student_name VARCHAR(50),
    items JSONB,
    total_price INTEGER,
    payment_method VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    pickup_code VARCHAR(6),
    variant_name TEXT,
    variant_price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. VENDOR CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_categories (
    id BIGSERIAL PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, name)
);

-- ============================================================
-- 6. KEYWORD MAPPINGS (auto-categorisation)
-- ============================================================
CREATE TABLE IF NOT EXISTS keyword_mappings (
    id BIGSERIAL PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    category_id BIGINT REFERENCES vendor_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. FEATURED ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS featured_items (
    id BIGSERIAL PRIMARY KEY,
    menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id),
    priority INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    admin_reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================
CREATE POLICY "Vendors manage own record" ON vendors
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Vendors manage own menu items" ON menu_items
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors manage own orders" ON orders
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors manage variants" ON item_variants
    USING (auth.uid() IN (SELECT vendor_id FROM menu_items WHERE id = menu_item_id))
    WITH CHECK (auth.uid() IN (SELECT vendor_id FROM menu_items WHERE id = menu_item_id));

CREATE POLICY "Vendors manage categories" ON vendor_categories
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors manage keywords" ON keyword_mappings
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Anyone view featured" ON featured_items FOR SELECT USING (true);

CREATE POLICY "Vendors manage featured" ON featured_items
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors manage own tickets" ON support_tickets
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

-- ============================================================
-- 11. ENABLE REALTIME FOR ORDERS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;

-- ============================================================
-- 12. TRIGGER: AUTO-CREATE VENDOR ON SIGNUP (phone only)
-- ============================================================
DROP FUNCTION IF EXISTS public.handle_new_vendor CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone IS NOT NULL THEN
        INSERT INTO public.vendors (id, phone, business_name, email)
        VALUES (
            NEW.id,
            NEW.phone,
            COALESCE(NEW.raw_user_meta_data->>'business_name', 'Vendor'),
            NEW.email
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_vendor();

-- ============================================================
-- 13. SAMPLE DATA (optional – comment out if not needed)
-- ============================================================
-- INSERT INTO vendors (id, phone, business_name, email, verification_status)
-- VALUES ('ca01b215-0ec4-4bf1-b64c-4c71cca3bcb6', '09012654251', 'Test Canteen', 'test@cravio.com', 'open')
-- ON CONFLICT (id) DO NOTHING;