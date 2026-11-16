/* Centsible site configuration.
   proxyUrl: the address of the Centy proxy (proxy/worker.js on Cloudflare Workers).
   The proxy keeps the Gemini key secret, so no key is ever stored in this public file.
   Example: "https://centy-proxy.your-name.workers.dev"
   Leave it "" and visitors can still add their own key in Settings, or use offline mode. */
window.CENTSIBLE_CONFIG = {
  proxyUrl: "https://centy-proxy.zacharycharles81.workers.dev",
  geminiKey: "",
  model: "gemini-flash-latest"
};
