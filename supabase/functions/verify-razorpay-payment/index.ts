import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function createHmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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

    if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
      console.error('Missing server credentials in verify-razorpay-payment.');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderId = String(body.order_id || '').trim();
    const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
    const submittedRazorpayOrderId = String(body.razorpay_order_id || '').trim();
    const razorpaySignature = String(body.razorpay_signature || '').trim();

    if (!orderId || !razorpayPaymentId || !submittedRazorpayOrderId || !razorpaySignature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required payment verification fields.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch internal order using service role
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.warn('Order not found for verification:', orderId);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found in database.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Security validation: Ensure order is razorpay and submitted razorpay_order_id matches trusted DB value
    if (order.payment_method !== 'razorpay') {
      return new Response(
        JSON.stringify({ success: false, error: 'Order payment method mismatch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trustedRazorpayOrderId = order.razorpay_order_id;
    if (!trustedRazorpayOrderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order has no associated Razorpay order ID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trustedRazorpayOrderId !== submittedRazorpayOrderId) {
      console.error('Tampering alert: submitted razorpay_order_id does not match trusted DB value', {
        trusted: trustedRazorpayOrderId,
        submitted: submittedRazorpayOrderId,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Razorpay order identifier mismatch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Idempotency Check: If already marked paid
    if (order.payment_status === 'paid') {
      if (order.razorpay_payment_id === razorpayPaymentId) {
        // Same transaction confirmed earlier
        return new Response(
          JSON.stringify({
            success: true,
            order_id: order.id,
            order_number: order.order_number,
            already_processed: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Conflict: Different payment ID attempted on an already paid order
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Order was already completed under a different transaction reference.',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3.5 Replay Protection: Ensure razorpay_payment_id has not already been claimed on another order
    const { data: existingPayment } = await supabaseAdmin
      .from('orders')
      .select('id, order_number')
      .eq('razorpay_payment_id', razorpayPaymentId)
      .neq('id', order.id)
      .maybeSingle();

    if (existingPayment) {
      console.error('Replay alert: razorpay_payment_id already used on another order:', existingPayment.order_number);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment transaction reference has already been claimed on another order.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Cryptographic HMAC-SHA256 signature verification
    // Official Razorpay formula: HMAC(order_id + "|" + razorpay_payment_id, secret)
    // We strictly use the TRUSTED database Razorpay order ID.
    const message = `${trustedRazorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = await createHmacSha256Hex(razorpayKeySecret, message);

    const isSignatureValid = timingSafeEqualString(expectedSignature, razorpaySignature);
    if (!isSignatureValid) {
      console.error('Payment signature verification failed for order:', order.order_number);
      return new Response(
        JSON.stringify({ success: false, error: 'Cryptographic payment signature is invalid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Fetch payment directly from Razorpay API to confirm capture status & exact amount
    const rzpAuthHeader = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpPayResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: rzpAuthHeader,
      },
    });

    if (!rzpPayResponse.ok) {
      const errText = await rzpPayResponse.text();
      console.error('Failed to fetch payment details from Razorpay API:', rzpPayResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify payment with gateway.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await rzpPayResponse.json();

    // Verify payment belongs to expected Razorpay order
    if (paymentData.order_id !== trustedRazorpayOrderId) {
      console.error('Security alert: Payment belongs to different Razorpay order', {
        paymentOrderId: paymentData.order_id,
        trustedOrderId: trustedRazorpayOrderId,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Payment does not match target order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment status is captured (or authorized)
    const validStatuses = ['captured', 'authorized'];
    if (!validStatuses.includes(paymentData.status)) {
      console.error('Payment not in successful state:', paymentData.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payment is in state "${paymentData.status}", not captured.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify amount matches server-calculated order total in paise
    const expectedAmountInPaise = Math.round(Number(order.total) * 100);
    if (Number(paymentData.amount) !== expectedAmountInPaise) {
      console.error('Security alert: Amount mismatch', {
        receivedPaise: paymentData.amount,
        expectedPaise: expectedAmountInPaise,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Paid amount does not match order total.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify currency
    if (paymentData.currency !== 'INR') {
      return new Response(
        JSON.stringify({ success: false, error: 'Currency mismatch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Only after ALL checks pass: Update order to paid & confirmed
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        payment_status: 'paid',
        status: 'confirmed',
        payment_verified_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order status to paid:', updateError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment was captured, but database order update failed. Please contact support.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in verify-razorpay-payment:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
