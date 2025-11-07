/* =========================================================
   utils/index.js — Instagram Feed Entry Point
   Mirrors Facebook’s structure for parity
   ========================================================= */

export * from "./utils-core.js";
export * from "./utils-backend.js";
export * from "./utils.js"; // Instagram-specific layer

/* =========================================================
   App Identity
   ========================================================= */

export const APP = "ig";

/**
 * getApp() — Returns current app name ("ig" for Instagram)
 * Useful for dynamic admin dashboards that toggle between apps.
 */
export function getApp() {
  return APP;
}

/**
 * getAppLabel() — Human-friendly label
 * Example: for UI selectors or logs.
 */
export function getAppLabel() {
  return "Instagram";
}

/**
 * getAppTheme() — Optionally return theme tokens or accent colors.
 * (You can expand this later to support feed-specific styling)
 */
export function getAppTheme() {
  return {
    accent: "#E1306C",   // Instagram pink
    bg: "#ffffff",
    name: "Instagram",
  };
}

/* =========================================================
   Notes:
   - This file ensures identical import behavior to Facebook’s utils/index.js.
   - For example, you can do:
   *   import { APP, uid, sendToSheet } from "./utils";
   *   console.log(APP); // "ig"
   - The admin dashboard can swap between these by dynamic import or by reading APP.
   ========================================================= */