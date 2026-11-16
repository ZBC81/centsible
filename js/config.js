/* Centsible site configuration.
   geminiKey: the shared Gemini API key Centy uses for every visitor (for example,
   hackathon judges). A key entered in Settings overrides it.
   This file is public on GitHub, so restrict this key in Google Cloud Console
   (HTTP referrer = your site's address, API = Generative Language API), keep billing
   off for its project, and delete the key after judging. Leave it "" to require
   each visitor to add their own key. */
window.CENTSIBLE_CONFIG = {
  geminiKey: "AQ.Ab8RN6JvE3rOVdErK6IRd9YWJN8mq82H7ss21pjrtU31q-yzKw",
  model: "gemini-flash-latest"
};
