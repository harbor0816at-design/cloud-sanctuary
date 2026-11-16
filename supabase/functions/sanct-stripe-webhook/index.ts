// Stripe webhook (deploy with verify_jwt = false). Verifies the Stripe-Signature header with
// SANCTUARY_STRIPE_WEBHOOK_SECRET (fallback STRIPE_WEBHOOK_SECRET) and marks orders paid on checkout.session.completed / async_payment_succeeded.
const WH = Deno.env.get("SANCTUARY_STRIPE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  return r.json();
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function verify(body: string, header: string | null) {
  if (!header || !WH) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const t = parts["t"]; if (!t) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const sigs = header.split(",").filter((p) => p.trim().startsWith("v1=")).map((p) => p.trim().slice(3));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(WH), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  return sigs.some((s) => safeEq(s, mac));
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  if (!WH) return new Response("not_configured", { status: 503 });
  const body = await req.text();
  if (!(await verify(body, req.headers.get("stripe-signature")))) return new Response("bad signature", { status: 400 });
  try {
    const ev = JSON.parse(body);
    if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
      const s = ev.data.object;
      const id = s.metadata?.order_id;
      if (id && s.payment_status === "paid") {
        const st = await rpc("sanct_pay_mark_paid", { p_id: id, p_ref: s.id, p_amount_cents: s.amount_total, p_currency: s.currency });
        return new Response(JSON.stringify({ status: st }), { headers: { "Content-Type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ ignored: ev.type }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response("error " + String(e).slice(0, 100), { status: 500 });
  }
});
