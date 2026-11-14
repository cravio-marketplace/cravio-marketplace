-- Atomic vendor settlement clearing.
-- All amounts are integer kobo. The API must authenticate an admin before calling this RPC.

CREATE OR REPLACE FUNCTION public.admin_create_vendor_settlement(
  p_vendor_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_online_earnings_offset_kobo bigint DEFAULT 0,
  p_cash_remitted_kobo bigint DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement_id bigint;
  v_order record;
  v_order_outstanding bigint;
  v_total_outstanding bigint := 0;
  v_total_gross_cash bigint := 0;
  v_total_service_fee bigint := 0;
  v_total_commission bigint := 0;
  v_offset_remaining bigint := COALESCE(p_online_earnings_offset_kobo, 0);
  v_cash_remaining bigint := COALESCE(p_cash_remitted_kobo, 0);
  v_offset_for_order bigint;
  v_cash_for_order bigint;
  v_settled_amount bigint;
  v_status text;
BEGIN
  IF p_vendor_id IS NULL
     OR p_period_start IS NULL
     OR p_period_end IS NULL
     OR p_period_end <= p_period_start THEN
    RAISE EXCEPTION 'A vendor and valid settlement period are required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_offset_remaining < 0 OR v_cash_remaining < 0
     OR v_offset_remaining + v_cash_remaining <= 0 THEN
    RAISE EXCEPTION 'Enter a positive settlement amount in kobo.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize settlement attempts for this vendor.
  PERFORM 1 FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Lock eligible completed cash orders and calculate the remaining debt.
  FOR v_order IN
    SELECT o.id, o.total_price, o.service_fee, o.commission_amount
    FROM public.orders o
    WHERE o.vendor_id = p_vendor_id
      AND o.payment_method = 'cash'
      AND o.status = 'completed'
      AND o.completed_at >= p_period_start
      AND o.completed_at < p_period_end
    ORDER BY o.completed_at ASC, o.id ASC
    FOR UPDATE OF o
  LOOP
    SELECT COALESCE(SUM(sl.amount_kobo), 0)
      INTO v_settled_amount
    FROM public.vendor_settlement_lines sl
    WHERE sl.order_id = v_order.id;

    v_order_outstanding := GREATEST(
      0,
      COALESCE(v_order.service_fee, 0)
      + COALESCE(v_order.commission_amount, 0)
      - v_settled_amount
    );

    v_total_outstanding := v_total_outstanding + v_order_outstanding;
    v_total_gross_cash := v_total_gross_cash + COALESCE(v_order.total_price, 0);
    v_total_service_fee := v_total_service_fee + COALESCE(v_order.service_fee, 0);
    v_total_commission := v_total_commission + COALESCE(v_order.commission_amount, 0);
  END LOOP;

  IF v_total_outstanding = 0 THEN
    RAISE EXCEPTION 'There is no outstanding balance for this vendor in the selected period.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_offset_remaining + v_cash_remaining > v_total_outstanding THEN
    RAISE EXCEPTION 'Settlement amount exceeds the outstanding balance of % kobo.', v_total_outstanding
      USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.vendor_settlements (
    vendor_id, period_start, period_end, gross_cash_collected_kobo,
    service_fee_due_kobo, commission_due_kobo,
    online_earnings_offset_kobo, cash_remitted_kobo,
    status, notes
  )
  VALUES (
    p_vendor_id, p_period_start, p_period_end, v_total_gross_cash,
    v_total_service_fee, v_total_commission,
    v_offset_remaining, v_cash_remaining,
    'pending', NULLIF(LEFT(COALESCE(p_notes, ''), 1000), '')
  )
  RETURNING id INTO v_settlement_id;

  -- Allocate online earnings offsets first, then cash remittances, against
  -- the oldest outstanding completed cash orders. Each allocation is ledgered.
  FOR v_order IN
    SELECT o.id, o.service_fee, o.commission_amount
    FROM public.orders o
    WHERE o.vendor_id = p_vendor_id
      AND o.payment_method = 'cash'
      AND o.status = 'completed'
      AND o.completed_at >= p_period_start
      AND o.completed_at < p_period_end
    ORDER BY o.completed_at ASC, o.id ASC
    FOR UPDATE OF o
  LOOP
    SELECT COALESCE(SUM(sl.amount_kobo), 0)
      INTO v_settled_amount
    FROM public.vendor_settlement_lines sl
    WHERE sl.order_id = v_order.id;

    v_order_outstanding := GREATEST(
      0,
      COALESCE(v_order.service_fee, 0)
      + COALESCE(v_order.commission_amount, 0)
      - v_settled_amount
    );

    IF v_order_outstanding <= 0 THEN
      CONTINUE;
    END IF;

    v_offset_for_order := LEAST(v_order_outstanding, v_offset_remaining);
    IF v_offset_for_order > 0 THEN
      INSERT INTO public.vendor_settlement_lines (
        settlement_id, order_id, line_type, amount_kobo
      )
      VALUES (
        v_settlement_id, v_order.id, 'online_earnings_offset', v_offset_for_order
      );
      v_order_outstanding := v_order_outstanding - v_offset_for_order;
      v_offset_remaining := v_offset_remaining - v_offset_for_order;
    END IF;

    v_cash_for_order := LEAST(v_order_outstanding, v_cash_remaining);
    IF v_cash_for_order > 0 THEN
      INSERT INTO public.vendor_settlement_lines (
        settlement_id, order_id, line_type, amount_kobo
      )
      VALUES (
        v_settlement_id, v_order.id, 'cash_remittance', v_cash_for_order
      );
      v_cash_remaining := v_cash_remaining - v_cash_for_order;
    END IF;

    EXIT WHEN v_offset_remaining = 0 AND v_cash_remaining = 0;
  END LOOP;

  IF v_offset_remaining > 0 OR v_cash_remaining > 0 THEN
    RAISE EXCEPTION 'Unable to allocate the full settlement amount.'
      USING ERRCODE = 'P0001';
  END IF;

  v_status := CASE
    WHEN v_total_outstanding = (
      COALESCE(p_online_earnings_offset_kobo, 0)
      + COALESCE(p_cash_remitted_kobo, 0)
    ) THEN 'settled'
    ELSE 'partially_settled'
  END;

  UPDATE public.vendor_settlements
  SET status = v_status,
      settled_at = CASE WHEN v_status = 'settled' THEN now() ELSE NULL END
  WHERE id = v_settlement_id;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'status', v_status,
    'outstanding_before_kobo', v_total_outstanding,
    'online_earnings_offset_kobo', COALESCE(p_online_earnings_offset_kobo, 0),
    'cash_remitted_kobo', COALESCE(p_cash_remitted_kobo, 0),
    'remaining_outstanding_kobo',
      v_total_outstanding
      - COALESCE(p_online_earnings_offset_kobo, 0)
      - COALESCE(p_cash_remitted_kobo, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_vendor_settlement(
  uuid, timestamptz, timestamptz, bigint, bigint, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_vendor_settlement(
  uuid, timestamptz, timestamptz, bigint, bigint, text
) TO service_role;
