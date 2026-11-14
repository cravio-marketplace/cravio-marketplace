-- Cravio inventory reservation at customer checkout.
-- Vendor IDs are UUIDs because vendors.id is the Supabase Auth user ID.
-- Remove the earlier integer-signature function before installing the UUID version.
DROP FUNCTION IF EXISTS public.create_customer_order_with_stock(integer, uuid, uuid, text, text, text, text, jsonb);
-- Apply this migration in the shared Supabase SQL Editor before deploying the backend changes.
-- Stock is reserved when the order is created, not when it is picked up.

create or replace function public.create_customer_order_with_stock(
  p_vendor_id uuid,
  p_customer_id uuid,
  p_client_order_id uuid,
  p_student_name text,
  p_student_phone text,
  p_pickup_point text,
  p_pickup_instructions text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders%rowtype;
  v_line jsonb;
  v_item_id integer;
  v_qty integer;
  v_item public.menu_items%rowtype;
  v_order_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_order public.orders%rowtype;
begin
  -- Idempotency is checked inside the same transaction as reservation.
  select * into v_existing
  from public.orders
  where customer_id = p_customer_id
    and client_order_id = p_client_order_id
  limit 1;

  if found then
    return jsonb_build_object('duplicate', true, 'order', to_jsonb(v_existing));
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Cart must contain between 1 and 30 items' using errcode = '22023';
  end if;

  -- Process sorted item IDs to reduce deadlock risk when carts contain several items.
  for v_line in
    select value from jsonb_array_elements(p_items)
    order by (value->>'menu_item_id')::integer
  loop
    v_item_id := (v_line->>'menu_item_id')::integer;
    v_qty := (v_line->>'quantity')::integer;

    if v_item_id is null or v_item_id <= 0 or v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Invalid cart item or quantity' using errcode = '22023';
    end if;

    -- Lock the item row. Concurrent orders for the same item serialize here.
    select * into v_item
    from public.menu_items
    where id = v_item_id and vendor_id = p_vendor_id
    for update;

    if not found or v_item.available is distinct from true then
      raise exception 'An item is unavailable. Refresh the menu and try again.' using errcode = 'P0001';
    end if;

    if v_item.quantity is not null and v_item.quantity < v_qty then
      raise exception 'Insufficient stock for %', v_item.name using errcode = 'P0001';
    end if;

    -- Null quantity means stock is not tracked. Otherwise reserve immediately.
    if v_item.quantity is not null then
      update public.menu_items
      set quantity = quantity - v_qty
      where id = v_item.id;

      insert into public.stock_logs(vendor_id, item_id, variant_id, change, reason)
      values (p_vendor_id, v_item.id, null, -v_qty, 'order_reserved');
    end if;

    v_total := v_total + (v_item.price::bigint * v_qty);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item.id,
      'name', v_item.name,
      'quantity', v_qty,
      'price', v_item.price
    ));
  end loop;

  if v_total < 0 or v_total > 2147483647 then
    raise exception 'Order total is invalid' using errcode = '22003';
  end if;

  insert into public.orders(
    vendor_id, customer_id, client_order_id, student_name, student_phone,
    pickup_point, pickup_instructions, items, total_price,
    payment_method, payment_status, status
  )
  values (
    p_vendor_id, p_customer_id, p_client_order_id, p_student_name, p_student_phone,
    p_pickup_point, nullif(p_pickup_instructions, ''), v_order_items, v_total::integer,
    'cash', 'unpaid', 'pending'
  )
  returning * into v_order;

  return jsonb_build_object('duplicate', false, 'order', to_jsonb(v_order));
end;
$$;

revoke all on function public.create_customer_order_with_stock(integer, uuid, uuid, text, text, text, text, jsonb) from public;
grant execute on function public.create_customer_order_with_stock(integer, uuid, uuid, text, text, text, text, jsonb) to service_role;
