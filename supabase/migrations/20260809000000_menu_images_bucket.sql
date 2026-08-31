-- ============================================================
-- Cravio Marketplace — menu-images storage bucket + policies
-- Version: 2.3
-- Date: 2026-08-09
-- ============================================================
-- Frontend EditItemModal uploads food photos to a public `menu-images`
-- bucket and stores the public URL on menu_items.image_url. The bucket
-- didn't exist before this migration, so uploads silently 403'd at the
-- storage layer with "new row violates row-level security policy".
--
-- This migration:
--   1. Creates the public bucket if it doesn't already exist.
--   2. Defines storage policies that match the existing RLS model:
--      a vendor can write to its own folder (object name starts with
--      `vendors/<auth.uid()>/`), and anyone can read public files.
--
-- Folder convention used by the frontend:
--   menu/<timestamp>.<ext>          (food photos)
--   vendors/<uuid>/logo.<ext>       (vendor logos)
--   vendors/<uuid>/cover.<ext>      (vendor covers)
--
-- The vendor-scoped write policies are keyed off the first two path
-- segments so a vendor can only write under their own UUID folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies (if any) so re-runs don't fail with
-- "policy already exists".
DROP POLICY IF EXISTS "Public read menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Vendor uploads menu images"   ON storage.objects;
DROP POLICY IF EXISTS "Vendor updates menu images"   ON storage.objects;
DROP POLICY IF EXISTS "Vendor deletes menu images"   ON storage.objects;
DROP POLICY IF EXISTS "Vendor uploads vendor assets" ON storage.objects;
DROP POLICY IF EXISTS "Vendor updates vendor assets" ON storage.objects;
DROP POLICY IF EXISTS "Vendor deletes vendor assets" ON storage.objects;

-- Public read for everything in this bucket. The bucket is public on
-- purpose so menu thumbnails can be served via the public URL without
-- a signed URL round-trip.
CREATE POLICY "Public read menu-images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'menu-images');

-- Vendors can upload menu photos. We don't restrict by path here because
-- the frontend prefixes uploads with `menu/`, but we DO require auth so
-- anonymous uploads can't fill the bucket.
CREATE POLICY "Vendor uploads menu images" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'menu'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Vendor updates menu images" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'menu'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Vendor deletes menu images" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'menu'
        AND auth.role() = 'authenticated'
    );

-- Vendors can write their own logo/cover under vendors/<uuid>/.
-- The first segment must be 'vendors' and the second must be their
-- auth.uid(); both are required.
CREATE POLICY "Vendor uploads vendor assets" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'vendors'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "Vendor updates vendor assets" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'vendors'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "Vendor deletes vendor assets" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'menu-images'
        AND (storage.foldername(name))[1] = 'vendors'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );
