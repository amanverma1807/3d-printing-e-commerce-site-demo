import { createClient } from 'jsr:@supabase/supabase-js@2';

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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      console.error('Missing webhook configuration or secrets in environment.');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Read RAW request body as string before parsing JSON
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('Webhook request missing x-razorpay-signature header.');
      return new Response(JSON.stringify({ error: 'Missing webhook signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Cryptographic signature verification using HMAC-SHA256(raw_body, secret)
    const expectedSignature = await createHmacSha256Hex(webhookSecret, rawBody);
    const isValid = timingSafeEqualString(expectedSignature, signature);

    if (!isValid) {
      console.error('Razorpay webhook signature verification failed.');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse JSON event payload
    let eventData: any;
    try {
      eventData = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventName = eventData?.event;
    console.log(`Received verified Razorpay webhook event: ${eventName}`);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 4. Handle events: Primary event is order.paid (or payment.captured)
    if (eventName === 'order.paid' || eventName === 'payment.captured') {
      const orderEntity = eventData?.payload?.order?.entity;
      const paymentEntity = eventData?.payload?.payment?.entity;

      const rzpOrderId = orderEntity?.id || paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;
      const paidAmountPaise = paymentEntity?.amount;

      if (!rzpOrderId) {
        console.warn('Webhook payload missing razorpay order_id:', eventName);
        return new Response(JSON.stringify({ received: true, message: 'No order_id in payload' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Look up existing order by razorpay_order_id
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, total, payment_status, razorpay_payment_id')
        .eq('razorpay_order_id', rzpOrderId)
        .maybeSingle();

      if (orderError || !order) {
        console.warn(`No local order found for Razorpay order ID ${rzpOrderId}`);
        // Return 200 so Razorpay does not retry indefinitely for untracked/test orders
        return new Response(JSON.stringify({ received: true, message: 'Order not found locally' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Idempotency: If already marked paid
      if (order.payment_status === 'paid') {
        if (order.razorpay_payment_id === rzpPaymentId) {
          console.log(`Order ${order.order_number} already confirmed for payment ${rzpPaymentId}.`);
          return new Response(JSON.stringify({ received: true, already_processed: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          console.warn(`Order ${order.order_number} already paid under different payment ID.`);
          return new Response(JSON.stringify({ received: true, conflict: 'Different payment ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Verify amount matches server order total
      const expectedPaise = Math.round(Number(order.total) * 100);
      if (paidAmountPaise && Number(paidAmountPaise) !== expectedPaise) {
        console.error(`Amount mismatch in webhook for order ${order.order_number}: received ${paidAmountPaise}, expected ${expectedPaise}`);
        return new Response(JSON.stringify({ received: true, warning: 'Amount mismatch' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update order to paid & confirmed
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          razorpay_payment_id: rzpPaymentId || order.razorpay_payment_id,
          payment_status: 'paid',
          status: 'confirmed',
          payment_verified_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order status via webhook:', updateError.message);
        return new Response(JSON.stringify({ error: 'Database update failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log(`Order ${order.order_number} successfully marked as PAID via webhook.`);
      return new Response(JSON.stringify({ received: true, updated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Handle payment.failed event
    if (eventName === 'payment.failed') {
      const paymentEntity = eventData?.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id, order_number, payment_status')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();

        if (order && order.payment_status === 'pending') {
          await supabaseAdmin
            .from('orders')
            .update({
              razorpay_payment_id: rzpPaymentId || null,
              payment_status: 'failed',
            })
            .eq('id', order.id);

          console.log(`Order ${order.order_number} marked as payment_status = failed.`);
        }
      }

      return new Response(JSON.stringify({ received: true, handled: 'payment.failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Acknowledge other unhandled webhook events gracefully
    return new Response(JSON.stringify({ received: true, unhandled_event: eventName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Unexpected webhook error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal webhook error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
