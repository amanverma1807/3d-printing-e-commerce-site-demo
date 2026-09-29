-- ============================================================================
-- Master E-Commerce Template Production Database Migration
-- Version: 2.0.0 (Hardened Guest Checkout & Server-Side Price Calculation)
-- Target Engine: PostgreSQL 17 (Supabase)
-- ============================================================================

-- 1. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequence for human-readable order numbers (e.g., ORD-2026-01001)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Universal updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. ADMIN MANAGEMENT & ROLE CHECK
-- ----------------------------------------------------------------------------

-- Admin users registry linked directly to Supabase Auth
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Secure role-checking function with fixed search_path to prevent injection
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. CATEGORIES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 5. PRODUCTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  badge TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  material TEXT,
  dimensions TEXT,
  weight TEXT,
  details TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_count INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ORDERS (GUEST CHECKOUT & PAYMENT TRACKING)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT (
    'ORD-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (
    payment_method IN ('cod', 'razorpay', 'upi', 'whatsapp')
  ),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded')
  ),
  -- Razorpay Integration Fields
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_verified_at TIMESTAMPTZ,
  -- Shipping & Customer Details
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_pincode VARCHAR(10) NOT NULL,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7. ORDER ITEMS (IMMUTABLE SNAPSHOTS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  selected_color TEXT,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 8. SECURE ORDER CREATION & LOOKUP RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- Secure atomic order creation:
-- 1. Validates input fields and non-empty cart items.
-- 2. Reads live product prices from the database (prevents client price tampering).
-- 3. Calculates line item totals and order subtotal strictly on the server.
-- 4. Atomically creates order & order_items and returns order summary.
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
  v_shipping_fee NUMERIC(10, 2) := 110.00; -- Default flat shipping charge (client-configurable template default)
  v_total NUMERIC(10, 2) := 0.00;
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

  -- Loop through items to validate products and calculate subtotal using DB prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_product_id;
    END IF;

    SELECT id, name, price, images, is_active, in_stock
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

    v_line_total := v_product.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  -- Compute total
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

  -- Return confirmed order summary
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'total', v_total,
    'payment_method', p_payment_method
  );
END;
$$;

-- Secure guest order lookup by ID or Order Number and phone (for confirmation and tracking screen)
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

-- Secure guest order cancellation for dismissed checkouts or customer cancellation of eligible pending orders
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

  -- Only allow cancelling if order is currently pending and unpaid
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

-- Grant execution to anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.create_guest_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_guest_order TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 9.1 admin_users policies
CREATE POLICY "Admins can view admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 9.2 categories policies
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 9.3 products policies
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 9.4 orders policies (STRICTLY HARDENED)
-- NOTE: Anonymous & non-admin users CANNOT insert directly via table REST API.
-- All guest orders must go through the public.create_guest_order() RPC function.
CREATE POLICY "Admins can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 9.5 order_items policies (STRICTLY HARDENED)
-- NOTE: Anonymous & non-admin users CANNOT insert directly via table REST API.
-- Order items are snapshot automatically by public.create_guest_order() RPC.
CREATE POLICY "Admins can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete order items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. STORAGE BUCKET & STORAGE RLS POLICIES
-- ----------------------------------------------------------------------------

-- Create public product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Public read access
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Storage RLS: Admins only for insert, update, and delete
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );
