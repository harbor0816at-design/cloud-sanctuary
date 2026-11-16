// Creates a Stripe Checkout Session for a pending Sanctuary order and returns its hosted payment URL.
// Secrets: SANCTUARY_STRIPE_SECRET_KEY = key of the Sanctuary (Fidova Technology) Stripe account.
// Each project in this Supabase project has its own Stripe account, so each uses its own secret name.
// STRIPE_SECRET_KEY is only a legacy fallback. Optional ALLOWED_ORIGINS (comma separated).
const SK = Deno.env.get("SANCTUARY_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Primary domain first: it is the fallback return URL for unknown origins.
const BUILTIN = ["https://cloudsanctuary.app", "https://www.cloudsanctuary.app", "https://cloud-sanctuary.vercel.app"];
const ORIGINS = [...BUILTIN, ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean)];
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
    f.set("metadata[project]", "sanctuary");
    f.set("payment_intent_data[metadata][project]", "sanctuary");
    f.set("locale", lc === "zh" ? "zh" : lc);
    f.set("line_items[0][quantity]", "1");
    f.set("line_items[0][price_data][currency]", o.currency);
    f.set("line_items[0][price_data][unit_amount]", String(o.amount_cents));
    f.set("line_items[0][price_data][product_data][name]", (NAMES[o.kind] || NAMES.candle)[lc]);
    // Digital, electronically supplied service; price is tax-inclusive so the buyer pays exactly €1 / €9.90.
    f.set("line_items[0][price_data][product_data][tax_code]", "txcd_10000000");
    f.set("line_items[0][price_data][tax_behavior]", "inclusive");
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
