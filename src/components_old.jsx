// components.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  uid,
  REACTION_META, sumSelectedReactions, topReactions, abbr,
  pravatar, randomAvatarUrl, randomSVG, fileToDataURL, toCSV,
  loadParticipantsRoster, summarizeRoster, nfCompact
} from "./utils";
import { createPortal } from "react-dom";

// --- Random Post Generator helpers ---
const RAND_NAMES = [
  "Jordan Li","Maya Patel","Samir Khan","Alex Chen","Luca Rossi",
  "Nora Williams","Priya Nair","Diego Santos","Hana Suzuki","Ava Johnson",
  "Ethan Brown","Isabella Garcia","Leo Müller","Zoe Martin","Ibrahim Ali"
];

const RAND_TIMES = ["Just now","2m","8m","23m","1h","2h","3h","Yesterday","2d","3d"];

const LOREM_SNIPPETS = [
  "This is wild—can’t believe it happened.",
  "Anyone else following this?",
  "New details emerging as we speak.",
  "Here’s what I’ve learned so far.",
  "Not saying it’s true, but interesting.",
  "Quick thread on what matters here.",
  "Posting this for discussion.",
  "Context below—make up your own mind.",
  "Sharing for visibility.",
  "Thoughts?",
  "Sources seem mixed on this.",
  "Bookmarking this for later.",
  "Some folks say this is misleading.",
  "If accurate, this is big.",
  "Adding a couple links in the comments."
];

const NOTE_SNIPPETS = [
  "Independent fact-checkers say the claim lacks supporting evidence.",
  "Multiple sources indicate the post omits key context.",
  "Experts disagree and advise caution when sharing.",
  "Additional reporting contradicts the central claim."
];

const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt  = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const chance   = (p) => Math.random() < p;
const sampleKeys = (objKeys, k) => {
  const a = [...objKeys];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
};

function makeRandomPost() {
  const author = randPick(RAND_NAMES);
  const time = randPick(RAND_TIMES);

  // 1–3 short snippets
  const text = Array.from({ length: randInt(1, 3) }, () => randPick(LOREM_SNIPPETS)).join(" ");

  // Avatar & image
  const avatarMode = "random";
  const avatarUrl = randomAvatarUrl();

  const imageMode = chance(0.55) ? "random" : "none";
  const image = imageMode === "random" ? randomSVG(randPick(["Image", "Update", "Breaking"])) : null;

  // Interventions
  const interventionType = chance(0.20) ? randPick(["label", "note"]) : "none";
  const noteText = interventionType === "note" ? randPick(NOTE_SNIPPETS) : "";

  // Reactions
  const showReactions = chance(0.85);
  const rxKeys = Object.keys(REACTION_META);
  const selectedReactions = showReactions ? sampleKeys(rxKeys, randInt(1, 3)) : ["like"];

  const baseCount = randInt(5, 120); // smallish default range
  const reactions = {
    like:  chance(0.9) ? randInt(Math.floor(baseCount*0.6), baseCount) : 0,
    love:  chance(0.5) ? randInt(0, Math.floor(baseCount*0.5)) : 0,
    care:  chance(0.25) ? randInt(0, Math.floor(baseCount*0.3)) : 0,
    haha:  chance(0.35) ? randInt(0, Math.floor(baseCount*0.4)) : 0,
    wow:   chance(0.3) ? randInt(0, Math.floor(baseCount*0.35)) : 0,
    sad:   chance(0.2) ? randInt(0, Math.floor(baseCount*0.25)) : 0,
    angry: chance(0.2) ? randInt(0, Math.floor(baseCount*0.25)) : 0,
  };

  // Metrics
  const metrics = {
    comments: chance(0.6) ? randInt(0, Math.floor(baseCount*0.5)) : 0,
    shares:   chance(0.4) ? randInt(0, Math.floor(baseCount*0.35)) : 0,
  };

  return {
    id: uid(),
    author,
    time,
    text,
    links: [],
    badge: chance(0.15),
    avatarMode,
    avatarUrl,
    imageMode,
    image,
    interventionType,
    noteText,
    showReactions,
    selectedReactions,
    reactions,
    metrics
  };
}


/* ------------------------------- Icons ------------------------------------ */
export const IconLike = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
  </svg>
);
export const IconThumb = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path d="M10.5 21H7a3 3 0 0 1-3-3v-6a3 3 0  0 1 3-3h3.5l2.7-4.9a2 2 0  0 1 3.6 1.8L16.5 9H19a3 3 0  0 1 3 3c0 .5-.1 1-.3 1.5l-2 5A3 3 0  0 1 17 21h-6.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconComment = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0  0 0 2-2V4a2 2 0  0 0-2-2z"/>
  </svg>
);
export const IconShare = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0  0 0 0-1.39l7.02-4.11A2.99 2.99 0 1 0 14 4a2.99 2.99 0  0 0 .05.53L7.03 8.64A3 3 0  1 0 7 15.36l7.02 4.11c-.03.17-.05.34-.05.53a3 3 0  0 0 3-3z"/>
  </svg>
);
export const IconDots = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...p}>
    <circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/>
  </svg>
);
export const IconLogo = (p) => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" {...p}>
    <rect width="32" height="32" rx="6" fill="#1877F2"/>
    <path d="M20 9h-2.2c-2.2 0-3.8 1.7-3.8 3.9V16H12v3h2v6h3v-6h2.5l.5-3H17v-2c0-.6.4-1 1-1h2V9z" fill="#fff"/>
  </svg>
);
export const IconInfo = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
  </svg>
);
export const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M16 11a4 4 0 1 0-3.2-6.5A4 4 0  0 0 16 11zM8 12a4 4 0 1 0-3.2-6.5A4 4 0  0 0 8 12z"/>
    <path fill="currentColor" d="M2 19a5 5 0  0 1 5-5h2a5 5 0  0 1 5 5v1H2v-1zm10 0a6.99 6.99 0  0 1 3.3-6h.7a6 6 0  0 1 6 6v1h-10v-1z"/>
  </svg>
);
export const IconBadge = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
    <path fill="#1d9bf0" d="M12 2l2.2 2.2 3.1-.3 1.2 2.9 2.9 1.2-.3 3.1L24 12l-2.2 2.2.3 3.1-2.9 1.2-1.2 2.9-3.1-.3L12 24l-2.2-2.2-3.1.3-1.2-2.9-2.9-1.2.3-3.1L0 12l2.2-2.2-.3-3.1 2.9-1.2L6 2.2l3.1.3L12 2z"/>
    <path fill="#fff" d="M10.7 15.3l-2.5-2.5 1.1-1.1 1.4 1.4 4-4 1.1 1.1-5.1 5.1z"/>
  </svg>
);
export const IconGlobe = (p) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zm0 18c-1.7 0-3.3-.5-4.6-1.4.5-.8 1-1.8 1.3-2.9h6.6c.3 1.1.8 2.1 1.3 2.9-1.3.9-2.9 1.4-4.6 1.4zm-3.8-6c-.2-.9-.2-1.9-.2-3s.1-2.1.2-3h7.6c.1.9.2 1.9.2 3s-.1 2.1-.2 3H8.2zm.5-7c.3-1.1.8-2.1 1.3-2.9C10.7 3.5 11.3 3.3 12 3.3s1.3.2 2 .8c.6.8 1.1 1.8 1.3 2.9H8.7z"/>
  </svg>
);

/* ----------------------------- Small UI bits ------------------------------- */
export function ActionBtn({ label, onClick, Icon, active, disabled, ...rest }) {
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

// --- Skeletons (freeze the backdrop while entering ID) ---
export function SkeletonFeed() {
  return (
    <div className="page">
      <aside className="rail rail-left" aria-hidden="true" tabIndex={-1}>
        <div className="ghost-card ghost-profile">
          <div className="ghost-avatar xl" />
          <div className="ghost-lines">
            <div className="ghost-line w-60" />
            <div className="ghost-line w-35" />
          </div>
        </div>
        <div className="ghost-list">
          {["Home","AI","Friends","Events","Memories","Saved","Groups","Marketplace","Feeds","Video"].map((t,i)=>(
            <div key={i} className="ghost-item icon">
              <div className="ghost-icon" />
              <div className="ghost-line w-70" />
            </div>
          ))}
        </div>
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

      <main className="container feed">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
              <div className="ghost-avatar" />
              <div className="ghost-lines" style={{ flex: 1 }}>
                <div className="ghost-line w-50" />
                <div className="ghost-line w-30" />
              </div>
            </div>
            <div className="ghost-lines" style={{ marginTop: ".75rem" }}>
              <div className="ghost-line w-90" />
              <div className="ghost-line w-95" />
              <div className="ghost-line w-70" />
            </div>
            <div className="ghost-card banner" style={{ marginTop: ".75rem", height: 160 }} />
            <div className="ghost-lines" style={{ marginTop: ".75rem" }}>
              <div className="ghost-line w-40" />
            </div>
          </div>
        ))}
        <div className="submit-wrap">
          <button className="btn primary btn-wide" disabled>Submit</button>
        </div>
      </main>

      <aside className="rail rail-right" aria-hidden="true" tabIndex={-1}>
        <div className="ghost-card banner" />
        <div className="ghost-card banner" />
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

export function PostText({ text, expanded, onExpand }) {
  const pRef = React.useRef(null);
  const [needsClamp, setNeedsClamp] = React.useState(false);

  React.useEffect(() => {
    const el = pRef.current;
    if (!el) return;

    const check = () => {
      // true if 2-line clamp actually clips content
      setNeedsClamp(el.scrollHeight > el.clientHeight + 1);
    };

    // run now (next frame so line-clamp styles applied)
    requestAnimationFrame(check);

    // respond to element size changes
    const ro = new ResizeObserver(check);
    ro.observe(el);

    // respond to viewport changes
    window.addEventListener('resize', check);

    // make sure we recalc after fonts load (affects line wraps)
    if (document.fonts?.ready) {
      document.fonts.ready.then(check).catch(() => {});
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
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

export function Modal({ title, children, onClose, wide = false, footer = null }) {
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
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ----------------------------- Post Card ---------------------------------- */
export function PostCard({ post, onAction, disabled, registerViewRef }) {
  const [reportAck, setReportAck] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const dotsRef = useRef(null);

  const ALL_REACTIONS = { like:"👍", love:"❤️", care:"🤗", haha:"😆", wow:"😮", sad:"😢", angry:"😡" };
  const [myReaction, setMyReaction] = useState(null);

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

  // Reactions visibility toggle (per post)
  const showReactions = post.showReactions ?? false;

  // All reaction keys (stable)
  const ALL_RX_KEYS = React.useMemo(() => Object.keys(REACTION_META), []);

  // Base counts from the post
  const baseReactions = React.useMemo(() => ({
    like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0,
    ...(post.reactions || {}),
  }), [post.reactions]);

  // Live counts = base + the user's current pick (+1 exactly)
  const liveReactions = React.useMemo(() => {
    const obj = { ...baseReactions };
    if (myReaction) obj[myReaction] = (obj[myReaction] || 0) + 1;
    return obj;
  }, [baseReactions, myReaction]);

  // Comments/shares local state
  const [commentCount, setCommentCount] = useState(Number(post.metrics?.comments) || 0);
  const [shareCount,   setShareCount]   = useState(Number(post.metrics?.shares) || 0);

  // Total react count across ALL types (adds +1 only once for your pick)
  const totalReactions = React.useMemo(
    () => sumSelectedReactions(liveReactions, ALL_RX_KEYS),
    [liveReactions, ALL_RX_KEYS]
  );

  // Top 3 emoji badges among types with >0
  const top3 = React.useMemo(
    () => topReactions(liveReactions, ALL_RX_KEYS, 3),
    [liveReactions, ALL_RX_KEYS]
  );

  const hasRx = showReactions && totalReactions > 0;

  const click = (action, meta = {}) => {
    if (disabled) return;
    onAction(action, { post_id: post.id, ...meta });
  };

  const onLike = () => {
    setMyReaction(prev => {
      if (prev == null) {
        click("react_pick", { type: "like", prev: null });
        return "like";
      }
      click("react_clear", { type: prev, prev });
      return null;
    });
  };

  const onPickReaction = (key) => {
    setFlyoutOpen(false);
    setMyReaction(prev => {
      if (prev === key) {
        click("react_clear", { type: key, prev });
        return null;
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


// Auto-hide after the animation completes (~2.8s)
useEffect(() => {
  if (!reportAck) return;
  const t = setTimeout(() => setReportAck(false), 2800);
  return () => clearTimeout(t);
}, [reportAck]);

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

  const LikeIcon = (p) =>
    myReaction
      ? <span style={{ fontSize: 18, lineHeight: 1 }} {...p}>{ALL_REACTIONS[myReaction]}</span>
      : <IconThumb {...p}/>;
  const likeLabel = myReaction ? (REACTION_META[myReaction]?.label || "Like") : "Like";

  return (
    <article ref={registerViewRef(post.id)} className="card">
      <header className="card-head">
        <div className="avatar">
          {post.avatarUrl ? (
            <img src={post.avatarUrl} alt="" className="avatar-img" loading="lazy" decoding="async"
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
          <button
            ref={dotsRef}
            className="dots"
            onClick={() => { if (!disabled) { setMenuOpen(v => !v); onAction("post_menu_toggle", { post_id: post.id }); } }}
            aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Post menu" disabled={disabled}
          >
            <IconDots />
          </button>

          {menuOpen && (
            <div className="menu" role="menu" ref={menuRef}>
              {/* disabled items (unchanged) */}
              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1} title="Unavailable in this study">
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".12"/><path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Interested</span><span className="mi-sub">More of your posts will be like this.</span></span>
              </button>

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1} title="Unavailable in this study">
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".12"/><path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Not interested</span><span className="mi-sub">Less of your posts will be like this.</span></span>
              </button>

              <div className="menu-divider" />

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 4h12v16l-6-4-6 4V4z" fill="currentColor"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Save post</span><span className="mi-sub">Add this to your saved items.</span></span>
              </button>

              <div className="menu-divider" />

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M18 8a6 6 0 10-12 0v5l-2 2h16l-2-2V8zM9 19a3 3 0 006 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Turn on notifications for this post</span></span>
              </button>

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5L3 12l5 7M16 5l5 7-5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Embed</span></span>
              </button>

              <div className="menu-divider" />

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Hide post</span><span className="mi-sub">See fewer posts like this.</span></span>
              </button>

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Snooze {post.author} for 30 days</span><span className="mi-sub">Temporarily stop seeing posts.</span></span>
              </button>

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Hide all from {post.author}</span><span className="mi-sub">Stop seeing posts from this Page.</span></span>
              </button>

              <div className="menu-divider" />

              {/* report — active */}
              <button
  className="menu-item"
  role="menuitem"
  tabIndex={0}
  onClick={() => {
    setMenuOpen(false);
    onAction("report_misinformation_click", { post_id: post.id });
    setReportAck(true); // ← show the toast overlay
  }}
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

              <button className="menu-item disabled" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <span className="mi-text"><span className="mi-title">Dismiss</span></span>
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

      {post.image && post.imageMode !== "none" ? (
        <button className="image-btn" onClick={onImageOpen} disabled={disabled} aria-label="Open image">
          {post.image.svg ? (
            <div dangerouslySetInnerHTML={{ __html: post.image.svg.replace("<svg ", "<svg preserveAspectRatio='xMidYMid slice' style='display:block;width:100%;height:auto' ") }} />
          ) : post.image.url ? (
            <img src={post.image.url} alt={post.image.alt || ""} style={{ display:"block", width:"100%", height:"auto" }}
            loading="lazy" decoding="async"/>
          ) : null}
        </button>
      ) : null}

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

{reportAck && (
  <div className="ack-overlay" role="status" aria-live="polite">
    <div className="ack-overlay-box">
      <span className="ack-check" aria-hidden="true">✓</span>
      <div className="ack-text">
        <strong>Thanks</strong><br />
        Your report was recorded for this study.
      </div>
    </div>
  </div>
)}

      {(() => {
        const hasComments = commentCount > 0;
        const hasShares   = shareCount > 0;
        const showStatsBar = hasRx || hasComments || hasShares;

        const rightBits = [];
        if (hasComments) rightBits.push(`${abbr(commentCount)} ${commentCount === 1 ? "comment" : "comments"}`);
        if (hasShares)   rightBits.push(`${abbr(shareCount)} ${shareCount === 1 ? "share" : "shares"}`);

        return showStatsBar ? (
          <div className="bar-stats">
            {hasRx ? (
              <div className="left">
              <div className="rx-stack">
                {top3.map((r, i) => (
                  <span key={r.key} className="rx" style={{ zIndex: 10 - i }}>
                    {REACTION_META[r.key].emoji}
                  </span>
                ))}
                <span className="muted rx-count">{abbr(totalReactions)}</span>
              </div>
            </div>
            ) : (
              <div /> // keep spacing if only right side shows
            )}

            {rightBits.length > 0 && (
              <div className="right muted">{rightBits.join(" · ")}</div>
            )}
          </div>
        ) : null;
      })()}

      <footer className="footer">
        <div className="actions">
          <div className="like-wrap" onMouseEnter={scheduleOpen} onMouseLeave={scheduleClose}>
            <ActionBtn label={likeLabel} active={!!myReaction} onClick={onLike} Icon={LikeIcon} disabled={disabled} />
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
export function Feed({ posts, registerViewRef, disabled, log, onSubmit }) {
  // Progressive reveal: paint fast, then grow as user scrolls/when idle
  const STEP = 6;                  // how many to add per increment
  const FIRST_PAINT = Math.min(8, posts.length || 0); // initial render count
  const [visibleCount, setVisibleCount] = React.useState(FIRST_PAINT);

  // Grow a bit on idle so users who don't scroll still see a fuller feed
  React.useEffect(() => {
    if (!posts?.length) return;
    // rIC polyfill
    const ric = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ didTimeout:false }), 200));
    const handle = ric(() => setVisibleCount((c) => Math.min(c + STEP, posts.length)));
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(handle) : clearTimeout(handle));
  }, [posts]);

  // IntersectionObserver to add more when reaching the end
  const sentinelRef = React.useRef(null);
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisibleCount((c) => Math.min(c + STEP, posts.length));
        }
      }
    }, { root: null, rootMargin: "600px 0px 600px 0px", threshold: 0.01 });
    io.observe(el);
    return () => io.unobserve(el);
  }, [posts.length]);

  const renderPosts = React.useMemo(
    () => posts.slice(0, visibleCount),
    [posts, visibleCount]
  );

  return (
    <div className="page">
      <aside className="rail rail-left" aria-hidden="true" tabIndex={-1}>
        <div className="ghost-card ghost-profile">
          <div className="ghost-avatar xl" />
          <div className="ghost-lines">
            <div className="ghost-line w-60" />
            <div className="ghost-line w-35" />
          </div>
        </div>

        <div className="ghost-list">
          {["Home","AI","Friends","Events","Memories","Saved","Groups","Marketplace","Feeds","Video"].map((t,i)=>(
            <div key={i} className="ghost-item icon">
              <div className="ghost-icon" />
              <div className="ghost-line w-70" />
            </div>
          ))}
        </div>

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

      <main className="container feed">
        {/* Composer removed */}

        {renderPosts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onAction={log}
            disabled={disabled}
            registerViewRef={registerViewRef}
          />
        ))}

        {/* lazy-load sentinel */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* End + submit */}
        {visibleCount >= posts.length && <div className="end">End of Feed</div>}
        <div className="submit-wrap">
          <button className="btn primary btn-wide" onClick={onSubmit} disabled={disabled}>
            Submit
          </button>
        </div>
      </main>

      <aside className="rail rail-right" aria-hidden="true" tabIndex={-1}>
        <div className="ghost-card banner" />
        <div className="ghost-card banner" />

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

// --- components.jsx (add this new component) ---
function ms(n) {
  if (n == null) return "—";
  // show mm:ss for readability
  const s = Math.round(n / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function StatCard({ title, value, sub }) {
  return (
    <div className="card" style={{ padding: ".75rem 1rem" }}>
      <div style={{ fontSize: ".8rem", color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: ".8rem", color: "#6b7280", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ParticipantsPanel() {
  const CACHE_KEY = "fb_participants_cache_v1";

  const [rows, setRows] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [pageSize, setPageSize] = React.useState(25);
  const [showPerPost, setShowPerPost] = React.useState(false);
  const abortRef = React.useRef(null);

  // ------------ cache helpers ------------
  const saveCache = React.useCallback((data) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), rows: data })); } catch {}
  }, []);
  const readCache = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.rows)) return null;
      return parsed;
    } catch { return null; }
  }, []);

  const computeSummaryIdle = React.useCallback((data) => {
    const run = () => {
      React.startTransition(() => {
        try { setSummary(summarizeRoster(data)); } catch {}
      });
    };
    (window.requestIdleCallback || ((fn)=>setTimeout(fn,0)))(run);
  }, []);

  // ------------ initial paint from cache + background refresh ------------
  React.useEffect(() => {
    const cached = readCache();
    if (cached?.rows?.length) {
      setRows(cached.rows);
      setLoading(false);
      computeSummaryIdle(cached.rows);
    }
    refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------ fetch (abortable) ------------
  const refresh = React.useCallback(async (silent = false) => {
    setError("");
    if (!silent) setLoading(true);

    // abort any in-flight
    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Call util with {signal} if it supports it; otherwise fall back
      let data;
      try {
        data = await loadParticipantsRoster({ signal: ctrl.signal });
      } catch {
        if (ctrl.signal.aborted) return;
        data = await loadParticipantsRoster(); // fallback signature
      }
      if (ctrl.signal.aborted) return;

      if (Array.isArray(data)) {
        setRows(data);
        computeSummaryIdle(data);
        saveCache(data);
      } else {
        setError("Unexpected response.");
      }
    } catch (e) {
      if (e?.name !== "AbortError") setError("Failed to load participants");
    } finally {
      if (!silent) setLoading(false);
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [computeSummaryIdle, saveCache]);

  // ------------ derived ------------
  const totalRows = rows?.length || 0;

  const sorted = React.useMemo(() => {
    if (!rows?.length) return [];
    const timeKey = "submitted_at_iso";
    const a = [...rows];
    a.sort((x, y) => String(y[timeKey]).localeCompare(String(x[timeKey])));
    return a;
  }, [rows]);

  const visible = React.useMemo(() => sorted.slice(0, pageSize), [sorted, pageSize]);

  const perPostList = React.useMemo(() => {
    if (!showPerPost || !summary?.perPost) return [];
    return Object.entries(summary.perPost).map(([id, agg]) => ({
      id, reacted: agg.reacted, commented: agg.commented, shared: agg.shared, reported: agg.reported
    }));
  }, [showPerPost, summary]);

  // ------------ render ------------
  if (loading && !rows?.length) {
    return <div className="card" style={{ padding: "1rem" }}>Loading participants…</div>;
  }
  if (error && !rows?.length) {
    return <div className="card" style={{ padding: "1rem", color: "crimson" }}>{error}</div>;
  }

  const counts = summary?.counts || { total: totalRows, completed: 0, completionRate: 0 };
  const timing = summary?.timing || { avgEnterToSubmit: null, medEnterToSubmit: null, avgEnterToLastInteraction: null, medEnterToLastInteraction: null };

  return (
    <div className="card" style={{ padding: "1rem" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0 }}>Participants ({nfCompact.format(counts.total)})</h4>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => refresh(false)}>Refresh</button>
          <button
            className="btn"
            onClick={() => {
              if (!rows?.length) return;
              const header = Object.keys(rows[0]);
              const csv = toCSV(rows, header);
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "fakebook_participants.csv";
              document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            }}
            disabled={!rows?.length}
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: ".5rem", marginTop: ".75rem" }}>
        <StatCard title="Total" value={nfCompact.format(counts.total)} />
        <StatCard title="Completed" value={nfCompact.format(counts.completed)} sub={`${(counts.completionRate*100).toFixed(1)}% completion`} />
        <StatCard title="Avg time to submit" value={ms(timing.avgEnterToSubmit)} />
        <StatCard title="Median time to submit" value={ms(timing.medEnterToSubmit)} />
        <StatCard title="Avg last interaction" value={ms(timing.avgEnterToLastInteraction)} />
        <StatCard title="Median last interaction" value={ms(timing.medEnterToLastInteraction)} />
      </div>

      {/* per-post (opt-in) */}
      <div style={{ marginTop: "1rem" }}>
        <button className="btn ghost" onClick={() => setShowPerPost(v => !v)}>
          {showPerPost ? "Hide per-post interactions" : "Show per-post interactions"}
        </button>
      </div>

      {showPerPost && perPostList.length > 0 && (
        <div style={{ marginTop: ".5rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left", padding: ".4rem .25rem" }}>Post ID</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Reacted</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Commented</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Shared</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Reported</th>
              </tr>
            </thead>
            <tbody>
              {perPostList.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: ".35rem .25rem", fontFamily: "monospace" }}>{p.id}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.reacted)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.commented)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.shared)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.reported)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* latest submissions (paged) */}
      <h5 style={{ margin: "1rem 0 .5rem" }}>Latest submissions</h5>
      {visible.length === 0 ? (
        <div className="subtle" style={{ padding: ".5rem 0" }}>No submissions yet.</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: ".9rem" }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left", padding: ".4rem .25rem" }}>Participant</th>
                <th style={{ textAlign: "left", padding: ".4rem .25rem" }}>Submitted At</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Time to Submit</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.session_id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: ".35rem .25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.participant_id || "—"}
                  </td>
                  <td style={{ padding: ".35rem .25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.submitted_at_iso || "—"}
                  </td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>
                    {Number.isFinite(Number(r.ms_enter_to_submit)) ? ms(Number(r.ms_enter_to_submit)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visible.length < sorted.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: ".5rem" }}>
              <button className="btn" onClick={() => setPageSize(s => Math.min(s + 25, sorted.length))}>
                Show more
              </button>
            </div>
          )}
        </>
      )}

      {/* footer: status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".5rem" }}>
        {error ? <div style={{ color: "crimson", fontSize: ".85rem" }}>{error}</div> : <span />}
        {loading && <div className="subtle" style={{ fontSize: ".85rem" }}>Refreshing…</div>}
      </div>
    </div>
  );
}
/* ------------------------- Admin: Posts CRUD UI (refined) ------------------ */
function Section({ title, subtitle, right = null, children }) {
  return (
    <section className="card" style={{ padding: "1rem" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: ".75rem", flexWrap: "wrap", marginBottom: ".5rem"
      }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle && <div className="subtle" style={{ marginTop: 4 }}>{subtitle}</div>}
        </div>
        {!!right && <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>{right}</div>}
      </div>
      {children}
    </section>
  );
}

function ChipToggle({ label, checked, onChange }) {
  return (
    <button
      className={`btn ghost ${checked ? "active" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{ borderRadius: 999, padding: ".35rem .7rem" }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8, height: 8, borderRadius: "50%",
          marginRight: 8,
          background: checked ? "var(--accent, #2563eb)" : "var(--line)"
        }}
      />
      {label}
    </button>
  );
}

export function AdminDashboard({
  posts, setPosts,
  randomize, setRandomize,
  showComposer, setShowComposer, // ← no longer surfaced in UI, kept only for API compat
  resetLog,
  onPublishPosts
}) {
  const [editing, setEditing] = useState(null);
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

  // --- Layout: two-column grid on wide screens, one column on small ---
  return (
    <div className="admin-shell" style={{ display: "grid", gap: "1rem" }}>
      {/* Header / Actions */}
      <Section
        title="Admin Dashboard"
        subtitle="Manage the study feed and review participation analytics."
        right={
          <>
            <button
              className="btn"
              onClick={() => {
                const p = makeRandomPost();
                setIsNew(true);
                setEditing(p);
              }}
              title="Generate a synthetic post with random content, reactions, and optional image/intervention"
            >
              + Random Post
            </button>
            <button
              className="btn primary"
              onClick={() => onPublishPosts(posts)}
              title="Save the current feed to backend"
            >
              Save Feed
            </button>
            <button
              className="btn"
              onClick={async () => {
                const { loadPostsFromBackend } = await import("./utils");
                const fresh = await loadPostsFromBackend();
                if (fresh) setPosts(fresh);
              }}
              title="Reload posts from backend"
            >
              Refresh Posts
            </button>
          </>
        }
      >
        {/* Optional: brief blurb or changelog could go here */}
      </Section>

      {/* Main grid: Participants (left) & Posts (right) */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(0,1fr)",
        }}
        className="admin-grid"
      >
        {/* Participants analytics panel */}
        <Section title="Participants" subtitle="Live snapshot & interaction aggregates.">
          <ParticipantsPanel />
        </Section>

        {/* Posts management */}
        <Section
          title={`Posts (${posts.length})`}
          subtitle="Curate and publish the canonical feed shown to participants."
          right={
            <>
              {/* Modern compact “options” area */}
              <ChipToggle
                label="Randomize feed order"
                checked={!!randomize}
                onChange={setRandomize}
              />
              <button className="btn ghost" onClick={openNew}>+ Add Post</button>
            </>
          }
        >
          <div style={{ display: "grid", gap: ".75rem" }}>
            {posts.map((p) => {
              const showRx = p.showReactions && p.selectedReactions?.length;
              const total = showRx ? sumSelectedReactions(p.reactions, p.selectedReactions) : 0;
              const top = showRx ? topReactions(p.reactions, p.selectedReactions, 3) : [];

              return (
                <div key={p.id} className="card" style={{ padding: ".85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <div className="avatar"><img className="avatar-img" alt="" src={p.avatarUrl || pravatar(7)} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.author}
                        </div>
                        {p.badge && <span className="badge" aria-label="verified" />}
                        <span className="subtle">· {p.time}</span>
                      </div>
                      <div className="subtle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.interventionType === "label" ? "False info label" : p.interventionType === "note" ? "Context note" : "No intervention"}
                        {" · "}
                        <span style={{ fontFamily: "monospace" }}>{p.id}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <button className="btn ghost" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn ghost danger" onClick={() => removePost(p.id)}>Delete</button>
                    </div>
                  </div>

                  <div style={{ marginTop: ".5rem", color: "#374151" }}>
                    {p.text.slice(0, 180)}{p.text.length > 180 ? "…" : ""}
                  </div>

                  {showRx && total > 0 && (
                    <div
                      style={{
                        marginTop: ".6rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: ".9rem"
                      }}
                    >
                      <div className="rx-stack">
                        {top.map((r, i) => (
                          <span key={r.key} className="rx" style={{ zIndex: 10 - i }}>
                            {REACTION_META[r.key].emoji}
                          </span>
                        ))}
                        <span style={{ marginLeft: 8 }} className="subtle">{abbr(total)}</span>
                      </div>
                      <div className="subtle">
                        {abbr(p.metrics?.comments || 0)} comments · {abbr(p.metrics?.shares || 0)} shares
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {editing && (
        <Modal
          title={isNew ? "Add Post" : "Edit Post"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={saveEditing}>{isNew ? "Add" : "Save"}</button>
            </>
          }
        >
          <div className="editor-grid">
            {/* (editor body unchanged — your existing form) */}
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
                <label>Time
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
                    <select
                      className="select"
                      value={editing.avatarMode}
                      onChange={(e) => {
                        const m = e.target.value;
                        let url = editing.avatarUrl;
                        if (m === "random") url = randomAvatarUrl();
                        setEditing({ ...editing, avatarMode: m, avatarUrl: url });
                      }}
                    >
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const dataUrl = await fileToDataURL(f);
                        setEditing((ed) => ({ ...ed, avatarMode: "upload", avatarUrl: dataUrl }));
                      }}
                    />
                  </label>
                )}
              </fieldset>

              <h4 className="section-title">Post Image</h4>
              <fieldset className="fieldset">
                <label>Mode
                  <select
                    className="select"
                    value={editing.imageMode}
                    onChange={(e) => {
                      const m = e.target.value;
                      let image = editing.image;
                      if (m === "none") image = null;
                      if (m === "random") image = randomSVG("Image");
                      setEditing({ ...editing, imageMode: m, image });
                    }}
                  >
                    <option value="none">No image</option>
                    <option value="random">Random graphic</option>
                    <option value="upload">Upload image</option>
                    <option value="url">Direct URL</option>
                  </select>
                </label>

                {editing.imageMode === "url" && (
                  <label>Image URL
                    <input
                      className="input"
                      value={(editing.image && editing.image.url) || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          image: { ...(editing.image||{}), url: e.target.value, alt: (editing.image && editing.image.alt) || "Image" }
                        })
                      }
                    />
                  </label>
                )}
                {editing.imageMode === "upload" && (
                  <label>Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const dataUrl = await fileToDataURL(f);
                        setEditing((ed) => ({ ...ed, imageMode: "upload", image: { alt: "Image", url: dataUrl } }));
                      }}
                    />
                  </label>
                )}

                {(editing.imageMode === "upload" || editing.imageMode === "url") && editing.image?.url && (
                  <div className="img-preview"><img src={editing.image.url} alt={editing.image.alt || ""} /></div>
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

            <aside className="editor-preview">
              <div className="preview-head">Live preview</div>
              <div className="preview-zoom" style={{ pointerEvents: "auto" }}>
                <PostCard
                  key={editing.id || "preview"}
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
                  registerViewRef={() => () => {}}
                  onAction={(a, m) => console.debug("preview action:", a, m)}
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
export function ParticipantOverlay({ onSubmit }) {
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

export function LoadingOverlay({
  title = "Loading your feed…",
  subtitle = "This will only take a moment."
}) {
  return (
    <div className="modal-backdrop modal-backdrop-dim">
      <div className="modal modal-compact" style={{ textAlign: "center", paddingTop: 24 }}>
        <div className="spinner-ring" aria-hidden="true" />
        <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
        <div style={{ color: "var(--muted)", fontSize: ".95rem" }}>{subtitle}</div>
      </div>
    </div>
  );
}

export function ThankYouOverlay() {
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

export function AdminLogin({ onAuth }) {
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

/* ------------------------- Route-aware top bar ----------------------------- */
export function RouteAwareTopbar() {
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