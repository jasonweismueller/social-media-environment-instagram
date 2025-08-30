import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import "./styles.css";

/* ------------------------------ Utils ------------------------------------- */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();
const fmtTime = (ms) => new Date(ms).toISOString();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const getUrlParam = (key) => new URLSearchParams(window.location.search).get(key || "");

// compact number formatter (used in feed + admin preview)
const abbr = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" :
  n >= 1e3 ? (n / 1e3).toFixed(1) + "K" :
  String(n || 0);

const nfCompact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

function toCSV(rows, header) {
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

// --- shared helper for toggling ids inside a Set (used by Admin) ---
const toggleInSet = (setObj, id) => {
  const next = new Set(setObj || []);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/* --------------------- Reactions helpers (shared) -------------------------- */
const REACTION_META = {
  like:  { emoji: "👍", label: "Like"  },
  love:  { emoji: "❤️", label: "Love"  },
  care:  { emoji: "🤗", label: "Care"  },
  haha:  { emoji: "😆", label: "Haha"  },
  wow:   { emoji: "😮", label: "Wow"   },
  sad:   { emoji: "😢", label: "Sad"   },
  angry: { emoji: "😡", label: "Angry" },
};
const sumSelectedReactions = (reactions = {}, selected = []) =>
  selected.reduce((acc, k) => acc + (Number(reactions[k]) || 0), 0);
function topReactions(reactions = {}, selected = [], N = 3) {
  return selected
    .map((k) => ({ key: k, count: Number(reactions[k]) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, N);
}

// ---- Global participant roster (per-origin localStorage) ----
const LS_PARTICIPANTS = "fakebook_participants_v2"; // array of rows
const LS_POSTS = "fakebook_posts";

const storage = {
  loadParticipants() {
    try { return JSON.parse(localStorage.getItem(LS_PARTICIPANTS) || "[]"); }
    catch { return []; }
  },
  saveParticipants(rows) {
    localStorage.setItem(LS_PARTICIPANTS, JSON.stringify(rows));
  },
  upsertParticipantRow(row) {
    const all = storage.loadParticipants();
    // keep one row per session_id; append new session, replace if same session_id
    const i = all.findIndex(r => r.session_id === row.session_id);
    if (i === -1) all.push(row); else all[i] = row;
    storage.saveParticipants(all);
    return all;
  },
  clearParticipants() {
    storage.saveParticipants([]);
  }
};

// --- Remote logging (Google Apps Script) ---
const GS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyMfkPHIax4dbL1TePsdRYRUXoaEIPrh9lW-9HmrvCROYzpNNx9xSOlzqWgKs29ab1OyQ/exec"; // your Web App URL
const GS_TOKEN    = "a38d92c1-48f9-4f2c-bc94-12c72b9f3427"; // MUST match TOKEN in Code.gs

async function sendToSheet(row, events) {
  try {
    const res = await fetch(GS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify({ token: GS_TOKEN, row, events }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error("Apps Script returned not ok");
    console.debug("✅ Logged to Google Sheet");
    return true;
  } catch (err) {
    console.warn("⚠️ Failed to log to Google Sheet:", err);
    return false;
  }
}

/* ---------------------------- Sample + Generators -------------------------- */
const pravatar = (n) => `https://i.pravatar.cc/64?img=${n}`;
const randomAvatarUrl = () => pravatar(10 + Math.floor(Math.random() * 70));
const randomSVG = (title = "Image") => {
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

// Seed posts (first run). Thereafter, we load from localStorage.
const SEEDED_POSTS = [
  {
    id: "p1",
    author: "Thomas Johnson",
    avatarMode: "random",
    avatarUrl: pravatar(11),
    badge: false,
    time: "2h",
    text:
      "I’ve partnered with Together For Tomorrow to support local clean-ups and recycling workshops. If you can, check them out and consider donating. " +
      "These initiatives bring the community together, raise awareness about waste reduction, and make a real difference for our environment. " +
      "Every small action counts, and your support means we can reach more neighborhoods and inspire more people to join the cause.",
    imageMode: "random",
    image: randomSVG("Recycling Workshop"),
    links: [{ label: "togetherfortomorrow.org", href: "#" }],
    interventionType: "none",
    noteText: "",
    // reactions config (defaults hidden)
    showReactions: false,
    selectedReactions: ["like"],
    reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    metrics: { comments: 0, shares: 0 },
  },
  {
    id: "p2",
    author: "Rina Park",
    avatarMode: "random",
    avatarUrl: pravatar(22),
    badge: false,
    time: "5h",
    text:
      "Coffee chat at the community center went well! Next one is on Saturday — we’ll share tips to reduce single-use plastics at home. " +
      "Last time, participants brought so many creative ideas: beeswax wraps, DIY cleaners, and bulk food shopping hacks. " +
      "It’s always inspiring to see how small lifestyle changes can add up to a big impact when a community commits together.",
    imageMode: "random",
    image: randomSVG("Bring your bottle"),
    links: [],
    interventionType: "none",
    noteText: "",
    showReactions: false,
    selectedReactions: ["like"],
    reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    metrics: { comments: 0, shares: 0 },
  },
  {
    id: "p3",
    author: "City Green Crew",
    avatarMode: "random",
    avatarUrl: pravatar(33),
    badge: false,
    time: "Yesterday",
    text:
      "Results from last weekend’s river clean: 28 volunteers, 42 bags collected. Thank you to everyone who came along! " +
      "Some of the most common items we found included plastic bottles, snack wrappers, and cigarette butts. " +
      "We’ll be publishing a full report soon, including photos, so stay tuned — and remember, our next clean-up is scheduled for next month.",
    imageMode: "none",
    image: null,
    links: [
      { label: "Volunteer sign-up", href: "#" },
      { label: "Event recap", href: "#" },
    ],
    interventionType: "none",
    noteText: "",
    showReactions: false,
    selectedReactions: ["like"],
    reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    metrics: { comments: 0, shares: 0 },
  },
];

/* ------------------------------- Icons ------------------------------------ */
const IconLike = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
  </svg>
);

const IconThumb = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path d="M10.5 21H7a3 3 0 0 1-3-3v-6a3 3 0  0 1 3-3h3.5l2.7-4.9a2 2 0  0 1 3.6 1.8L16.5 9H19a3 3 0  0 1 3 3c0 .5-.1 1-.3 1.5l-2 5A3 3 0  0 1 17 21h-6.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconComment = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0  0 0 2-2V4a2 2 0  0 0-2-2z"/>
  </svg>
);
const IconShare = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0  0 0 0-1.39l7.02-4.11A2.99 2.99 0 1 0 14 4a2.99 2.99 0  0 0 .05.53L7.03 8.64A3 3 0  1 0 7 15.36l7.02 4.11c-.03.17-.05.34-.05.53a3 3 0  0 0 3-3z"/>
  </svg>
);
const IconDots = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...p}>
    <circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/>
  </svg>
);
const IconLogo = (p) => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" {...p}>
    <rect width="32" height="32" rx="6" fill="#1877F2"/>
    <path d="M20 9h-2.2c-2.2 0-3.8 1.7-3.8 3.9V16H12v3h2v6h3v-6h2.5l.5-3H17v-2c0-.6.4-1 1-1h2V9z" fill="#fff"/>
  </svg>
);
const IconInfo = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
  </svg>
);
const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M16 11a4 4 0 1 0-3.2-6.5A4 4 0  0 0 16 11zM8 12a4 4 0 1 0-3.2-6.5A4 4 0  0 0 8 12z"/>
    <path fill="currentColor" d="M2 19a5 5 0  0 1 5-5h2a5 5 0  0 1 5 5v1H2v-1zm10 0a6.99 6.99 0  0 1 3.3-6h.7a6 6 0  0 1 6 6v1h-10v-1z"/>
  </svg>
);
const IconBadge = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
    <path fill="#1d9bf0" d="M12 2l2.2 2.2 3.1-.3 1.2 2.9 2.9 1.2-.3 3.1L24 12l-2.2 2.2.3 3.1-2.9 1.2-1.2 2.9-3.1-.3L12 24l-2.2-2.2-3.1.3-1.2-2.9-2.9-1.2.3-3.1L0 12l2.2-2.2-.3-3.1 2.9-1.2L6 2.2l3.1.3L12 2z"/>
    <path fill="#fff" d="M10.7 15.3l-2.5-2.5 1.1-1.1 1.4 1.4 4-4 1.1 1.1-5.1 5.1z"/>
  </svg>
);
const IconGlobe = (p) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zm0 18c-1.7 0-3.3-.5-4.6-1.4.5-.8 1-1.8 1.3-2.9h6.6c.3 1.1.8 2.1 1.3 2.9-1.3.9-2.9 1.4-4.6 1.4zm-3.8-6c-.2-.9-.2-1.9-.2-3s.1-2.1.2-3h7.6c.1.9.2 1.9.2 3s-.1 2.1-.2 3H8.2zm.5-7c.3-1.1.8-2.1 1.3-2.9C10.7 3.5 11.3 3.3 12 3.3s1.3.2 2 .8c.6.8 1.1 1.8 1.3 2.9H8.7z"/>
  </svg>
);

/* ----------------------------- Small UI bits ------------------------------- */
function ActionBtn({ label, onClick, Icon, active, disabled, ...rest }) {
  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={disabled}
      className={`action ${active ? "active" : ""}`}
      aria-pressed={!!active}
    >
      <Icon />
      <span style={{ fontSize: ".9rem", fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function PostText({ text, expanded, onExpand }) {
  const pRef = React.useRef(null);
  const [needsClamp, setNeedsClamp] = React.useState(false);

  React.useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    requestAnimationFrame(() => setNeedsClamp(el.scrollHeight > el.clientHeight + 1));
  }, [text, expanded]);

  return (
    <div className="text-wrap">
      <p ref={pRef} className={`text ${!expanded ? "clamp" : ""}`}>{text}</p>
      {!expanded && needsClamp && (
        <div className="fade-more">
          <span className="dots" aria-hidden="true">…</span>
          <button className="see-more" onClick={onExpand}>See more</button>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false, footer = null }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-head">
          <h3 style={{ margin: 0, fontWeight: 600 }}>{title}</h3>
          <button className="dots" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Only this section scrolls */}
        <div className="modal-body">
          {children}
        </div>

        {/* Stays pinned to bottom of the modal */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Post Card ---------------------------------- */
function PostCard({ post, onAction, disabled, registerViewRef }) {
  const [expanded, setExpanded] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const dotsRef = useRef(null);

  // Full set available in the flyout (even if reactions are hidden in the summary)
  const ALL_REACTIONS = {
    like:"👍", love:"❤️", care:"🤗", haha:"😆", wow:"😮", sad:"😢", angry:"😡"
  };

  // Which reaction I picked (drives button icon/label + local count delta)
  const [myReaction, setMyReaction] = useState(null);

  // --- Flyout timing: reliable open + grace close ---
  const OPEN_DELAY = 400;
  const CLOSE_DELAY = 250;
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const openTimer  = useRef(null);
  const closeTimer = useRef(null);

  const scheduleOpen = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setFlyoutOpen(true), OPEN_DELAY);
  };
  const scheduleClose = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setFlyoutOpen(false), CLOSE_DELAY);
  };

  // Config
  const showReactions = post.showReactions ?? false;
  const selectedReactions = (post.selectedReactions && post.selectedReactions.length)
    ? post.selectedReactions
    : ["like"];

  // Ensure reactions map exists
  const baseReactions = {
    like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0,
    ...(post.reactions || {}),
  };

  // Local live counters: add +1 for my selected reaction (any type)
  const liveReactions = useMemo(() => {
    const obj = { ...baseReactions };
    if (myReaction) obj[myReaction] = (obj[myReaction] || 0) + 1;
    return obj;
  }, [baseReactions, myReaction]);

  const [commentCount, setCommentCount] = useState(Number(post.metrics?.comments) || 0);
  const [shareCount, setShareCount]   = useState(Number(post.metrics?.shares) || 0);

  const totalSelected = sumSelectedReactions(liveReactions, selectedReactions);
  const top3 = topReactions(liveReactions, selectedReactions, 3);

  const click = (action, meta = {}) => {
    if (disabled) return;
    onAction(action, { post_id: post.id, ...meta });
  };

  // Primary button click:
  //  - when nothing selected -> pick "like"
  //  - when any reaction is selected -> clear to default (grey thumb)
  const onLike = () => {
    setMyReaction(prev => {
      if (prev == null) {
        click("react_pick", { type: "like", prev: null });
        return "like";
      }
      click("react_clear", { type: prev, prev });
      return null; // back to default grey thumb
    });
  };

  const onPickReaction = (key) => {
    setFlyoutOpen(false);
    setMyReaction(prev => {
      if (prev === key) {
        click("react_clear", { type: key, prev });
        return null; // back to default grey thumb
      }
      click("react_pick", { type: key, prev });
      return key;
    });
  };

  const onShare = () => { click("share"); setShareCount(c => c + 1); };
  const onExpand = () => { setExpanded(true); click("expand_text"); };
  const onOpenComment = () => { setShowComment(true); click("comment_open"); };
  const onSubmitComment = () => {
    const txt = commentText.trim();
    click("comment_submit", { text: txt, length: txt.length });
    setCommentText(""); setShowComment(false); setCommentCount(c => c + 1);
  };
  const onImageOpen = () => { if (post.image) click("image_open", { alt: post.image.alt || "" }); };

  // Close dots menu on outside click/Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      const insideMenu = menuRef.current && menuRef.current.contains(e.target);
      const insideBtn  = dotsRef.current && dotsRef.current.contains(e.target);
      if (!insideMenu && !insideBtn) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const showLabel = post.interventionType === "label";
  const showNote  = post.interventionType === "note";

  // Button icon/label: default grey thumb when no reaction; emoji + label when selected
  const LikeIcon = (p) =>
    myReaction
      ? <span style={{ fontSize: 18, lineHeight: 1 }} {...p}>{ALL_REACTIONS[myReaction]}</span>
      : <IconThumb {...p}/>;

  const likeLabel = myReaction ? (REACTION_META[myReaction]?.label || "Like") : "Like";

  return (
    <article ref={registerViewRef(post.id)} className="card">
      {/* header */}
      <header className="card-head">
        <div className="avatar">
          {post.avatarUrl ? (
            <img src={post.avatarUrl} alt="" className="avatar-img"
                 onLoad={() => click("avatar_load")} onError={() => click("avatar_error")} />
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          <div className="name-row">
            <div className="name">{post.author}</div>
            {post.badge && <span className="badge"><IconBadge /></span>}
          </div>
          <div className="meta" style={{ display:"flex",alignItems:"center",gap:"4px" }}>
            <span>{post.time || "Just now"}</span><span>·</span>
            <IconGlobe style={{ color:"var(--muted)", width:14, height:14, flexShrink:0 }} />
          </div>
        </div>
        <div className="menu-wrap">
          <button ref={dotsRef} className="dots"
                  onClick={() => { if (!disabled) { setMenuOpen(v => !v); onAction("post_menu_toggle", { post_id: post.id }); } }}
                  aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Post menu" disabled={disabled}>
            <IconDots />
          </button>
          {menuOpen && (
  <div className="menu" role="menu" ref={menuRef}>
    {/* Interested (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1} title="Unavailable in this study">
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".12"/><path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Interested</span>
        <span className="mi-sub">More of your posts will be like this.</span>
      </span>
    </button>

    {/* Not interested (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1} title="Unavailable in this study">
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".12"/><path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Not interested</span>
        <span className="mi-sub">Less of your posts will be like this.</span>
      </span>
    </button>

    <div className="menu-divider" />

    {/* Save post (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 4h12v16l-6-4-6 4V4z" fill="currentColor"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Save post</span>
        <span className="mi-sub">Add this to your saved items.</span>
      </span>
    </button>

    <div className="menu-divider" />

    {/* Turn on notifications (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M18 8a6 6 0 10-12 0v5l-2 2h16l-2-2V8zM9 19a3 3 0 006 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Turn on notifications for this post</span>
      </span>
    </button>

    {/* Embed (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5L3 12l5 7M16 5l5 7-5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Embed</span>
      </span>
    </button>

    <div className="menu-divider" />

    {/* Hide post (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Hide post</span>
        <span className="mi-sub">See fewer posts like this.</span>
      </span>
    </button>

    {/* Snooze author 30 days (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Snooze {post.author} for 30 days</span>
        <span className="mi-sub">Temporarily stop seeing posts.</span>
      </span>
    </button>

    {/* Hide all from author (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Hide all from {post.author}</span>
        <span className="mi-sub">Stop seeing posts from this Page.</span>
      </span>
    </button>

    <div className="menu-divider" />

    {/* Report post (misinformation) — the ONLY active item */}
    <button
      className="menu-item"
      role="menuitem"
      tabIndex={0}
      onClick={() => { setMenuOpen(false); onAction("report_misinformation_click", { post_id: post.id }); }}
    >
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M3 5h10l1 2h7v9h-7l-1-2H3V5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Report post</span>
        <span className="mi-sub">Tell us if it is misinformation.</span>
      </span>
    </button>

    {/* Dismiss (disabled) */}
    <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
      <span className="mi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </span>
      <span className="mi-text">
        <span className="mi-title">Dismiss</span>
      </span>
    </button>
  </div>
)}
        </div>
      </header>

      <div className="card-body">
        <PostText text={post.text || ""} expanded={expanded} onExpand={onExpand} />
        {expanded && post.links?.length ? (
          <div className="link-row">
            {post.links.map((lnk, i) => (
              <a key={i} href={lnk.href}
                 onClick={(e) => { e.preventDefault(); click("link_click", { label: lnk.label, href: lnk.href }); }}
                 className="link">{lnk.label}</a>
            ))}
          </div>
        ) : null}
      </div>

      {/* image */}
      {post.image && post.imageMode !== "none" ? (
        <button className="image-btn" onClick={onImageOpen} disabled={disabled} aria-label="Open image">
          {post.image.svg ? (
            <div dangerouslySetInnerHTML={{ __html: post.image.svg.replace("<svg ", "<svg preserveAspectRatio='xMidYMid slice' style='display:block;width:100%;height:auto' ") }} />
          ) : post.image.url ? (
            <img src={post.image.url} alt={post.image.alt || ""} style={{ display:"block", width:"100%", height:"auto" }} />
          ) : null}
        </button>
      ) : null}

      {/* Interventions */}
      {showLabel && (
        <div className="info-bar info-clean">
          <div className="info-head">
            <div className="info-icon"><IconInfo /></div>
            <div className="info-title">False information</div>
          </div>
          <div className="info-sub">This is information that third-party fact-checkers say is false.</div>
          <div className="info-row">
            <div>Want to see why?</div>
            <button className="btn" onClick={() => onAction("intervention_learn_more", { post_id: post.id })}>Learn more</button>
          </div>
        </div>
      )}

      {showNote && (
        <div className="note-bar">
          <div className="note-head">
            <div className="note-icon"><IconUsers /></div>
            <div className="note-title">Third-party fact checkers added context</div>
          </div>
          <div className="note-sub">{post.noteText || ""}</div>
          <div className="note-row">
            <div>Do you find this helpful?</div>
            <button className="btn" onClick={() => onAction("note_rate_open", { post_id: post.id })}>Rate it</button>
          </div>
        </div>
      )}

      {/* Reactions summary (shows only when enabled) */}
      {showReactions && selectedReactions.length > 0 && (
        <div className="bar-stats">
          <div className="left">
            <div className="rx-stack">
              {top3.map((r, i) => (
                <span key={r.key} className="rx" style={{ zIndex: 10 - i }}>
                  {REACTION_META[r.key].emoji}
                </span>
              ))}
            </div>
            <span className="muted">{abbr(totalSelected)}</span>
          </div>
          <div className="right muted">
            {abbr(commentCount)} comments · {abbr(shareCount)} shares
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="actions">
          {/* LIKE with hover flyout (always shows ALL reactions) */}
          <div
            className="like-wrap"
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
          >
            <ActionBtn
              label={likeLabel}
              active={!!myReaction}
              onClick={onLike}
              Icon={LikeIcon}
              disabled={disabled}
            />
            {flyoutOpen && (
              <div
                className="react-flyout"
                role="menu"
                aria-label="Pick a reaction"
                onMouseEnter={scheduleOpen}
                onMouseLeave={scheduleClose}
              >
                {Object.entries(ALL_REACTIONS).map(([key, emoji]) => (
                  <button key={key} aria-label={key} onClick={() => onPickReaction(key)} title={key}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ActionBtn label="Comment" onClick={onOpenComment} Icon={IconComment} disabled={disabled} />
          <ActionBtn label="Share" onClick={onShare} Icon={IconShare} disabled={disabled} />
        </div>
      </footer>

      {showComment && (
        <Modal onClose={() => setShowComment(false)} title="Write a comment">
          <textarea className="textarea" rows={4} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write your comment..." />
          <div className="row-end">
            <button className="btn" onClick={() => { onAction("comment_cancel", { post_id: post.id }); setShowComment(false); }}>Cancel</button>
            <button className="btn primary" onClick={onSubmitComment} disabled={!commentText.trim()}>Post</button>
          </div>
        </Modal>
      )}
    </article>
  );
}

/* ------------------------------- Feed ------------------------------------- */
function Feed({ posts, registerViewRef, disabled, log, showComposer, onSubmit }) {
  return (
    <div className="page">
      {/* LEFT RAIL — decorative only */}
      <aside className="rail rail-left" aria-hidden="true" tabIndex={-1}>
        {/* Profile quick card */}
        <div className="ghost-card ghost-profile">
          <div className="ghost-avatar xl" />
          <div className="ghost-lines">
            <div className="ghost-line w-60" />
            <div className="ghost-line w-35" />
          </div>
        </div>

        {/* Main nav-ish list */}
        <div className="ghost-list">
          {["Home","AI","Friends","Events","Memories","Saved","Groups","Marketplace","Feeds","Video"].map((t,i)=>(
            <div key={i} className="ghost-item icon">
              <div className="ghost-icon" />
              <div className="ghost-line w-70" />
            </div>
          ))}
        </div>

        {/* Shortcuts */}
        <div className="ghost-title" />
        <div className="ghost-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ghost-item">
              <div className="ghost-avatar sm" />
              <div className="ghost-line w-60" />
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER FEED — unchanged */}
      <main className="container feed">
        {showComposer && (
          <div className="composer">
            <div className="composer-row">
              <div className="avatar"><img className="avatar-img" alt="" src={pravatar(5)} /></div>
              <button className="composer-btn" onClick={() => log("composer_focus")} disabled={disabled}>What’s on your mind?</button>
            </div>
            <div className="composer-actions">
              <div className="composer-chip" onClick={() => log("composer_add_photo")}>Photo</div>
              <div className="composer-chip" onClick={() => log("composer_add_event")}>Event</div>
              <div className="composer-chip" onClick={() => log("composer_add_feeling")}>Feeling</div>
            </div>
          </div>
        )}

        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAction={log} disabled={disabled} registerViewRef={registerViewRef} />
        ))}
        <div className="end">End of Feed</div>
        <div className="submit-wrap">
          <button className="btn primary btn-wide" onClick={onSubmit} disabled={disabled}>Submit</button>
        </div>
      </main>

      {/* RIGHT RAIL — decorative only */}
      <aside className="rail rail-right" aria-hidden="true" tabIndex={-1}>
        {/* Sponsored */}
        <div className="ghost-card banner" />
        <div className="ghost-card banner" />

        {/* Birthdays */}
        <div className="ghost-card box">
          <div className="ghost-line w-40" style={{marginBottom:8}} />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ghost-row">
              <div className="ghost-avatar sm" />
              <div className="ghost-lines">
                <div className="ghost-line w-70" />
                <div className="ghost-line w-45" />
              </div>
            </div>
          ))}
        </div>

        {/* Contacts */}
        <div className="ghost-card box">
          <div className="ghost-line w-35" style={{marginBottom:8}} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ghost-row">
              <div className="ghost-avatar sm online" />
              <div className="ghost-line w-60" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------- Admin: Posts CRUD UI ---------------------------- */
function AdminDashboard({
  posts, setPosts,
  randomize, setRandomize,
  showComposer, setShowComposer,
  downloadCSV, copyJSON, resetLog, participants = [], clearRoster
}) {
  const [editing, setEditing] = useState(null); // post object or null
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: uid(),
      author: "",
      time: "Just now",
      text: "",
      links: [],
      badge: false,
      avatarMode: "random",
      avatarUrl: randomAvatarUrl(),
      imageMode: "none",
      image: null,
      interventionType: "none",
      noteText: "",
      // reactions defaults (OFF)
      showReactions: false,
      selectedReactions: ["like"],
      reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      metrics: { comments: 0, shares: 0 },
    });
  };
  const openEdit = (p) => { setIsNew(false); setEditing({ ...p }); };

  const removePost = (id) => {
    if (!confirm("Delete this post?")) return;
    setPosts((arr) => arr.filter((p) => p.id !== id));
  };

  const saveEditing = () => {
    if (!editing.author?.trim()) { alert("Author is required."); return; }
    if (!editing.text?.trim()) { alert("Post text is required."); return; }

    setPosts((arr) => {
      const idx = arr.findIndex((p) => p.id === editing.id);
      const clean = { ...editing };
      if (clean.avatarMode === "random" && !clean.avatarUrl) clean.avatarUrl = randomAvatarUrl();
      if (clean.imageMode === "none") clean.image = null;
      if (clean.imageMode === "random") clean.image = randomSVG("Image");
      return idx === -1 ? [...arr, clean] : arr.map((p, i) => (i === idx ? clean : p));
    });
    setEditing(null);
  };

  const onAvatarUpload = async (file) => {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setEditing((e) => ({ ...e, avatarMode: "upload", avatarUrl: dataUrl }));
  };
  const onImageUpload = async (file) => {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setEditing((e) => ({ ...e, imageMode: "upload", image: { alt: "Image", url: dataUrl } }));
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Admin Controls</h3>

        {/* Participants roster */}
          <div className="card" style={{ padding: "1rem", marginTop: ".75rem" }}>
            <h4 style={{ marginTop: 0 }}>Participants ({participants.length})</h4>
            <div style={{ fontSize: ".9rem", color: "#6b7280", marginBottom: ".5rem" }}>
              This is the global roster captured from everyone using the same link on this browser/origin.
            </div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button className="btn" onClick={downloadCSV} disabled={!participants.length}>Download CSV</button>
              <button className="btn" onClick={copyJSON} disabled={!participants.length}>Copy JSON</button>
              <button className="btn" onClick={clearRoster} disabled={!participants.length}>Clear Roster</button>
            </div>
          </div>

        {/* Global toggles */}
        <div style={{ display: "grid", gap: ".5rem", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          <label>Composer
            <select className="select" value={String(showComposer)} onChange={(e) => setShowComposer(e.target.value === "true")}>
              <option value="true">Show</option>
              <option value="false">Hide</option>
            </select>
          </label>
          <label>Randomize feed order
            <select className="select" value={String(randomize)} onChange={(e) => setRandomize(e.target.value === "true")}>
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </label>
        </div>

        {/* Posts list */}
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0 }}>Posts ({posts.length})</h4>
          <button className="btn" onClick={openNew}>+ Add Post</button>
        </div>

        <div style={{ marginTop: ".5rem", display: "grid", gap: ".75rem" }}>
          {posts.map((p) => {
            const total = p.showReactions && p.selectedReactions?.length ? sumSelectedReactions(p.reactions, p.selectedReactions) : 0;
            const top = p.showReactions ? topReactions(p.reactions, p.selectedReactions, 3) : [];
            return (
              <div key={p.id} className="card" style={{ padding: ".75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <div className="avatar"><img className="avatar-img" alt="" src={p.avatarUrl || pravatar(7)} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.author} {p.badge && <span className="badge" style={{ marginLeft: ".25rem" }}><IconBadge /></span>}
                    </div>
                    <div className="meta">{p.time} · {p.interventionType === "label" ? "Label" : p.interventionType === "note" ? "Note" : "No intervention"}</div>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <button className="btn" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn" onClick={() => removePost(p.id)}>Delete</button>
                  </div>
                </div>
                <div style={{ marginTop: ".5rem", color: "#374151" }}>
                  {p.text.slice(0, 140)}{p.text.length > 140 ? "…" : ""}
                </div>

                {p.showReactions && p.selectedReactions?.length > 0 && total > 0 && (
                  <div style={{ marginTop: ".5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".9rem" }}>
                    <div className="rx-stack">
                      {top.map((r, i) => (
                        <span key={r.key} className="rx" style={{ zIndex: 10 - i }}>{REACTION_META[r.key].emoji}</span>
                      ))}
                      <span style={{ marginLeft: 8, color: "#6b7280" }}>{abbr(total)}</span>
                    </div>
                    <div style={{ color: "#6b7280" }}>
                      {abbr(p.metrics?.comments || 0)} comments · {abbr(p.metrics?.shares || 0)} shares
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Editor modal */}
      {editing && (
   <Modal title={isNew ? "Add Post" : "Edit Post"} onClose={() => setEditing(null)} wide footer={
    <>
      <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
      <button className="btn primary" onClick={saveEditing}>{isNew ? "Add" : "Save"}</button>
    </>
  }>

    <div className="editor-grid">
      {/* LEFT — form */}
      <div className="editor-form">
        <h4 className="section-title">Basics</h4>
        <label>Author
          <input className="input" value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
        </label>

        <div className="grid-2">
          <label>Verification badge
            <select className="select" value={String(!!editing.badge)} onChange={(e) => setEditing({ ...editing, badge: e.target.value === "true" })}>
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </label>

          <label>Time (e.g., “2h”, “Yesterday”)
            <input className="input" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} />
          </label>
        </div>

        <label>Post text
          <textarea className="textarea" rows={5} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
        </label>

        <h4 className="section-title">Profile Photo</h4>
        <fieldset className="fieldset">
          <div className="grid-2">
            <label>Mode
              <select className="select" value={editing.avatarMode}
                onChange={(e) => {
                  const m = e.target.value;
                  let url = editing.avatarUrl;
                  if (m === "random") url = randomAvatarUrl();
                  setEditing({ ...editing, avatarMode: m, avatarUrl: url });
                }}>
                <option value="random">Random avatar</option>
                <option value="upload">Upload image</option>
                <option value="url">Direct URL</option>
              </select>
            </label>
            <div className="avatar-preview">
              <div className="avatar"><img className="avatar-img" alt="" src={editing.avatarUrl || pravatar(8)} /></div>
            </div>
          </div>

          {editing.avatarMode === "url" && (
            <label>Avatar URL
              <input className="input" value={editing.avatarUrl || ""} onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value })} />
            </label>
          )}
          {editing.avatarMode === "upload" && (
            <label>Upload avatar
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const dataUrl = await fileToDataURL(f);
                setEditing((ed) => ({ ...ed, avatarMode: "upload", avatarUrl: dataUrl }));
              }} />
            </label>
          )}
        </fieldset>

        <h4 className="section-title">Post Image</h4>
        <fieldset className="fieldset">
          <label>Mode
            <select className="select" value={editing.imageMode}
              onChange={(e) => {
                const m = e.target.value;
                let image = editing.image;
                if (m === "none") image = null;
                if (m === "random") image = randomSVG("Image");
                setEditing({ ...editing, imageMode: m, image });
              }}>
              <option value="none">No image</option>
              <option value="random">Random graphic</option>
              <option value="upload">Upload image</option>
              <option value="url">Direct URL</option>
            </select>
          </label>

          {editing.imageMode === "url" && (
            <label>Image URL
              <input className="input" value={(editing.image && editing.image.url) || ""} onChange={(e) => setEditing({ ...editing, image: { ...(editing.image||{}), url: e.target.value, alt: (editing.image && editing.image.alt) || "Image" } })} />
            </label>
          )}
          {editing.imageMode === "upload" && (
            <label>Upload image
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const dataUrl = await fileToDataURL(f);
                setEditing((ed) => ({ ...ed, imageMode: "upload", image: { alt: "Image", url: dataUrl } }));
              }} />
            </label>
          )}

{(editing.imageMode === "upload" || editing.imageMode === "url") && editing.image?.url && (
  <div className="img-preview">
    <img src={editing.image.url} alt={editing.image.alt || ""} />
  </div>
)}
{editing.imageMode === "random" && editing.image?.svg && (
  <div className="img-preview">
    <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: editing.image.svg }} />
  </div>
)}
        </fieldset>

        <h4 className="section-title">Intervention</h4>
        <fieldset className="fieldset">
          <label>Type
            <select className="select" value={editing.interventionType}
              onChange={(e) => setEditing({ ...editing, interventionType: e.target.value })}>
              <option value="none">None</option>
              <option value="label">False info label</option>
              <option value="note">Context note</option>
            </select>
          </label>
          {editing.interventionType === "note" && (
            <label>Note text
              <input className="input" value={editing.noteText || ""} onChange={(e) => setEditing({ ...editing, noteText: e.target.value })} />
            </label>
          )}
        </fieldset>

        <h4 className="section-title">Reactions & Metrics</h4>
        <fieldset className="fieldset">
          <label>Show reactions
            <select
              className="select"
              value={String(!!editing.showReactions)}
              onChange={(e) => setEditing({ ...editing, showReactions: e.target.value === "true" })}
            >
              <option value="false">Hide</option>
              <option value="true">Show</option>
            </select>
          </label>

          <div className="subtle">Display these reactions</div>
          <div className="rx-pills">
            {Object.keys(REACTION_META).map((key) => {
              const checked = (editing.selectedReactions || []).includes(key);
              return (
                <label key={key} className={`pill ${checked ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const prev = new Set(editing.selectedReactions || []);
                      e.target.checked ? prev.add(key) : prev.delete(key);
                      setEditing({ ...editing, selectedReactions: Array.from(prev) });
                    }}
                  />
                  <span className="emoji">{REACTION_META[key].emoji}</span>
                  <span>{REACTION_META[key].label}</span>
                </label>
              );
            })}
          </div>

          <div className="grid-3">
            {Object.keys(REACTION_META).map((key) => (
              <label key={key}>
                {REACTION_META[key].label}
                <input
                  className="input"
                  type="number" min="0" inputMode="numeric" placeholder="0"
                  value={Number(editing.reactions?.[key] || 0) === 0 ? "" : editing.reactions?.[key]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                    setEditing((ed) => ({ ...ed, reactions: { ...(ed.reactions || {}), [key]: v } }));
                  }}
                />
              </label>
            ))}
          </div>

          <div className="grid-2">
            <label>Comments
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                value={(editing.metrics?.comments ?? 0) === 0 ? "" : editing.metrics.comments}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  setEditing((ed) => ({ ...ed, metrics: { ...(ed.metrics || {}), comments: v } }));
                }}
              />
            </label>
            <label>Shares
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                value={(editing.metrics?.shares ?? 0) === 0 ? "" : editing.metrics.shares}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  setEditing((ed) => ({ ...ed, metrics: { ...(ed.metrics || {}), shares: v } }));
                }}
              />
            </label>
          </div>
        </fieldset>

      </div>

      {/* RIGHT — live preview */}
<aside className="editor-preview">
  <div className="preview-head">Live preview</div>
  <div className="preview-zoom">
    <PostCard
      post={{
        ...editing,
        avatarUrl:
          editing.avatarMode === "random" && !editing.avatarUrl
            ? randomAvatarUrl()
            : editing.avatarUrl,
        image:
          editing.imageMode === "random"
            ? (editing.image || randomSVG("Image"))
            : editing.imageMode === "none"
            ? null
            : editing.image,
      }}
      disabled
      registerViewRef={() => () => {}}
      onAction={() => {}}
    />
  </div>
</aside>
    </div>
  </Modal>
)}
    </div>
  );
}

/* ----------------- Overlays ------------- */
function ParticipantOverlay({ onSubmit }) {
  const [tempId, setTempId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tempId.trim()) onSubmit(tempId.trim());
  };

  return (
    <div className="modal-backdrop" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }}>
      <div className="modal" style={{ maxWidth: 400, width: "100%" }}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>Enter Participant ID</h3>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <input className="input" value={tempId} onChange={(e) => setTempId(e.target.value)} placeholder="Your ID" required />
            <button type="submit" className="btn primary">Continue</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ThankYouOverlay() {
  return (
    <div className="modal-backdrop" style={{ zIndex: 100 }}>
      <div className="modal" style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="modal-body">
          <h2 style={{ marginTop: 0 }}>Thank you for your response</h2>
          <p>You may now close this window.</p>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onAuth }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === "secret123") onAuth();
    else setError("Incorrect password");
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: "400px" }}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>Admin Login</h3>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: ".75rem" }}>
            <label>Password
              <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            {error && <div style={{ color: "red", fontSize: ".85rem" }}>{error}</div>}
            <div className="row-end">
              <button className="btn primary" type="submit">Enter</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Top-level App --------------------------------- */
export default function App() {
  const sessionIdRef = useRef(uid());
  const t0Ref = useRef(now());
  const enterTsRef = useRef(null);
  const submitTsRef = useRef(null);
  const lastNonScrollTsRef = useRef(null);

  // Admin-controlled global flags
  const [randomize, setRandomize] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [hasEntered, setHasEntered] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);

  // Posts (persisted)
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem("fakebook_posts");
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return SEEDED_POSTS;
  });

  const [disabled, setDisabled] = useState(false);
  const [toast, setToast] = useState(null);
  const [events, setEvents] = useState([]);

  /* ⬇️ ADD THESE TWO RIGHT HERE ⬇️ */
  const [participants, setParticipants] = useState(() => storage.loadParticipants());

  useEffect(() => {
    // keep participants in sync if another tab writes, etc.
    const onStorage = (e) => {
      if (e.key === LS_PARTICIPANTS) {
        try { setParticipants(JSON.parse(e.newValue || "[]")); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const orderedPosts = useMemo(() => {
    const arr = posts.map(p => ({ ...p }));
    if (randomize) arr.sort(() => Math.random() - 0.5);
    return arr;
  }, [posts, randomize]);

  // Lock scrolling while any blocking overlay is shown
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
  
    const admin = typeof window !== "undefined" && window.location.hash.startsWith("#/admin");
  
    if ((!hasEntered && !admin) || submitted) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
    }
  
    return () => { el.style.overflow = prev; };
  }, [hasEntered, submitted]);


  const onAdmin = typeof window !== "undefined" && window.location.hash.startsWith("#/admin");

  // Dwell tracking data and element mapping
  const dwell = useRef(new Map());
  const viewRefs = useRef(new Map());
  const elToId = useRef(new WeakMap());
  const registerViewRef = (postId) => (el) => { if (el) { viewRefs.current.set(postId, el); elToId.current.set(el, postId); } };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1500); };

  const log = (action, meta = {}) => {
    const ts = now();
    const rec = {
      session_id: sessionIdRef.current,
      participant_id: participantId || null,
      timestamp_iso: fmtTime(ts),
      elapsed_ms: ts - t0Ref.current,
      ts_ms: ts, // raw epoch for easier math
      action,
      ...meta,
    };
    setEvents((prev) => [...prev, rec]);
    // track last non-scroll, non-submit interaction AFTER participant has entered
    if (hasEntered && action !== "scroll" && action !== "feed_submit") {
      lastNonScrollTsRef.current = ts;
    }
    if (action === "share") showToast("Post shared (recorded)");
  };

  // Session start/end
  useEffect(() => {
    log("session_start", { user_agent: navigator.userAgent });
    const onEnd = () => log("session_end", { total_events: events.length });
    window.addEventListener("beforeunload", onEnd);
    return () => window.removeEventListener("beforeunload", onEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll tracking
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dir = y > lastY ? "down" : y < lastY ? "up" : "none";
      lastY = y;
      log("scroll", { y, direction: dir });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver for dwell time
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const postId = elToId.current.get(e.target);
        if (!postId) continue;
        const prev = dwell.current.get(postId) || { visible: false, tStart: 0, total: 0 };
        if (e.isIntersecting && e.intersectionRatio > 0) {
          if (!prev.visible) {
            const next = { ...prev, visible: true, tStart: now() };
            dwell.current.set(postId, next);
            log("view_start", { post_id: postId, ratio: e.intersectionRatio });
          }
        } else if (prev.visible) {
          const dur = clamp(now() - prev.tStart, 0, 1000 * 60 * 60);
          const next = { visible: false, tStart: 0, total: prev.total + dur };
          dwell.current.set(postId, next);
          log("view_end", { post_id: postId, duration_ms: dur, total_ms: next.total });
        }
      }
    }, { root: null, rootMargin: "0px", threshold: [0, 0.2, 0.5, 0.8, 1] });

    for (const [, el] of viewRefs.current) io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedPosts]);

// compact header that works across any number of posts
function buildMinimalHeader(posts) {
  const base = [
    "session_id",
    "participant_id",
    "entered_at_iso",
    "submitted_at_iso",
    "ms_enter_to_submit",
    "ms_enter_to_last_interaction"
  ];
  const perPost = [];
  posts.forEach((p, idx) => {
    const k = `p${idx+1}`;
    perPost.push(
      `${k}_reacted`,
      `${k}_reactions`,             // comma-separated unique
      `${k}_commented`,
      `${k}_comment_texts`,         // join with " | "
      `${k}_shared`,
      `${k}_reported_misinfo`
    );
  });
  return [...base, ...perPost];
}

function fmtTimeToMs(iso) { try { return new Date(iso).getTime(); } catch { return null; } }

/** Build ONE participant row from events */
function buildParticipantRow({ session_id, participant_id, events, posts }) {
  const byAction = (name) => events.filter(e => e.action === name);
  const firstOf  = (name) => (byAction(name)[0] || null);
  const lastBefore = (name, predicate = () => true) => {
    const cutoff = firstOf(name);
    if (!cutoff) return null;
    const arr = events.filter(e =>
      fmtTimeToMs(e.timestamp_iso) <= fmtTimeToMs(cutoff.timestamp_iso) && predicate(e)
    );
    return arr.length ? arr[arr.length - 1] : null;
  };

  const entered   = firstOf("participant_id_entered");
  const submitted = firstOf("feed_submit");
  const enteredMs   = entered ? fmtTimeToMs(entered.timestamp_iso) : null;
  const submittedMs = submitted ? fmtTimeToMs(submitted.timestamp_iso) : null;
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
        ? (fmtTimeToMs(lastNonScrollPreSubmit.timestamp_iso) - enteredMs)
        : ""
  };

  posts.forEach((p, idx) => {
    const k = `p${idx+1}`;
    const postEvents = events.filter(e => e.post_id === p.id);

    const reactedTypes = new Set(
      postEvents.filter(e => e.action === "react_pick")
                .map(e => e.type || e.meta?.type || e?.label || e?.reaction || e?.emoji)
                .filter(Boolean)
    );
    const commentedTexts = postEvents
      .filter(e => e.action === "comment_submit")
      .map(e => (e.text || "").trim()).filter(Boolean);

    const shared   = postEvents.some(e => e.action === "share");
    const reported = postEvents.some(e => e.action === "report_misinformation_click");

    row[`${k}_reacted`]          = reactedTypes.size > 0 ? "1" : "0";
    row[`${k}_reactions`]        = Array.from(reactedTypes).join(",");
    row[`${k}_commented`]        = commentedTexts.length > 0 ? "1" : "0";
    row[`${k}_comment_texts`]    = commentedTexts.join(" | ");
    row[`${k}_shared`]           = shared ? "1" : "0";
    row[`${k}_reported_misinfo`] = reported ? "1" : "0";
  });

  return row;
}

  // Admin "no-track" reset
  const resetLogNoTrack = () => {
    setEvents([]);
    dwell.current = new Map();
    showToast("Event log cleared");
  };

  // if you have a reset/clear, add:
  const clearRoster = () => { storage.clearParticipants(); setParticipants([]); };

    return (
    <Router>
      {/* Wrap all app content in a shell that can blur */}
      <div className={`app-shell ${((!hasEntered && !onAdmin) || submitted) ? "blurred" : ""}`}>
        <RouteAwareTopbar />
        <Routes>
        <Route
  path="/"
  element={
    <Feed
      posts={orderedPosts}
      registerViewRef={registerViewRef}
      disabled={disabled}
      log={log}
      showComposer={showComposer}
      onSubmit={async () => {
        if (submitted || disabled) return;     // guard double-clicks
        setDisabled(true);

        const ts = now();
        submitTsRef.current = ts;

        // 1) record submit (keeps your in-memory history consistent)
        log("feed_submit");

        // 2) build a list that DEFINITELY includes the submit event
        const submitEvent = {
          session_id: sessionIdRef.current,
          participant_id: participantId || null,
          timestamp_iso: fmtTime(ts),
          elapsed_ms: ts - t0Ref.current,
          ts_ms: ts,
          action: "feed_submit",
        };
        const eventsWithSubmit = [...events, submitEvent];

        // 3) compute participant row
        const row = buildParticipantRow({
          session_id: sessionIdRef.current,
          participant_id: participantId,
          events: eventsWithSubmit,
          posts,
        });

        // 4) persist locally (always)
        storage.upsertParticipantRow(row);
        setParticipants(storage.loadParticipants());

        // 5) reflect UI state immediately
        setSubmitted(true);

        // 6) try to send to Google Sheet (best-effort)
        try {
          const ok = await sendToSheet(row, eventsWithSubmit); // uses your GS endpoint/token
          showToast(ok ? "Submitted ✔︎" : "Saved locally. Sync failed.");
        } catch {
          showToast("Saved locally. Sync failed.");
        } finally {
          setDisabled(false);
        }
      }}
    />
  }
/>
          <Route
            path="/admin"
            element={
              adminAuthed ? (
                <AdminDashboard
                  posts={posts} setPosts={setPosts}
                  randomize={randomize} setRandomize={setRandomize}
                  showComposer={showComposer} setShowComposer={setShowComposer}
                  participants={participants}
                  downloadCSV={() => {
                    const header = buildMinimalHeader(posts);
                    const csv = toCSV(participants, header);
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `fakebook_participants.csv`;
                    document.body.appendChild(a); a.click(); a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  copyJSON={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(participants, null, 2));
                      showToast("JSON copied");
                    } catch { showToast("Copy failed"); }
                  }}
                  resetLog={() => { setEvents([]); dwell.current = new Map(); showToast("Event log cleared"); }}
                  clearRoster={clearRoster}
                />
              ) : (
                <AdminLogin onAuth={() => setAdminAuthed(true)} />
              )
            }
          />
        </Routes>
        {toast && <div className="toast">{toast}</div>}
      </div>

{/* Overlays */}
{!hasEntered && !window.location.hash.startsWith("#/admin") && (
  <ParticipantOverlay
    onSubmit={(id) => {
      const ts = now();
      setParticipantId(id);
      setHasEntered(true);
      enterTsRef.current = ts;
      lastNonScrollTsRef.current = null;
      log("participant_id_entered", { id });
    }}
  />
)}
      {submitted && <ThankYouOverlay />}
    </Router>
  );
}

/* ------------------------- Lightweight top bar ----------------------------- */
function RouteAwareTopbar() {
  const location = useLocation();
  let onAdmin = location.pathname === "/admin";
  if (!onAdmin && typeof window !== "undefined") {
    onAdmin = window.location.hash.startsWith("#/admin");
  }

  return (
    <>
      <div className="nav"><div className="nav-inner"></div></div>
      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 60 }}>
        {onAdmin ? (
          <Link to="/" className="btn admin-fab" aria-label="Back to feed">↩</Link>
        ) : (
          <Link to="/admin" className="btn admin-fab" aria-label="Admin">⚙</Link>
        )}
      </div>
    </>
  );
}

/* --------------------------- helpers (admin) ------------------------------- */
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}