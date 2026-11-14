-- Cravio fees, vendor activation and cash settlement foundation.
-- All monetary values in this schema are integer kobo.
-- This migration does not rewrite existing menu prices, item snapshots or order totals.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_price bigint,
  ADD COLUMN IF NOT EXISTS service_fee bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS settlement_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Preserve existing integer-kobo order totals exactly; no conversion is performed.
UPDATE public.orders
SET subtotal_price = total_price
WHERE subtotal_price IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN subtotal_price SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.vendor_settlements (
  id bigserial PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  gross_cash_collected_kobo bigint NOT NULL DEFAULT 0 CHECK (gross_cash_collected_kobo >= 0),
  service_fee_due_kobo bigint NOT NULL DEFAULT 0 CHECK (service_fee_due_kobo >= 0),
  commission_due_kobo bigint NOT NULL DEFAULT 0 CHECK (commission_due_kobo >= 0),
  online_earnings_offset_kobo bigint NOT NULL DEFAULT 0 CHECK (online_earnings_offset_kobo >= 0),
  cash_remitted_kobo bigint NOT NULL DEFAULT 0 CHECK (cash_remitted_kobo >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partially_settled','settled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS vendor_settlements_vendor_period_idx
  ON public.vendor_settlements(vendor_id, period_start DESC);

CREATE TABLE IF NOT EXISTS public.vendor_settlement_lines (
  id bigserial PRIMARY KEY,
  settlement_id bigint NOT NULL REFERENCES public.vendor_settlements(id) ON DELETE CASCADE,
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  line_type text NOT NULL CHECK (line_type IN ('online_earnings_offset','cash_remittance')),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_settlement_lines_order_idx
  ON public.vendor_settlement_lines(order_id);

ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_settlement_lines ENABLE ROW LEVEL SECURITY;

-- Existing approved vendors start their 60-day introductory period at rollout.
-- This is a forward-only activation baseline; it does not infer historical approval dates.
UPDATE public.vendors
SET activated_at = now()
WHERE verification_status = 'accepted'
  AND activated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_vendor_activation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'accepted')
     AND NEW.activated_at IS NULL THEN
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_set_activated_at ON public.vendors;
CREATE TRIGGER vendors_set_activated_at
BEFORE INSERT OR UPDATE OF verification_status ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.set_vendor_activation_timestamp();

-- Mark service fees as refunded when an order is cancelled or rejected.
-- This records the fee reversal; any future online-payment provider refund
-- must be executed by its payment webhook/workflow.
CREATE OR REPLACE FUNCTION public.mark_order_service_fee_refunded()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  IF NEW.status IN ('cancelled', 'rejected', 'unfulfilled')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(NEW.service_fee, 0) > 0
     AND NEW.service_fee_refunded_at IS NULL THEN
    NEW.service_fee_refunded_at := now();
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS orders_mark_service_fee_refunded ON public.orders;
CREATE TRIGGER orders_mark_service_fee_refunded
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.mark_order_service_fee_refunded();

-- The admin API uses the service-role client after checking the user's
-- trusted Supabase app_metadata.role. No public/client execution is granted.
CREATE OR REPLACE FUNCTION public.admin_reset_vendor_activation(
  p_vendor_id uuid,
  p_activated_at timestamptz DEFAULT now()
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor public.vendors%rowtype;
BEGIN
  UPDATE public.vendors
  SET activated_at = COALESCE(p_activated_at, now())
  WHERE id = p_vendor_id
  RETURNING * INTO v_vendor;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found';
  END IF;
  RETURN v_vendor;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_vendor_activation(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_vendor_activation(uuid, timestamptz) TO service_role;

-- Replace the earlier checkout RPC with the fee-aware UUID signature.
DROP FUNCTION IF EXISTS public.create_customer_order_with_stock(integer, uuid, uuid, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_customer_order_with_stock(uuid, uuid, uuid, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_customer_order_with_stock(
  p_vendor_id uuid,
  p_customer_id uuid,
  p_client_order_id uuid,
  p_student_name text,
  p_student_phone text,
  p_pickup_point text,
  p_pickup_instructions text,
  p_items jsonb,
  p_service_fee_rate_bps integer,
  p_service_fee_min_kobo bigint,
  p_service_fee_max_kobo bigint,
  p_first_order_fee_waived boolean,
  p_commission_rate_bps integer,
  p_commission_free_days integer,
  p_cash_owed_cap_kobo bigint,
  p_settlement_due_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.orders%rowtype;
  v_line jsonb;
  v_item_id integer;
  v_qty integer;
  v_item public.menu_items%rowtype;
  v_order_items jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_service_fee bigint := 0;
  v_commission bigint := 0;
  v_total bigint := 0;
  v_order public.orders%rowtype;
  v_first_order boolean;
  v_activated_at timestamptz;
  v_outstanding bigint := 0;
  v_overdue boolean := false;
BEGIN
  IF p_service_fee_rate_bps < 0 OR p_service_fee_min_kobo < 0
     OR p_service_fee_max_kobo < p_service_fee_min_kobo
     OR p_commission_rate_bps < 0 OR p_commission_free_days < 0
     OR p_cash_owed_cap_kobo < 0 OR p_settlement_due_days < 1 THEN
    RAISE EXCEPTION 'Fee configuration is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.orders
  WHERE customer_id = p_customer_id
    AND client_order_id = p_client_order_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('duplicate', true, 'order', to_jsonb(v_existing));
  END IF;

  -- Serialize first-order fee checks across simultaneous orders from one customer.
  PERFORM 1 FROM auth.users WHERE id = p_customer_id FOR UPDATE;

  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 30 THEN
    RAISE EXCEPTION 'Cart must contain between 1 and 30 items' USING ERRCODE = '22023';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders WHERE customer_id = p_customer_id
  ) INTO v_first_order;

  SELECT activated_at INTO v_activated_at
  FROM public.vendors
  WHERE id = p_vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found' USING ERRCODE = 'P0001';
  END IF;

  -- Outstanding cash remittances include the service fee and commission
  -- on completed Cash on Pickup orders, less all settlement offsets/remittances.
  SELECT COALESCE(SUM(
    GREATEST(
      0,
      COALESCE(o.service_fee, 0) + COALESCE(o.commission_amount, 0)
      - COALESCE((
          SELECT SUM(sl.amount_kobo)
          FROM public.vendor_settlement_lines sl
          WHERE sl.order_id = o.id
        ), 0)
    )
  ), 0)
  INTO v_outstanding
  FROM public.orders o
  WHERE o.vendor_id = p_vendor_id
    AND o.payment_method = 'cash'
    AND o.status = 'completed';

  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.vendor_id = p_vendor_id
      AND o.payment_method = 'cash'
      AND o.status = 'completed'
      AND o.settlement_due_at IS NOT NULL
      AND o.settlement_due_at < now()
      AND (
        COALESCE(o.service_fee, 0) + COALESCE(o.commission_amount, 0)
        - COALESCE((
            SELECT SUM(sl.amount_kobo)
            FROM public.vendor_settlement_lines sl
            WHERE sl.order_id = o.id
          ), 0)
      ) > 0
  ) INTO v_overdue;

  IF v_outstanding > p_cash_owed_cap_kobo OR v_overdue THEN
    RAISE EXCEPTION 'Cash on Pickup is temporarily disabled for this vendor because a Cravio settlement is overdue or the outstanding balance exceeds the configured cap.'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(p_items)
    ORDER BY (value->>'menu_item_id')::integer
  LOOP
    v_item_id := (v_line->>'menu_item_id')::integer;
    v_qty := (v_line->>'quantity')::integer;

    IF v_item_id IS NULL OR v_item_id <= 0 OR v_qty IS NULL OR v_qty < 1 OR v_qty > 20 THEN
      RAISE EXCEPTION 'Invalid cart item or quantity' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_item
    FROM public.menu_items
    WHERE id = v_item_id AND vendor_id = p_vendor_id
    FOR UPDATE;

    IF NOT FOUND OR v_item.available IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'An item is unavailable. Refresh the menu and try again.' USING ERRCODE = 'P0001';
    END IF;

    IF v_item.quantity IS NOT NULL AND v_item.quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_item.name USING ERRCODE = 'P0001';
    END IF;

    IF v_item.quantity IS NOT NULL THEN
      UPDATE public.menu_items
      SET quantity = quantity - v_qty
      WHERE id = v_item.id;

      INSERT INTO public.stock_logs(vendor_id, item_id, variant_id, change, reason)
      VALUES (p_vendor_id, v_item.id, NULL, -v_qty, 'order_reserved');
    END IF;

    v_subtotal := v_subtotal + (v_item.price::bigint * v_qty);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item.id,
      'name', v_item.name,
      'quantity', v_qty,
      'price', v_item.price
    ));
  END LOOP;

  IF v_subtotal <= 0 OR v_subtotal > 2147483647 THEN
    RAISE EXCEPTION 'Order subtotal is invalid' USING ERRCODE = '22003';
  END IF;

  IF NOT (p_first_order_fee_waived AND v_first_order) THEN
    v_service_fee := LEAST(
      p_service_fee_max_kobo,
      GREATEST(
        p_service_fee_min_kobo,
        ROUND((v_subtotal::numeric * p_service_fee_rate_bps / 10000) / 100) * 100
      )
    );
  END IF;

  IF v_activated_at IS NULL
     OR now() >= v_activated_at + make_interval(days => p_commission_free_days) THEN
    v_commission := ROUND(v_subtotal::numeric * p_commission_rate_bps / 10000);
  END IF;

  v_total := v_subtotal + v_service_fee;
  IF v_total > 2147483647 THEN
    RAISE EXCEPTION 'Order total is invalid' USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.orders(
    vendor_id, customer_id, client_order_id, student_name, student_phone,
    pickup_point, pickup_instructions, items, subtotal_price, service_fee,
    commission_amount, total_price, payment_method, payment_status, status, settlement_due_at
  )
  VALUES (
    p_vendor_id, p_customer_id, p_client_order_id, p_student_name, p_student_phone,
    p_pickup_point, NULLIF(p_pickup_instructions, ''), v_order_items, v_subtotal,
    v_service_fee, v_commission, v_total, 'cash', 'unpaid', 'pending',
    now() + make_interval(days => p_settlement_due_days)
  )
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'duplicate', false,
    'order', to_jsonb(v_order),
    'fee_breakdown', jsonb_build_object(
      'subtotal_price', v_subtotal,
      'service_fee', v_service_fee,
      'commission_amount', v_commission,
      'total_price', v_total,
      'first_order_fee_waived', (p_first_order_fee_waived AND v_first_order)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order_with_stock(
  uuid, uuid, uuid, text, text, text, text, jsonb,
  integer, bigint, bigint, boolean, integer, integer, bigint, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_customer_order_with_stock(
  uuid, uuid, uuid, text, text, text, text, jsonb,
  integer, bigint, bigint, boolean, integer, integer, bigint, integer
) TO service_role;
