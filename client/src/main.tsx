import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme or default to light mode
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.remove("light");
} else {
  document.documentElement.classList.add("light");
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (offline + install prompt)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
