// Creates a PayPal order for a pending Sanctuary order and returns the approval URL.
// Secrets (set in Supabase → Edge Functions → Secrets): PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV (sandbox|live), optional ALLOWED_ORIGINS.
const ENV = Deno.env.get("PAYPAL_ENV") === "live" ? "live" : "sandbox";
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const CID = Deno.env.get("PAYPAL_CLIENT_ID"), SEC = Deno.env.get("PAYPAL_SECRET");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://cloud-sanctuary.vercel.app").split(",").map((s) => s.trim());
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
    const { token, order, lang, origin } = await req.json();
    const o = await rpc("sanct_pay_get", { p_token: token, p_id: order });
    if (!o) return json({ error: "not_found" }, 404);
    if (o.status !== "pending") return json({ error: "bad_status", status: o.status }, 409);
    const base = ORIGINS.includes(origin) ? origin : ORIGINS[0];
    const en = lang === "en";
    const desc = o.kind === "candle" ? (en ? "Sanctuary · candle" : "云上圣所 · 蜡烛") : (en ? "Sanctuary · guided confession" : "云上圣所 · 引导式忏悔");
    const at = await ppToken();
    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json", "PayPal-Request-Id": `create-${o.id}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: o.id, custom_id: o.id, description: desc, amount: { currency_code: String(o.currency).toUpperCase(), value: (o.amount_cents / 100).toFixed(2) } }],
        payment_source: { paypal: { experience_context: { brand_name: "Sanctuary", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", locale: en ? "en-US" : "zh-CN", return_url: `${base}/?pay=ok`, cancel_url: `${base}/?pay=cancel` } } },
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "paypal_create", detail: j?.name }, 502);
    await rpc("sanct_pay_set_ref", { p_id: o.id, p_ref: j.id });
    const link = (j.links || []).find((l: { rel: string }) => l.rel === "payer-action" || l.rel === "approve");
    return json({ url: link?.href ?? null });
  } catch (e) {
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
