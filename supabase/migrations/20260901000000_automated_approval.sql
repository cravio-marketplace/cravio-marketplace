-- ============================================================
-- Automated Vendor Approval Flow
-- Version: 1.0
-- Date: 2026-09-01
-- ============================================================

-- 1. Standardize existing statuses to 'accepted'
UPDATE public.vendors
SET verification_status = 'accepted'
WHERE verification_status IN ('open', 'approved');

-- 2. Create the automation function
-- This function runs with SECURITY DEFINER to bypass RLS and update the vendors table
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if email_confirmed_at was null and is now set
    IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
        UPDATE public.vendors
        SET verification_status = 'accepted'
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_confirmation();
