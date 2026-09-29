-- Migration: Harden get_guest_order and cancel_guest_order
-- Accepts either Order Number (e.g. ORD-2026-01014) or Order UUID,
-- strictly verifies matching customer phone number, and supports customer COD cancellation.

-- 1. Drop existing UUID signatures to avoid ambiguous overload resolution
DROP FUNCTION IF EXISTS public.get_guest_order(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_guest_order(UUID, TEXT);

-- 2. get_guest_order with flexible order identifier (Order Number or UUID) + phone verification
CREATE OR REPLACE FUNCTION public.get_guest_order(p_order_id TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_clean_order TEXT;
  v_clean_phone TEXT;
BEGIN
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RETURN NULL;
  END IF;
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  v_clean_order := TRIM(REPLACE(p_order_id, '#', ''));
  v_clean_phone := TRIM(p_phone);

  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'tracking_number', o.tracking_number,
    'subtotal', o.subtotal,
    'shipping_fee', o.shipping_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'shipping_city', o.shipping_city,
    'shipping_state', o.shipping_state,
    'created_at', o.created_at,
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_name', oi.product_name,
          'product_image', oi.product_image,
          'selected_color', oi.selected_color,
          'unit_price', oi.unit_price,
          'quantity', oi.quantity,
          'total_price', oi.total_price
        )
      )
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    )
  )
  INTO v_result
  FROM public.orders o
  WHERE (
    o.order_number ILIKE v_clean_order
    OR o.order_number ILIKE 'ORD-' || v_clean_order
    OR o.id::TEXT = v_clean_order
  )
  AND (
    o.customer_phone = v_clean_phone
    OR RIGHT(o.customer_phone, 10) = RIGHT(v_clean_phone, 10)
  );

  RETURN v_result;
END;
$$;

-- 3. cancel_guest_order with flexible order identifier + phone verification
CREATE OR REPLACE FUNCTION public.cancel_guest_order(p_order_id TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_clean_order TEXT;
  v_clean_phone TEXT;
BEGIN
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order ID is required');
  END IF;
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone number is required');
  END IF;

  v_clean_order := TRIM(REPLACE(p_order_id, '#', ''));
  v_clean_phone := TRIM(p_phone);

  SELECT id, status, payment_status, payment_method, customer_phone
  INTO v_order
  FROM public.orders
  WHERE (
    order_number ILIKE v_clean_order
    OR order_number ILIKE 'ORD-' || v_clean_order
    OR id::TEXT = v_clean_order
  )
  AND (
    customer_phone = v_clean_phone
    OR RIGHT(customer_phone, 10) = RIGHT(v_clean_phone, 10)
  );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Security rules: Customer can cancel ONLY when:
  -- - status is 'pending'
  -- - payment_status is 'pending'
  -- Never allow cancelling paid Razorpay orders or orders already confirmed/processing/shipped/delivered
  IF v_order.status = 'pending' AND v_order.payment_status = 'pending' THEN
    UPDATE public.orders
    SET status = 'cancelled',
        payment_status = 'failed',
        notes = COALESCE(notes || ' | ', '') || 'Cancelled by customer'
    WHERE id = v_order.id;

    RETURN jsonb_build_object('success', true, 'cancelled', true);
  END IF;

  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Order cannot be cancelled in its current state (' || v_order.status || ')'
  );
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_guest_order TO anon, authenticated;
