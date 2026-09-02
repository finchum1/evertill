import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// vite-plugin-pwa's registerType: "autoUpdate" (vite.config.ts) already
// makes a newly-installed service worker take over immediately in the
// background (skipWaiting + clientsClaim) — but that alone never reloads
// an ALREADY-OPEN page onto the fresh assets that new worker now controls,
// which is exactly why a fix landing on Vercel wasn't reliably reaching a
// phone that already had this app open/installed: the page kept running
// on whatever bundle it originally loaded until something else (a full
// relaunch, a manual cache clear) forced a real reload. This is the
// standard, documented fix — reload once a new worker actually takes
// control, not just once one exists — so every deploy self-heals within
// one extra load instead of needing a manual cache-clear to be seen at all.
if ("serviceWorker" in navigator) {
  let reloadedForNewWorker = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForNewWorker) return;
    reloadedForNewWorker = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
