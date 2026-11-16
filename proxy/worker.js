/* Centy proxy: a Cloudflare Worker that holds the Gemini key privately, so it
   never appears in the public GitHub repository.
   Setup: Cloudflare dashboard → Workers & Pages → Create → Worker → paste this
   file → Deploy. Then Settings → Variables and Secrets → add a Secret named
   GEMINI_KEY with your key. Put the worker's URL in js/config.js as proxyUrl.
   Check it: open <worker URL>/test in a browser to see Google's reply. */
const ALLOWED_ORIGINS = ["github.io", "localhost", "127.0.0.1"];
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 30000;

async function callGemini(path, body, key) {
  const started = Date.now();
  try {
    const res = await fetch(GEMINI + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    return { status: res.status, text: await res.text(), ms: Date.now() - started };
  } catch (e) {
    const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
    const message = timedOut ? `Google did not answer within ${TIMEOUT_MS / 1000} seconds.` : `Could not reach Google: ${e && e.message}`;
    return { status: 504, text: JSON.stringify({ error: { message } }), ms: Date.now() - started };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = (env.GEMINI_KEY || "").trim();

    // Diagnostic page: open /test in a browser.
    if (url.pathname === "/test") {
      if (!key) return new Response("GEMINI_KEY secret is missing. Add it under Settings → Variables and Secrets.", { status: 500 });
      const model = url.searchParams.get("model") || "gemini-flash-latest";
      const r = await callGemini(`/models/${model}:generateContent`,
        JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with just: hello" }] }] }), key);
      return new Response(`Model: ${model}\nKey starts with: ${key.slice(0, 5)}… (length ${key.length})\nGoogle status: ${r.status}\nTime: ${r.ms} ms\n\n${r.text.slice(0, 1500)}`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

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
    if (!/^\/models\/[\w.\-]+:generateContent$/.test(url.pathname)) return json({ error: { message: "Unknown path." } }, 404);
    if (!key) return json({ error: { message: "The proxy has no GEMINI_KEY secret set." } }, 500);

    const r = await callGemini(url.pathname, await request.text(), key);
    return new Response(r.text, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
