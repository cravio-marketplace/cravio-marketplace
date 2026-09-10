-- ============================================================
-- Fix for Vendor Signup RLS and Trigger Conflict
-- Version: 1.0
-- Date: 2026-08-31
-- ============================================================

-- 1. Remove the redundant trigger that causes double-inserts and null-constraint errors
-- The backend controller already handles vendor creation manually.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_vendor() CASCADE;

-- 2. Ensure the vendors table is accessible to the service role.
-- While service_role usually bypasses RLS, we explicitly ensure
-- that there are no conflicting constraints blocking the backend.
-- We'll add a policy that allows the service role specifically if needed,
-- but the primary fix is removing the trigger conflict.

-- 3. Update the RLS policy for vendors to be more permissive for the initial creation
-- if the service role is somehow being restricted.
DROP POLICY IF EXISTS "Vendors manage own record" ON vendors;
CREATE POLICY "Vendors manage own record" ON vendors
    USING (auth.uid() = id)
    WITH CHECK (true); -- Allow the initial insert via service role/backend
