import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase server credentials in Edge Function environment.');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Missing Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET).');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Razorpay payment gateway is not configured on the server. Please configure credentials.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 0. Handle cancellation of an abandoned / dismissed payment attempt
    if (payload.action === 'cancel') {
      const cancelOrderId = String(payload.order_id || '').trim();
      const cancelPhone = String(payload.customer_phone || '').trim();
      const cancelReason = String(payload.reason || 'Checkout modal dismissed or cancelled by customer').trim();

      if (!cancelOrderId || !cancelPhone) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order ID and phone are required for cancellation.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: orderToCancel, error: fetchErr } = await supabaseAdmin
        .from('orders')
        .select('id, status, payment_status, customer_phone')
        .eq('id', cancelOrderId)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Error fetching order for cancellation:', fetchErr.message);
      }

      if (orderToCancel) {
        const cleanDbPhone = orderToCancel.customer_phone.replace(/\D/g, '').slice(-10);
        const cleanReqPhone = cancelPhone.replace(/\D/g, '').slice(-10);
        const phoneMatch = cleanDbPhone === cleanReqPhone;

        // ONLY cancel if it is still pending (never cancel an already paid/confirmed order)
        if (phoneMatch && orderToCancel.status === 'pending' && orderToCancel.payment_status === 'pending') {
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'cancelled',
              payment_status: 'failed',
              notes: cancelReason,
            })
            .eq('id', cancelOrderId);

          console.log(`Order ${cancelOrderId} marked as cancelled/failed due to customer dismissal.`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, cancelled: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Basic validation
    const customerName = String(payload.customer_name || '').trim();
    const customerPhone = String(payload.customer_phone || '').trim();
    const customerEmail = payload.customer_email ? String(payload.customer_email).trim() : null;
    const shippingAddress = String(payload.shipping_address || '').trim();
    const shippingCity = String(payload.shipping_city || '').trim();
    const shippingState = String(payload.shipping_state || '').trim();
    const shippingPincode = String(payload.shipping_pincode || '').trim();
    const notes = payload.notes ? String(payload.notes).trim() : null;
    const items = payload.items;

    if (!customerName || !customerPhone || !shippingAddress || !shippingCity || !shippingState || !shippingPincode) {
      return new Response(
        JSON.stringify({ success: false, error: 'All shipping details and phone number are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cart must contain at least one item.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Call the authoritative PostgreSQL RPC create_guest_order
    // This validates product existence, active status, stock, and calculates authoritative total
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('create_guest_order', {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_shipping_address: shippingAddress,
      p_shipping_city: shippingCity,
      p_shipping_state: shippingState,
      p_shipping_pincode: shippingPincode,
      p_items: items,
      p_customer_email: customerEmail,
      p_notes: notes,
      p_payment_method: 'razorpay',
    });

    if (rpcError || !rpcData || !rpcData.success) {
      console.error('create_guest_order RPC failed:', rpcError?.message || 'Unknown RPC error');
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcError?.message || 'Failed to prepare order with current catalog prices.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const internalOrderId = rpcData.order_id;
    const orderNumber = rpcData.order_number;
    const orderTotal = Number(rpcData.total);
    const shippingFee = Number(rpcData.shipping_fee);

    // Validate authoritative total calculated by PostgreSQL create_guest_order RPC
    // (which computes subtotal from products.price and charges from products.shipping_fee)
    if (isNaN(orderTotal) || orderTotal <= 0) {
      console.error('Invalid order total returned by RPC:', orderTotal);
      return new Response(
        JSON.stringify({ success: false, error: 'Calculated order total is invalid.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert server total to paise for Razorpay (INR)
    const amountInPaise = Math.round(orderTotal * 100);

    // 3. Create order in Razorpay Orders API server-side
    const rzpAuthHeader = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const rzpOrderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: rzpAuthHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderNumber,
        payment_capture: 1,
        notes: {
          internal_order_id: internalOrderId,
          order_number: orderNumber,
          customer_phone: customerPhone,
        },
      }),
    });

    if (!rzpOrderResponse.ok) {
      const errText = await rzpOrderResponse.text();
      console.error('Razorpay Order API creation failed:', rzpOrderResponse.status, errText);

      // Safely record payment failure status on the pending DB order
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', internalOrderId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to initiate order with Razorpay payment gateway.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpOrder = await rzpOrderResponse.json();
    const razorpayOrderId = rzpOrder.id;

    if (!razorpayOrderId) {
      console.error('Razorpay returned no order id:', rzpOrder);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from payment gateway.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update the DB order with the generated razorpay_order_id
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ razorpay_order_id: razorpayOrderId })
      .eq('id', internalOrderId);

    if (updateError) {
      console.error('Failed to link razorpay_order_id to DB order:', updateError.message);
      // DO NOT let client proceed to payment if we cannot tie it to our DB order
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to record payment reference in database. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Return ONLY safe public parameters to client
    return new Response(
      JSON.stringify({
        success: true,
        order_id: internalOrderId,
        order_number: orderNumber,
        razorpay_order_id: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in create-razorpay-order:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
