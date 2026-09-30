-- ============================================================================
-- Migration: Per-Product Configurable Shipping / Additional Charges
-- ============================================================================
-- 1. Adds shipping_fee to public.products with a non-negative check constraint.
-- 2. Defaults existing and new products safely to 0.00 (Free Shipping).
-- 3. Updates create_guest_order RPC to calculate shipping authoritatively from
--    the configured products.shipping_fee values once per distinct product line.
-- ============================================================================

-- 1. Add shipping_fee column to public.products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_fee >= 0);

-- Comment for schema documentation
COMMENT ON COLUMN public.products.shipping_fee IS 'Per-product shipping or additional charge added once per distinct product line when purchased.';

-- 2. Update create_guest_order to calculate authoritative product-level shipping fees
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_pincode TEXT,
  p_items JSONB,
  p_customer_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cod'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_product_id UUID;
  v_qty INTEGER;
  v_color TEXT;
  v_image TEXT;
  v_line_total NUMERIC(10, 2);
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_shipping_fee NUMERIC(10, 2) := 0.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_distinct_product_ids UUID[] := '{}';
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  -- Basic input validation
  IF NULLIF(TRIM(p_customer_name), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF NULLIF(TRIM(p_customer_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;
  IF NULLIF(TRIM(p_shipping_address), '') IS NULL THEN
    RAISE EXCEPTION 'Shipping address is required';
  END IF;
  IF NULLIF(TRIM(p_shipping_city), '') IS NULL THEN
    RAISE EXCEPTION 'City is required';
  END IF;
  IF NULLIF(TRIM(p_shipping_state), '') IS NULL THEN
    RAISE EXCEPTION 'State is required';
  END IF;
  IF NULLIF(TRIM(p_shipping_pincode), '') IS NULL THEN
    RAISE EXCEPTION 'Pincode is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Validate payment method
  IF p_payment_method NOT IN ('cod', 'razorpay', 'upi', 'whatsapp') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- Loop through items to validate products and calculate subtotal & product charges using authoritative DB values
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_product_id;
    END IF;

    SELECT id, name, price, shipping_fee, images, is_active, in_stock
    INTO v_product
    FROM public.products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in catalog', v_product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is currently not available', v_product.name;
    END IF;

    IF NOT v_product.in_stock THEN
      RAISE EXCEPTION 'Product "%" is currently out of stock', v_product.name;
    END IF;

    -- Subtotal accumulates line totals (price * quantity)
    v_line_total := v_product.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    -- Product-level charge rule: Each configured charge is applied once per distinct product line
    IF NOT (v_product_id = ANY(v_distinct_product_ids)) THEN
      v_distinct_product_ids := array_append(v_distinct_product_ids, v_product_id);
      v_shipping_fee := v_shipping_fee + COALESCE(v_product.shipping_fee, 0.00);
    END IF;
  END LOOP;

  -- Compute total with authoritative product-level charges added to subtotal
  v_total := v_subtotal + v_shipping_fee;

  -- Insert order record
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    notes,
    payment_method,
    payment_status,
    subtotal,
    shipping_fee,
    total,
    status
  ) VALUES (
    TRIM(p_customer_name),
    TRIM(p_customer_phone),
    NULLIF(TRIM(p_customer_email), ''),
    TRIM(p_shipping_address),
    TRIM(p_shipping_city),
    TRIM(p_shipping_state),
    TRIM(p_shipping_pincode),
    NULLIF(TRIM(p_notes), ''),
    p_payment_method,
    'pending',
    v_subtotal,
    v_shipping_fee,
    v_total,
    'pending'
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Insert snapshot records into order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    v_color := NULLIF(TRIM(v_item->>'selected_color'), '');

    SELECT name, price, images
    INTO v_product
    FROM public.products
    WHERE id = v_product_id;

    v_image := CASE
      WHEN array_length(v_product.images, 1) > 0 THEN v_product.images[1]
      ELSE NULL
    END;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      selected_color,
      unit_price,
      quantity,
      total_price
    ) VALUES (
      v_order_id,
      v_product_id,
      v_product.name,
      v_image,
      v_color,
      v_product.price,
      v_qty,
      v_product.price * v_qty
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'total', v_total
  );
END;
$$;
