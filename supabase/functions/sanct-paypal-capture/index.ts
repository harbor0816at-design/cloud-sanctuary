// Captures an approved PayPal order and marks the Sanctuary order as paid (amount and currency are verified server-side).
const ENV = Deno.env.get("PAYPAL_ENV") === "live" ? "live" : "sandbox";
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const CID = Deno.env.get("PAYPAL_CLIENT_ID"), SEC = Deno.env.get("PAYPAL_SECRET");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  return r.json();
}
async function ppToken() {
  const r = await fetch(`${BASE}/v1/oauth2/token`, { method: "POST", headers: { Authorization: "Basic " + btoa(`${CID}:${SEC}`), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const j = await r.json();
  if (!r.ok) throw new Error("paypal_auth");
  return j.access_token as string;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!CID || !SEC) return json({ error: "not_configured" }, 503);
  try {
    const { token, order } = await req.json();
    const o = await rpc("sanct_pay_get", { p_token: token, p_id: order });
    if (!o) return json({ error: "not_found" }, 404);
    if (o.status === "paid" || o.status === "used") return json({ status: o.status });
    if (o.status !== "pending" || !o.provider_ref) return json({ error: "bad_status", status: o.status }, 409);
    const at = await ppToken();
    // Look at the order first: only an APPROVED order can be captured; a COMPLETED one was captured already.
    let r = await fetch(`${BASE}/v2/checkout/orders/${o.provider_ref}`, { headers: { Authorization: `Bearer ${at}` } });
    let j = await r.json();
    if (!r.ok) return json({ error: "paypal_get", name: j?.name ?? null }, 502);
    if (j.status === "APPROVED") {
      r = await fetch(`${BASE}/v2/checkout/orders/${o.provider_ref}/capture`, { method: "POST", headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json", "PayPal-Request-Id": `capture-${o.id}-${Date.now()}` } });
      j = await r.json();
      if (!r.ok) return json({ error: "paypal_capture", name: j?.name ?? null, issue: j?.details?.[0]?.issue ?? null }, 402);
    }
    if (j?.status !== "COMPLETED") return json({ error: "not_completed", status: j?.status ?? null }, 402);
    const pu = j.purchase_units?.[0];
    if (pu?.reference_id && pu.reference_id !== o.id) return json({ error: "mismatch" }, 409);
    const cap = pu?.payments?.captures?.[0];
    if (!cap || cap.status !== "COMPLETED") return json({ error: "not_completed", status: cap?.status ?? null }, 402);
    const cents = Math.round(parseFloat(cap.amount.value) * 100);
    const st = await rpc("sanct_pay_mark_paid", { p_id: o.id, p_ref: o.provider_ref, p_amount_cents: cents, p_currency: String(cap.amount.currency_code).toLowerCase() });
    return json({ status: st });
  } catch (e) {
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
