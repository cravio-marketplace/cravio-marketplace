-- ============================================================
-- Cravio Marketplace — add menu_items.image_url
-- Version: 2.2
-- Date: 2026-08-08
-- ============================================================
-- Frontend menu item forms upload an image to the
-- `menu-images` Supabase Storage bucket and store the public
-- URL on the menu_items row as `image_url`. The original
-- schema omitted this column, which caused the runtime error
-- "Could not find the 'image_url' column of 'menu_items' in
-- the schema cache". This migration adds the column and
-- brings the schema in sync with the backend menu controller
-- and the frontend EditItemModal payload.

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- No backfill is possible (rows never had the column), but the
-- column is nullable so existing rows are unaffected.

COMMENT ON COLUMN menu_items.image_url IS
    'Public URL of the food image in the menu-images storage bucket.';
