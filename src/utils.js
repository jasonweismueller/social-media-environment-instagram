/* ------------------------------ Basics ------------------------------------ */
export const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);
export const now = () => Date.now();
export const fmtTime = (ms) => new Date(ms).toISOString();
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const getUrlParam = (key) =>
  new URLSearchParams(window.location.search).get(key || "");

export const abbr =
  (n) =>
    n >= 1e6 ? (n / 1e6).toFixed(1) + "M"
    : n >= 1e3 ? (n / 1e3).toFixed(1) + "K"
    : String(n || 0);

export const nfCompact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function toCSV(rows, header) {
  const esc = (v) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [];
  if (header) lines.push(header.map(esc).join(","));
  for (const r of rows) lines.push(header.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

export const toggleInSet = (setObj, id) => {
  const next = new Set(setObj || []);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
};

/* --------------------- Reactions helpers ---------------------------------- */
export const REACTION_META = {
  like:  { emoji: "👍", label: "Like"  },
  love:  { emoji: "❤️", label: "Love"  },
  care:  { emoji: "🤗", label: "Care"  },
  haha:  { emoji: "😆", label: "Haha"  },
  wow:   { emoji: "😮", label: "Wow"   },
  sad:   { emoji: "😢", label: "Sad"   },
  angry: { emoji: "😡", label: "Angry" },
};

export const sumSelectedReactions = (reactions = {}, selected = []) =>
  selected.reduce((acc, k) => acc + (Number(reactions[k]) || 0), 0);

export function topReactions(reactions = {}, selected = [], N = 3) {
  return selected
    .map((k) => ({ key: k, count: Number(reactions[k]) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, N);
}

/* ---- Fake names + deterministic picker (for hover peeks) ---- */
const NAME_POOL = [
  "Alex Chen","Maya Patel","Jordan Li","Samir Khan","Nora Williams","Diego Santos","Hana Suzuki","Ava Johnson",
  "Ethan Brown","Isabella Garcia","Leo Müller","Zoe Martin","Ibrahim Ali","Priya Nair","Luca Rossi","Omar Haddad",
  "Fatima Noor","Sofia Ribeiro","Jin Park","Amara Okafor","Kai Nguyen","Elena Petrova","Noah Wilson","Aria Thompson",
  "Mateo Alvarez","Yara Hassan","Oliver Smith","Mila Novak","Theo Laurent","Liam O'Connor","Mina Rahman","Ravi Gupta",
  "Sara Lindström","Jonas Becker","Chloe Evans","Giulia Bianchi","Kenji Watanabe","Tariq Aziz","Aline Costa","Rhea Singh",
];

function mulberry32_(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStrToInt_(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministically pick up to N unique names for a post + metric kind.
 * New API: fakeNamesFor(postId, kind, count, maxShow)
 * Back-compat: fakeNamesFor(postId, count, kind, maxShow)
 * Returns { names: string[], remaining: number }
 */
export function fakeNamesFor(postId, a, b, maxShow = 5) {
  // argument normalization
  let kind = "comments";
  let count = 0;
  if (typeof a === "string") {
    // (postId, kind, count)
    kind = a;
    count = Number(b) || 0;
  } else {
    // (postId, count, kind?)
    count = Number(a) || 0;
    if (typeof b === "string") kind = b;
  }

  const n = Math.max(0, count);
  if (n === 0) return { names: [], remaining: 0 };

  const seed = hashStrToInt_(`${postId}::${kind}::v1`);
  const rnd = mulberry32_(seed);

  // Fisher–Yates shuffle over indices (deterministic by seed)
  const idx = NAME_POOL.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  const uniqueCount = Math.min(n, NAME_POOL.length);
  const chosen = idx.slice(0, uniqueCount).map(i => NAME_POOL[i]);
  const names = chosen.slice(0, Math.min(maxShow, chosen.length));
  const remaining = Math.max(0, n - names.length);
  return { names, remaining };
}

/**
 * Legacy helper… (returns names list w/ “and X more”)
 */
export function fakeNamesList(postId, kindOrCount, countMaybe, maxShow = 5) {
  let kind = "comments";
  let count = 0;
  if (typeof kindOrCount === "string") {
    kind = kindOrCount;
    count = Number(countMaybe) || 0;
  } else {
    count = Number(kindOrCount) || 0;
  }
  const { names, remaining } = fakeNamesFor(postId, kind, count, maxShow);
  if (remaining > 0) {
    return [...names, `and ${remaining} more`];
  }
  return names;
}

// utils.js (add)
export function neutralAvatarDataUrl(seed = "") {
  const s = String(seed || "");
  const palette = ["#0ea5e9","#22c55e","#a855f7","#f59e0b","#ef4444","#06b6d4","#84cc16","#6366f1"];
  let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i))|0;
  const bg = palette[Math.abs(h) % palette.length];

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="#111827" stop-opacity=".25" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="32" fill="url(#g)"/>
  <circle cx="32" cy="26.5" r="10" fill="#f3f4f6"/>
  <path d="M16 54c3-10 10-15 16-15s13 5 16 15" fill="#e5e7eb"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* --------------------- Backend config ------------------------------------- */
export const GS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyMfkPHIax4dbL1TePsdRYRUXoaEIPrh9lW-9HmrvCROYzpNNx9xSOlzqWgKs29ab1OyQ/exec";

// NOTE: This token is ONLY for participant logging. Admin actions use admin_token from login.
export const GS_TOKEN = "a38d92c1-48f9-4f2c-bc94-12c72b9f3427";

const FEEDS_GET_URL         = GS_ENDPOINT + "?path=feeds";
const DEFAULT_FEED_GET_URL  = GS_ENDPOINT + "?path=default_feed";
const POSTS_GET_URL         = GS_ENDPOINT + "?path=posts";
const PARTICIPANTS_GET_URL  = GS_ENDPOINT + "?path=participants";

/* --------------------- Fetch helpers (timeout + retry) -------------------- */
async function fetchWithTimeout(url, opts = {}, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: opts.signal || ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function getJsonWithRetry(url, opts = {}, { retries = 1, timeoutMs = 8000 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(url, opts, { timeoutMs });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

/* --------------------- Admin auth (session token) ------------------------- */
const ADMIN_TOKEN_KEY = "fb_admin_token_v1";
const ADMIN_TOKEN_EXP_KEY = "fb_admin_token_exp_v1";

function setAdminToken(token, ttlSec) {
  try {
    if (!token) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
      return;
    }
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (Number.isFinite(Number(ttlSec)) && ttlSec > 0) {
      localStorage.setItem(ADMIN_TOKEN_EXP_KEY, String(Date.now() + Number(ttlSec) * 1000));
    } else {
      localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
    }
  } catch {}
}
export function getAdminToken() {
  try {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY);
    const exp = Number(localStorage.getItem(ADMIN_TOKEN_EXP_KEY) || "");
    if (!t || !t.trim()) return null;
    if (exp && Date.now() > exp) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
      return null;
    }
    return t;
  } catch { return null; }
}
export function hasAdminSession() { return !!getAdminToken(); }
export function clearAdminToken() { setAdminToken(""); }

export async function adminLogin(password) {
  try {
    const res = await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ action: "admin_login", password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, err: `HTTP ${res.status} ${txt || ""}`.trim() };
    }
    const data = await res.json().catch(() => ({}));
    if (data && data.ok && data.admin_token) {
      setAdminToken(data.admin_token, data.ttl_s || data.ttl_sec || null);
      return { ok: true, admin_token: data.admin_token, ttl_s: data.ttl_s || data.ttl_sec || null };
    }
    return { ok: false, err: data?.err || "Login failed" };
  } catch (e) {
    return { ok: false, err: String(e.message || e) };
  }
}

export async function adminLogout() {
  const admin_token = getAdminToken();
  clearAdminToken();
  if (!admin_token) return { ok: true };
  try {
    await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ action: "admin_logout", admin_token }),
      keepalive: true,
    });
  } catch {}
  return { ok: true };
}

/* --------------------- Logging participants & events ---------------------- */
export async function sendToSheet(header, row, events, feed_id) {
  if (!feed_id) { console.warn("sendToSheet: feed_id required"); return false; }
  const payload = { token: GS_TOKEN, action: "log_participant", feed_id, header, row, events };
  const blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });

  if (navigator.sendBeacon) {
    return navigator.sendBeacon(GS_ENDPOINT, blob);
  }
  try {
    await fetch(GS_ENDPOINT, { method: "POST", mode: "no-cors", body: blob, keepalive: true });
    return true;
  } catch (err) {
    console.warn("sendToSheet failed:", err);
    return false;
  }
}

/* --------------------- Feeds listing (Admin switcher) --------------------- */
export async function listFeedsFromBackend() {
  try {
    const data = await getJsonWithRetry(
      FEEDS_GET_URL + "&_ts=" + Date.now(),
      { method: "GET", mode: "cors", cache: "no-store" },
      { retries: 1, timeoutMs: 8000 }
    );
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("listFeedsFromBackend failed:", e);
    return [];
  }
}

/* -------- default feed helpers (persisted on backend) --------------------- */
export async function getDefaultFeedFromBackend() {
  try {
    const data = await getJsonWithRetry(
      DEFAULT_FEED_GET_URL + "&_ts=" + Date.now(),
      { method: "GET", mode: "cors", cache: "no-store" },
      { retries: 1, timeoutMs: 8000 }
    );
    return (data && typeof data === "object") ? (data.feed_id || null) : null;
  } catch (e) {
    console.warn("getDefaultFeedFromBackend failed:", e);
    return null;
  }
}

export async function setDefaultFeedOnBackend(feedId) {
  const admin_token = getAdminToken();
  if (!admin_token) { console.warn("setDefaultFeedOnBackend: missing admin_token"); return false; }
  try {
    await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        action: "set_default_feed",
        feed_id: feedId || "",
        admin_token,
      }),
      keepalive: true,
    });
    return true;
  } catch (e) {
    console.warn("setDefaultFeedOnBackend failed:", e);
    return false;
  }
}

export async function deleteFeedOnBackend(feedId) {
  const admin_token = getAdminToken();
  if (!admin_token) return false;
  try {
    const res = await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_feed",
        admin_token,
        feed_id: feedId,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("deleteFeedOnBackend failed", e);
    return false;
  }
}

/* ------------------------- Video preload helpers -------------------------- */
const DRIVE_RE = /(?:^|\/\/)(?:drive\.google\.com|drive\.usercontent\.google\.com)/i;
const __videoPreloadSet = new Set();

/** Add a <link rel="preload" as="video"> to speed up first play (non-Drive only). */
export function injectVideoPreload(url, mime = "video/mp4") {
  if (!url || DRIVE_RE.test(url)) return;
  if (__videoPreloadSet.has(url)) return;

  const exists = Array.from(document.querySelectorAll('link[rel="preload"][as="video"]'))
    .some(l => l.href === url);
  if (exists) { __videoPreloadSet.add(url); return; }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  link.href = url;
  link.crossOrigin = "anonymous";
  if (mime) link.type = mime;
  document.head.appendChild(link);
  __videoPreloadSet.add(url);
}

/** Create a hidden <video> to warm the cache (non-Drive only). */
export function primeVideoCache(url) {
  if (!url || DRIVE_RE.test(url)) return;
  if (__videoPreloadSet.has(`prime:${url}`)) return;

  const v = document.createElement("video");
  v.src = url;
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.crossOrigin = "anonymous";
  try { v.load(); } catch {}
  __videoPreloadSet.add(`prime:${url}`);

  setTimeout(() => { try { v.src = ""; } catch {} }, 30000);
}

/* ------------------------- POSTS API (multi-feed + cache) ----------------- */
const __postsCache = new Map(); // key: feedId|null -> { at, data }
const POSTS_STALE_MS = 60_000;

function __getCachedPosts(feedId) {
  const rec = __postsCache.get(feedId || null);
  if (!rec) return null;
  if (Date.now() - rec.at > POSTS_STALE_MS) return null;
  return rec.data;
}
function __setCachedPosts(feedId, data) {
  __postsCache.set(feedId || null, { at: Date.now(), data });
}

export function invalidatePostsCache(feedId = null) {
  if (feedId === undefined) feedId = null;
  __postsCache.delete(feedId);
}

/**
 * loadPostsFromBackend(feedId?, opts?)
 *  - loadPostsFromBackend("feed_a")
 *  - loadPostsFromBackend("feed_a", { force: true })
 *  - loadPostsFromBackend({ force: true })
 *
 * Now also preloads streamable video URLs (non-Drive) for faster playback.
 */
export async function loadPostsFromBackend(arg1, arg2) {
  let feedId = null;
  let force = false;

  if (typeof arg1 === "string") {
    feedId = arg1 || null;
    if (arg2 && typeof arg2 === "object") force = !!arg2.force;
  } else if (arg1 && typeof arg1 === "object") {
    force = !!arg1.force;
  }

  if (!feedId) {
    feedId = await getDefaultFeedFromBackend();
  }

  if (!force) {
    const cached = __getCachedPosts(feedId);
    if (cached) return cached;
  }

  try {
    const url =
      POSTS_GET_URL +
      (feedId ? `&feed_id=${encodeURIComponent(feedId)}` : "") +
      "&_ts=" + Date.now();

    const data = await getJsonWithRetry(
      url,
      { method: "GET", mode: "cors", cache: "no-store" },
      { retries: 1, timeoutMs: 8000 }
    );
    const arr = Array.isArray(data) ? data : [];

    // Preload streamable video URLs (skip Drive/iframe)
    arr
      .filter(p => p?.videoMode !== "none" && p?.video?.url && !DRIVE_RE.test(p.video.url))
      .forEach(p => {
        injectVideoPreload(p.video.url, p.video?.mime || "video/mp4");
        primeVideoCache(p.video.url);
      });

    __setCachedPosts(feedId, arr);
    return arr;
  } catch (e) {
    console.warn("loadPostsFromBackend failed:", e);
    const cached = __getCachedPosts(feedId);
    return cached || [];
  }
}

/**
 * savePostsToBackend(posts, { feedId, name } = {})
 */
export async function savePostsToBackend(posts, ctx = {}) {
  const { feedId = null, name = null } = ctx || {};
  const admin_token = getAdminToken();
  if (!admin_token) { console.warn("savePostsToBackend: missing admin_token"); return false; }
  try {
    await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        action: "publish_posts",
        posts,
        feed_id: feedId,
        name,
        admin_token,
      }),
      keepalive: true,
    });
    invalidatePostsCache(feedId);
    return true;
  } catch (err) {
    console.warn("Publish failed:", err);
    return false;
  }
}

/* ---------------------------- Media helpers -------------------------------- */
export const pravatar = (n) => `https://i.pravatar.cc/64?img=${n}`;
export const randomAvatarUrl = () =>
  pravatar(10 + Math.floor(Math.random() * 70));
export const randomSVG = (title = "Image") => {
  const c1 = ["#fde68a", "#a7f3d0", "#e2f3e6", "#bfdbfe", "#fca5a5"][Math.floor(Math.random()*5)];
  const c2 = ["#fca5a5", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"][Math.floor(Math.random()*5)];
  return {
    alt: title,
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 420'>
      <defs><linearGradient id='g' x1='0' x2='1'>
        <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
      </linearGradient></defs>
      <rect width='800' height='420' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-size='28' fill='#1f2937' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'>${title}</text>
    </svg>`
  };
};

/* --------------------------- Feed ID helper -------------------------------- */
export function computeFeedId(posts = []) {
  const src = posts.map(p =>
    `${p.id}|${(p.text || '').length}|${p.imageMode || ''}|${p.interventionType || ''}`
  ).join('~');
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0;
  return 'feed_' + (h >>> 0).toString(36);
}

/* -------- participant row/header builders (client) ------------------------ */
export function buildMinimalHeader(posts) {
  const base = [
    "session_id",
    "participant_id",
    "entered_at_iso",
    "submitted_at_iso",
    "ms_enter_to_submit",
    "ms_enter_to_last_interaction",
    "feed_id",
  ];

  const perPost = [];
  posts.forEach((p) => {
    const id = p.id || "unknown";
    perPost.push(
      `${id}_reacted`,
      `${id}_reactions`,
      `${id}_expandable`,
      `${id}_expanded`,
      `${id}_commented`,
      `${id}_comment_texts`,
      `${id}_shared`,
      `${id}_reported_misinfo`
    );
  });

  return [...base, ...perPost];
}

function isoToMs(iso) { try { return new Date(iso).getTime(); } catch { return null; } }

export function buildParticipantRow({ session_id, participant_id, events, posts, feed_id }) {
  const byAction = (name) => events.filter(e => e.action === name);
  const firstOf  = (name) => (byAction(name)[0] || null);
  const lastBefore = (name, predicate = () => true) => {
    const cutoff = firstOf(name);
    if (!cutoff) return null;
    const arr = events.filter(e =>
      isoToMs(e.timestamp_iso) <= isoToMs(cutoff.timestamp_iso) && predicate(e)
    );
    return arr.length ? arr[arr.length - 1] : null;
  };

  const entered   = firstOf("participant_id_entered");
  const submitted = firstOf("feed_submit");
  const enteredMs   = entered ? isoToMs(entered.timestamp_iso) : null;
  const submittedMs = submitted ? isoToMs(submitted.timestamp_iso) : null;
  const lastNonScrollPreSubmit = lastBefore("feed_submit",
    (e) => e.action !== "scroll" && e.action !== "feed_submit"
  );

  const row = {
    session_id,
    participant_id: participant_id || "",
    entered_at_iso: entered?.timestamp_iso || "",
    submitted_at_iso: submitted?.timestamp_iso || "",
    ms_enter_to_submit:
      (enteredMs != null && submittedMs != null) ? (submittedMs - enteredMs) : "",
    ms_enter_to_last_interaction:
      (enteredMs != null && lastNonScrollPreSubmit)
        ? (isoToMs(lastNonScrollPreSubmit.timestamp_iso) - enteredMs)
        : "",
    feed_id: feed_id || "",
  };

  posts.forEach((p) => {
    const postEvents = events.filter(e => e.post_id === p.id);

    const lastReactionEvt = [...postEvents].reverse().find(e => e.action === "react_pick");
    const lastReaction = lastReactionEvt && lastReactionEvt.type ? String(lastReactionEvt.type) : "";

    const commentedTexts = postEvents
      .filter(e => e.action === "comment_submit")
      .map(e => (e.text || "").trim())
      .filter(Boolean);

    const expanded   = postEvents.some(e => e.action === "expand_text");
    const expandable = postEvents.some(e => e.action === "text_clamped");

    row[`${p.id}_reacted`]          = lastReaction ? "1" : "0";
    row[`${p.id}_reactions`]        = lastReaction;
    row[`${p.id}_expandable`]       = expandable ? "1" : "0";
    row[`${p.id}_expanded`]         = expanded ? "1" : "0";
    row[`${p.id}_commented`]        = commentedTexts.length > 0 ? "1" : "0";
    row[`${p.id}_comment_texts`]    = commentedTexts.join(" | ");
    row[`${p.id}_shared`]           = postEvents.some(e => e.action === "share") ? "1" : "0";
    row[`${p.id}_reported_misinfo`] = postEvents.some(e => e.action === "report_misinformation_click") ? "1" : "0";
  });

  return row;
}

/* ---------------------- Participants (admin panels) ----------------------- */
export function extractPerPostFromRosterRow(row) {
  if (!row || typeof row !== "object") return {};

  const blob = row.per_post_json || row.per_post || row.perPostJson || null;
  if (blob) {
    try {
      const parsed = typeof blob === "string" ? JSON.parse(blob) : blob;
      const clean = {};
      for (const [id, agg] of Object.entries(parsed || {})) {
        const rx = agg?.reactions || agg?.reaction_types || [];
        const rxArr = Array.isArray(rx)
          ? rx
          : typeof rx === "string"
          ? rx.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        clean[id] = {
          reacted: Number(agg?.reacted || (rxArr.length ? 1 : 0)),
          commented: Number(agg?.commented || (Number(agg?.comment_count) > 0 ? 1 : 0)),
          shared: Number(agg?.shared || 0),
          reported: Number(agg?.reported ?? agg?.reported_misinfo ?? 0),
          expandable: Number(agg?.expandable || 0),
          expanded: Number(agg?.expanded || 0),
          reactions: rxArr,
          reaction_types: rxArr,
          comment_count: Number(agg?.comment_count || 0),
        };
      }
      return clean;
    } catch {/* fall through */}
  }

  const out = {};
  const ensure = (id) => {
    if (!out[id]) {
      out[id] = {
        reacted: 0, commented: 0, shared: 0, reported: 0,
        expandable: 0, expanded: 0,
        reactions: [], reaction_types: [], comment_count: 0,
      };
    }
    return out[id];
  };

  for (const [key, val] of Object.entries(row)) {
    const m = /^(.+?)_(reacted|commented|shared|reported_misinfo|expanded|expandable)$/.exec(key);
    if (m) {
      const [, postId, metric] = m;
      const obj = ensure(postId);
      if (metric === "reported_misinfo") obj.reported = Number(val || 0);
      else if (metric === "expanded")    obj.expanded = Number(val || 0);
      else if (metric === "expandable")  obj.expandable = Number(val || 0);
      else obj[metric] = Number(val || 0);
      continue;
    }
    const r = /^(.+?)_(reactions|reaction_types)$/.exec(key);
    if (r) {
      const [, postId] = r;
      const obj = ensure(postId);
      const arr = String(val || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      obj.reactions = arr;
      obj.reaction_types = arr;
      obj.reacted = obj.reacted || (arr.length ? 1 : 0);
      continue;
    }
    const c = /^(.+?)_comment_count$/.exec(key);
    if (c) {
      const [, postId] = c;
      const obj = ensure(postId);
      obj.comment_count = Number(val || 0);
      obj.commented = obj.commented || (obj.comment_count > 0 ? 1 : 0);
    }
  }
  return out;
}

/**
 * Load participants roster…
 */
export async function loadParticipantsRoster(arg1, arg2) {
  let feedId = null;
  let opts = {};
  if (typeof arg1 === "string") {
    feedId = arg1 || null;
    opts = arg2 || {};
  } else if (arg1 && typeof arg1 === "object") {
    opts = arg1;
  }

  const admin_token = getAdminToken();
  if (!admin_token) {
    console.warn("loadParticipantsRoster: missing admin_token");
    return [];
  }

  try {
    const qFeed = feedId ? `&feed_id=${encodeURIComponent(feedId)}` : "";
    const qAdmin = `&admin_token=${encodeURIComponent(admin_token)}`;
    const url = PARTICIPANTS_GET_URL + qFeed + qAdmin + "&_ts=" + Date.now();
    const data = await getJsonWithRetry(
      url,
      { method: "GET", mode: "cors", cache: "no-store", signal: opts.signal },
      { retries: 1, timeoutMs: 8000 }
    );
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("loadParticipantsRoster failed:", e);
    return [];
  }
}

// --- Admin: wipe participants for a feed
export async function wipeParticipantsOnBackend(feedId) {
  const admin_token = getAdminToken();
  if (!admin_token) return { ok: false, err: "admin auth required" };
  if (!feedId) return { ok: false, err: "feed_id required" };

  try {
    const res = await fetch(GS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        action: "wipe_participants",
        feed_id: feedId,
        admin_token,
      }),
      keepalive: true,
    });

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) return { ok: false, err: `HTTP ${res.status}` };
    if (!data.ok) return { ok: false, err: data.err || "unknown error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, err: String(e.message || e) };
  }
}

// ---- dashboard math helpers ----
const median = (arr) => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const avg = (arr) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null);

export function summarizeRoster(rows) {
  const total = rows.length;
  const completedRows = rows.filter(r => r.submitted_at_iso && String(r.submitted_at_iso).trim());
  const completed = completedRows.length;

  const toNum = (v) => (v === "" || v == null ? null : Number(v));
  const submitTimes = completedRows.map(r => toNum(r.ms_enter_to_submit)).filter(Number.isFinite);
  const lastInteractionTimes = completedRows.map(r => toNum(r.ms_enter_to_last_interaction)).filter(Number.isFinite);

  const postKeys = new Set();
  rows.forEach(r => {
    Object.keys(r).forEach(k => {
      if (/_reacted$|_expandable$|_expanded$|_commented$|_shared$|_reported_misinfo$/.test(k)) {
        const base = k.replace(/_(reacted|expandable|expanded|commented|shared|reported_misinfo)$/, "");
        postKeys.add(base);
      }
    });
  });

  const perPost = {};
  for (const base of postKeys) {
    const reacted    = rows.reduce((acc, r) => acc + (Number(r[`${base}_reacted`]) || 0), 0);
    const expandable = rows.reduce((a, r)   => a + (Number(r[`${base}_expandable`]) || 0), 0);
    const expanded   = rows.reduce((acc, r) => acc + (Number(r[`${base}_expanded`]) || 0), 0);
    const commented  = rows.reduce((acc, r) => acc + (Number(r[`${base}_commented`]) || 0), 0);
    const shared     = rows.reduce((acc, r) => acc + (Number(r[`${base}_shared`]) || 0), 0);
    const reported   = rows.reduce((acc, r) => acc + (Number(r[`${base}_reported_misinfo`]) || 0), 0);
    const expandRate = expandable > 0 ? expanded / expandable : null;
    perPost[base] = { reacted, expandable, expanded, expandRate, commented, shared, reported };
  }

  return {
    counts: { total, completed, completionRate: total ? completed / total : 0 },
    timing: {
      avgEnterToSubmit: avg(submitTimes),
      medEnterToSubmit: median(submitTimes),
      avgEnterToLastInteraction: avg(lastInteractionTimes),
      medEnterToLastInteraction: median(lastInteractionTimes),
    },
    perPost,
  };
}

/* ========================= S3 Upload via Presigner =========================
 * - Uses API Gateway HTTP API (POST /presign) to get a signed PUT URL
 * - Uploads directly to S3 with progress (XHR)
 * - Returns a CloudFront playback URL for the saved object
 * ========================================================================= */
/* ========================= S3 Upload via Presigner ========================= */
/* ========================= S3 Upload via Presigner ========================= */

export const CF_BASE =
  (typeof window !== "undefined" && window.CONFIG?.CF_BASE) ||
  "https://d2bihrgvtn9bga.cloudfront.net";

export const SIGNER_BASE =
  (typeof window !== "undefined" && window.CONFIG?.SIGNER_BASE) ||
  "https://qkbi313c2i.execute-api.us-west-1.amazonaws.com";

export const SIGNER_PATH =
  (typeof window !== "undefined" && window.CONFIG?.SIGNER_PATH) ||
  "/default/presign-upload";

const joinUrl = (base, path) =>
  `${String(base).replace(/\/+$/,"")}/${String(path).replace(/^\/+/,"")}`;

export function encodePathKeepSlashes(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

export function sanitizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function presignEndpoint() {
  return joinUrl(
    (typeof window !== "undefined" && window.CONFIG?.SIGNER_BASE) || SIGNER_BASE,
    (typeof window !== "undefined" && window.CONFIG?.SIGNER_PATH) || SIGNER_PATH
  );
}

function explainFetchError(e) {
  if (e?.name === "AbortError") return "request timed out";
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("failed to fetch")) return "network/CORS (browser blocked the request)";
  return String(e?.message || e || "unknown error");
}

export async function getPresignedPutUrl({ key, contentType, timeoutMs = 20000 }) {
  const url = presignEndpoint();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, contentType }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`.trim());
    }
    const json = await res.json().catch(() => ({}));
    const uploadUrl = json.url || json.uploadUrl;
    const fileUrl = json.cdnUrl || json.fileUrl || null;
    if (!uploadUrl) throw new Error("presigner response missing signed upload URL");
    return { uploadUrl, fileUrl };
  } catch (e) {
    throw new Error(`Presign request to ${url} failed: ${explainFetchError(e)}`);
  } finally {
    clearTimeout(t);
  }
}

export async function putToS3({ file, signedPutUrl, onProgress, contentType }) {
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedPutUrl);
    xhr.timeout = 120000;
    xhr.setRequestHeader(
      "Content-Type",
      contentType || file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 PUT ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during S3 upload"));
    xhr.ontimeout = () => reject(new Error("S3 upload timed out"));
    xhr.send(file);
  });
}

export async function uploadFileToS3ViaSigner({ file, feedId, onProgress, prefix = "videos" }) {
  if (!file) throw new Error("No file selected");
  if (!feedId) throw new Error("Missing feedId");

  const contentType = file.type || "application/octet-stream";
  const ext = (file.name.split(".").pop() || "").toLowerCase() ||
              (contentType.startsWith("video/") ? "mp4" : "bin");
  const ts = Date.now();
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, "")) || `file_${ts}`;
  const key = `${prefix}/${feedId}/${ts}_${base}.${ext}`;

  const { uploadUrl, fileUrl } = await getPresignedPutUrl({ key, contentType });
  await putToS3({ file, signedPutUrl: uploadUrl, onProgress, contentType });

  const cdnUrl = fileUrl || `${CF_BASE}/${encodePathKeepSlashes(key)}`;
  return { key, cdnUrl };
}