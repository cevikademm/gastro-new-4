// create-payment-intent — Stripe PaymentIntent with Klarna + SEPA + card
// =======================================================================
// POST /create-payment-intent
// Body: { order_id: string, amount: number, currency?: string }
//
// Creates a PaymentIntent with automatic_payment_methods so the Payment Element
// will show Card, Klarna, SEPA, Sofort, iDEAL, Bancontact — whichever are
// enabled in the Stripe dashboard for the account. Writes payment_intent_id
// back to gastro_orders.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!STRIPE_SECRET) return json({ error: "STRIPE_SECRET_KEY not set" }, 500);

  try {
    // ── Authenticate the caller (verify_jwt is also on at the platform level) ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const { order_id, amount, currency = "eur" } = await req.json();
    if (!order_id || !amount) return json({ error: "order_id and amount required" }, 400);
    if (typeof amount !== "number" || amount <= 0) return json({ error: "amount must be a positive number" }, 400);

    const { data: order, error: orderErr } = await supabase
      .from("gastro_orders")
      .select("id, user_id, order_number, currency")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    // ── Ownership check: the order must belong to the authenticated caller ──
    if (order.user_id && order.user_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: order.user_id ?? "",
      },
      description: `2MC Gastro order ${order.order_number}`,
    });

    await supabase
      .from("gastro_orders")
      .update({ payment_intent_id: intent.id, payment_status: "pending" })
      .eq("id", order_id);

    return json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
