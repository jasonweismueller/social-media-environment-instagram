/* =========================================================
   Instagram Feed Utilities (aligned with FB modular structure)
   ========================================================= */

import React from "react";

import {
  uid, now, fmtTime, clamp, abbr, nfCompact, toCSV,
  toggleInSet, fakeNamesFor, fakeNamesList, neutralAvatarDataUrl,
} from "./utils-core.js";

import {
  GS_ENDPOINT, GS_TOKEN,
  listFeedsFromBackend, getDefaultFeedFromBackend,
  setDefaultFeedOnBackend, deleteFeedOnBackend,
  adminLogin, adminLoginUser, adminLogout, hasAdminRole,
  getAdminToken, getAdminRole, getAdminEmail,
  setAdminSession, clearAdminSession,
  startSessionWatch, touchAdminSession, getAdminSecondsLeft,
  sendToSheet,
} from "./utils-backend.js";

/* =========================================================
   App Identity & Admin Token (Instagram scoped)
   ========================================================= */

export const APP = "ig";
const ADMIN_TOKEN_KEY = "ig_admin_token_v1";

/** Store the IG admin token separately from FB’s */
export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

/** Retrieve current IG admin token */
export function getAdminTokenIG() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

/** Clear the IG admin token */
export function clearAdminTokenIG() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/* =========================================================
   Instagram-specific Feed / Participant Helpers
   ========================================================= */

/**
 * Send participant or post interaction data to the Google Sheet.
 * Uses the same backend signature as FB but passes ?app=ig automatically.
 */
export async function sendIGToSheet(header, row, events = [], feedId = "") {
  return await sendToSheet(header, { ...row, app: APP }, events, feedId);
}

/**
 * Summarize participant roster — IG version
 * (If IG uses different metrics such as "saves" instead of "shares", handle here)
 */
export function summarizeRosterIG(roster = []) {
  const total = roster.length;
  const saved = roster.filter(r => r.action === "save").length;
  const liked = roster.filter(r => r.action === "like").length;
  const commented = roster.filter(r => r.action === "comment").length;

  return {
    total,
    liked,
    commented,
    saved,
    summary: `${liked} likes • ${commented} comments • ${saved} saves`,
  };
}

/* =========================================================
   In-view Autoplay Hook (Instagram style)
   ========================================================= */

export function useInViewAutoplay(threshold = 0.65) {
  const wrapRef = React.useRef(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView(entry.isIntersecting && entry.intersectionRatio >= threshold);
        });
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { wrapRef, inView };
}

/* =========================================================
   Feed I/O Wrappers (auto-append ?app=ig)
   ========================================================= */

export async function listIGFeeds(projectId = "") {
  return await listFeedsFromBackend(APP, projectId);
}

export async function getIGDefaultFeed(projectId = "") {
  return await getDefaultFeedFromBackend(APP, projectId);
}

export async function setIGDefaultFeed(feedId, projectId = "") {
  return await setDefaultFeedOnBackend(APP, feedId, projectId);
}

export async function deleteIGFeed(feedId, projectId = "") {
  return await deleteFeedOnBackend(APP, feedId, projectId);
}

/* =========================================================
   Admin Session Lifecycle (mirrors FB utilities)
   ========================================================= */

/**
 * Begin background watch loop that auto-expires session after inactivity.
 * Use this when admin logs in (mirrors FB logic).
 */
export function startIGSessionWatch(onExpire) {
  startSessionWatch(APP, onExpire);
}

/**
 * Touch the IG admin session to reset its expiry timer.
 * Call this whenever admin performs an action.
 */
export function touchIGSession() {
  touchAdminSession(APP);
}

/**
 * Retrieve seconds remaining before IG admin session expires.
 */
export function getIGAdminSecondsLeft() {
  return getAdminSecondsLeft(APP);
}

/* =========================================================
   Media Helpers (Instagram-focused)
   ========================================================= */

/**
 * Generate a stable avatar or placeholder for IG participants.
 */
export function igAvatarFor(seed, gender = "neutral") {
  return fakeNamesFor(seed, gender);
}

/**
 * Choose deterministic gradient background (story/post ring colors).
 */
export function pickIGGradient(seed = "") {
  const colors = [
    ["#f09433", "#e6683c"],
    ["#dc2743", "#cc2366"],
    ["#bc1888", "#833ab4"],
    ["#405de6", "#5851db"],
  ];
  const index = Math.abs([...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
  return `linear-gradient(135deg, ${colors[index][0]}, ${colors[index][1]})`;
}

/* =========================================================
   Re-exports for parity with FB feed
   ========================================================= */

export {
  uid, now, fmtTime, clamp, abbr, nfCompact, toCSV,
  toggleInSet, fakeNamesFor, fakeNamesList, neutralAvatarDataUrl,
  GS_ENDPOINT, GS_TOKEN,
  listFeedsFromBackend, getDefaultFeedFromBackend,
  setDefaultFeedOnBackend, deleteFeedOnBackend,
  adminLogin, adminLoginUser, adminLogout, hasAdminRole,
  getAdminToken, getAdminRole, getAdminEmail,
  setAdminSession, clearAdminSession,
  startSessionWatch, touchAdminSession, getAdminSecondsLeft,
  sendToSheet,
};