-- Migration: Add manual shipment tracking number support to orders
-- Preserves all existing data, safely adds tracking_number column if not present,
-- and updates get_guest_order to securely expose tracking_number to verified customers.

-- 1. Safely add tracking_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 2. Update get_guest_order RPC to include tracking_number
CREATE OR REPLACE FUNCTION public.get_guest_order(p_order_id UUID, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
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
  WHERE o.id = p_order_id
    AND (
      o.customer_phone = p_phone
      OR RIGHT(o.customer_phone, 10) = RIGHT(p_phone, 10)
    );

  RETURN v_result;
END;
$$;

-- Grant execution to anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated;
