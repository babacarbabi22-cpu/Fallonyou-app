import React from "react";
import { createPortal } from "react-dom";
import { LanguageSelector } from "./LanguageSelector";

// Keep a compact language control within reach on pages without their own.
// A portal avoids fixed-position clipping by animated/transformed page parents.
export function AppLanguageControl() {
  const control = (
    <div
      className="fixed z-40 left-4 rounded-full border border-amber-400/50 bg-background/95 px-1 text-foreground shadow-lg"
      style={{
        left: "max(1rem, env(safe-area-inset-left, 0px))",
        bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))",
      }}
      data-testid="app-language-control"
    >
      <LanguageSelector showLabel />
    </div>
  );
  return typeof document === "undefined" ? control : createPortal(control, document.body);
}
