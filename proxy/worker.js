/* Centy proxy: a Cloudflare Worker that holds the Gemini key privately, so it
   never appears in the public GitHub repository.
   Setup: Cloudflare dashboard → Workers & Pages → Create → Worker → paste this
   file → Deploy. Then Settings → Variables and Secrets → add a Secret named
   GEMINI_KEY with your key. Put the worker's URL in js/config.js as proxyUrl. */
const ALLOWED_ORIGINS = ["github.io", "localhost", "127.0.0.1"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const host = (() => { try { return new URL(origin).hostname; } catch { return ""; } })();
    const allowed = ALLOWED_ORIGINS.some((d) => host === d || host.endsWith("." + d));
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (!allowed) return json({ error: { message: "This site is not allowed to use the Centy proxy." } }, 403);
    if (request.method !== "POST") return json({ error: { message: "Use POST." } }, 405);

    const path = new URL(request.url).pathname;
    if (!/^\/models\/[\w.\-]+:generateContent$/.test(path)) return json({ error: { message: "Unknown path." } }, 404);
    if (!env.GEMINI_KEY) return json({ error: { message: "The proxy has no GEMINI_KEY secret set." } }, 500);

    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
      body: await request.text()
    });
    return new Response(upstream.body, { status: upstream.status, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
