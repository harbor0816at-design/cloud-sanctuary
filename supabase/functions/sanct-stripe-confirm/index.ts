// Called when the buyer returns from Stripe: retrieves the Checkout Session and marks the order paid
// (amount, currency and order id are verified server-side). The webhook does the same independently.
const SK = Deno.env.get("STRIPE_SECRET_KEY");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  return r.json();
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!SK) return json({ error: "not_configured" }, 503);
  try {
    const { token, order } = await req.json();
    const o = await rpc("sanct_pay_get", { p_token: token, p_id: order });
    if (!o) return json({ error: "not_found" }, 404);
    if (o.status === "paid" || o.status === "used") return json({ status: o.status });
    if (o.status !== "pending" || !o.provider_ref) return json({ error: "bad_status", status: o.status }, 409);
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(o.provider_ref)}`, { headers: { Authorization: `Bearer ${SK}` } });
    const s = await r.json();
    if (!r.ok) return json({ error: "stripe", code: s?.error?.code ?? null }, 502);
    if (s.metadata?.order_id !== o.id) return json({ error: "mismatch" }, 409);
    if (s.payment_status !== "paid") return json({ error: "not_paid", status: s.payment_status }, 402);
    const st = await rpc("sanct_pay_mark_paid", { p_id: o.id, p_ref: s.id, p_amount_cents: s.amount_total, p_currency: s.currency });
    return json({ status: st });
  } catch (e) {
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
