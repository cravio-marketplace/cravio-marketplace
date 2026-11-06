-- Customer marketplace read access to verified vendor listings and available menu items.
-- Vendor write permissions remain governed by the existing vendor policies.

drop policy if exists "Customers view accepted vendors" on public.vendors;
create policy "Customers view accepted vendors"
  on public.vendors for select
  to anon, authenticated
  using (verification_status = 'accepted');

drop policy if exists "Customers view available menu items" on public.menu_items;
create policy "Customers view available menu items"
  on public.menu_items for select
  to anon, authenticated
  using (
    available = true
    and exists (
      select 1 from public.vendors v
      where v.id = menu_items.vendor_id
        and v.verification_status = 'accepted'
        and v.is_accepting_orders = true
        and v.status = 'open'
    )
  );

drop policy if exists "Customers view available item variants" on public.item_variants;
create policy "Customers view available item variants"
  on public.item_variants for select
  to anon, authenticated
  using (
    available = true
    and exists (
      select 1 from public.menu_items m
      join public.vendors v on v.id = m.vendor_id
      where m.id = item_variants.menu_item_id
        and m.available = true
        and v.verification_status = 'accepted'
        and v.is_accepting_orders = true
        and v.status = 'open'
    )
  );
