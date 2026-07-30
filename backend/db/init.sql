-- cravio/backend/db/init.sql

-- Drop tables if they exist (for fresh start)
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS vendors;

-- vendors table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    business_name VARCHAR(100),
    is_accepting_orders BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- menu_items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100),
    price INTEGER, -- in kobo (e.g., 1500 = ₦15.00)
    available BOOLEAN DEFAULT true
);

-- orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    student_name VARCHAR(50),
    items JSONB, -- [{id, name, qty, price}]
    total_price INTEGER,
    payment_method VARCHAR(20), -- 'cash' or 'transfer'
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, ready, completed
    pickup_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert a test vendor
INSERT INTO vendors (phone, business_name) 
VALUES ('08012345678', 'Test Canteen');