import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getStoredValue } from "./lib/safe-storage";

// Apply the saved preference before React renders to avoid a theme flash.
const savedTheme = getStoredValue("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const shouldUseDark = savedTheme === "dark" || ((savedTheme === "system" || !savedTheme) && prefersDark);
document.documentElement.classList.toggle("light", !shouldUseDark);

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (offline + install prompt)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
