// Creates a Stripe Checkout Session for a pending Sanctuary order and returns its hosted payment URL.
// Secrets: STRIPE_SECRET_KEY (sk_test_… or sk_live_…), optional ALLOWED_ORIGINS (comma separated).
const SK = Deno.env.get("STRIPE_SECRET_KEY");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://cloud-sanctuary.vercel.app").split(",").map((s) => s.trim()).filter(Boolean);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  return r.json();
}
const LOCALES = ["en", "fr", "de", "it", "es", "zh"];
const NAMES: Record<string, Record<string, string>> = {
  candle: { en: "Prayer candle", fr: "Cierge de prière", de: "Gebetskerze", it: "Candela di preghiera", es: "Vela de oración", zh: "祈祷蜡烛" },
  confession: { en: "Guided confession", fr: "Confession guidée", de: "Geführte Beichte", it: "Confessione guidata", es: "Confesión guiada", zh: "引导式忏悔" },
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!SK) return json({ error: "not_configured" }, 503);
  try {
    const { token, order, lang, origin } = await req.json();
    const o = await rpc("sanct_pay_get", { p_token: token, p_id: order });
    if (!o) return json({ error: "not_found" }, 404);
    if (o.status !== "pending") return json({ error: "bad_status", status: o.status }, 409);
    const base = ORIGINS.includes(origin) ? origin : ORIGINS[0];
    const lc = LOCALES.includes(lang) ? lang : "en";
    const f = new URLSearchParams();
    f.set("mode", "payment");
    f.set("success_url", `${base}/?pay=ok&sid={CHECKOUT_SESSION_ID}`);
    f.set("cancel_url", `${base}/?pay=cancel`);
    f.set("client_reference_id", o.id);
    f.set("metadata[order_id]", o.id);
    f.set("payment_intent_data[metadata][order_id]", o.id);
    f.set("locale", lc === "zh" ? "zh" : lc);
    f.set("line_items[0][quantity]", "1");
    f.set("line_items[0][price_data][currency]", o.currency);
    f.set("line_items[0][price_data][unit_amount]", String(o.amount_cents));
    f.set("line_items[0][price_data][product_data][name]", (NAMES[o.kind] || NAMES.candle)[lc]);
    f.set("expires_at", String(Math.floor(Date.now() / 1000) + 60 * 60));
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${SK}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `cs-${o.id}-${Date.now()}` },
      body: f.toString(),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "stripe", code: j?.error?.code ?? null, message: j?.error?.message?.slice(0, 160) ?? null }, 502);
    await rpc("sanct_pay_set_ref2", { p_id: o.id, p_ref: j.id, p_provider: "stripe" });
    return json({ url: j.url });
  } catch (e) {
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
