// components-ui.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  REACTION_META, sumSelectedReactions, topReactions, abbr,
  pravatar, randomAvatarUrl, randomSVG, fakeNamesFor
} from "./utils";

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
  <svg
    viewBox="0 0 24 24"
    width="20" height="20"
    aria-hidden="true"
    style={{ display: "block", transform: "translateY(1px)" }}
    {...p}
  >
    <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0  0 0 2-2V4a2 2 0  0 0-2-2z"/>
  </svg>
);
export const IconShare = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="6" cy="12" r="2" fill="currentColor" />
    <circle cx="18" cy="6" r="2" fill="currentColor" />
    <circle cx="18" cy="18" r="2" fill="currentColor" />
    <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
    <path fill="currentColor" d="M16 11a4 4 0 1 0-3.2-6.5A4 4 0  0 0 16 11zM8 12a4 4 0  1 0-3.2-6.5A4 4 0  0 0 8 12z"/>
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
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <Icon />
      <span style={{ fontSize: ".9rem", fontWeight: 600, lineHeight: 1 }}>{label}</span>
    </button>
  );
}

// --- Skeletons for the feed ---
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

export function PostText({ text, expanded, onExpand, onClamp }) {
  const pRef = React.useRef(null);
  const [needsClamp, setNeedsClamp] = React.useState(false);
  const sentClampRef = React.useRef(false);

  React.useEffect(() => {
    const el = pRef.current;
    if (!el) return;

    const check = () => {
      const clamped = el.scrollHeight > el.clientHeight + 1;
      setNeedsClamp(clamped);
      if (clamped && !sentClampRef.current) {
        sentClampRef.current = true;
        onClamp?.();
      }
    };

    requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    if (document.fonts?.ready) document.fonts.ready.then(check).catch(() => {});
    return () => { ro.disconnect(); window.removeEventListener('resize', check); };
  }, [text, expanded, onClamp]);

  return (
    <div className="text-wrap">
      <p ref={pRef} className={`text ${!expanded ? "clamp" : ""}`}>{text}</p>
      {!expanded && needsClamp && (
        <div className="fade-more">
          <span className="dots" aria-hidden="true">…</span>
          <button
            type="button"
            className="see-more"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
          >
            See more
          </button>
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

/* ------------------------- Hover peek for names ---------------------------- */
function NamesPeek({ post, count = 0, kind, label, hideInlineLabel = false }) {
  const [open, setOpen] = React.useState(false);
  const { names, remaining } = fakeNamesFor(post.id, count, kind, 4);

  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: "relative", cursor: count ? "pointer" : "default" }}
      aria-haspopup="true"
      aria-expanded={open}
      className="hoverable-metric"
    >
      {abbr(count)}{!hideInlineLabel && ` ${label}`}
      {open && !!count && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "130%",
            right: 0,
            background: "#111827",
            color: "white",
            padding: "8px 10px",
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.25,
            boxShadow: "0 6px 24px rgba(0,0,0,.2)",
            whiteSpace: "nowrap",
            zIndex: 50,
            maxWidth: 260,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {(label || "").slice(0,1).toUpperCase() + (label || "").slice(1)}
          </div>
          {names.length ? (
            <>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {names.map((n) => (
                  <li key={n} style={{ margin: "2px 0" }}>{n}</li>
                ))}
              </ul>
              {remaining > 0 && (
                <div style={{ opacity: 0.8, marginTop: 4 }}>and {remaining} more</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.8 }}>No {label} yet</div>
          )}
        </div>
      )}
    </span>
  );
}

/* -------- neutral, gender-agnostic tiny avatar for real comment ----------- */
function neutralAvatarDataUrl(size = 28) {
  const s = size;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32">
  <defs>
    <clipPath id="r"><rect x="0" y="0" width="32" height="32" rx="16" ry="16"/></clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="32" height="32" fill="#e5e7eb"/>
    <circle cx="16" cy="12.5" r="6" fill="#9ca3af"/>
    <rect x="5" y="20" width="22" height="10" rx="5" fill="#9ca3af"/>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ----------------------------- Post Card ---------------------------------- */
export function PostCard({ post, onAction, disabled, registerViewRef, respectShowReactions = false }) {
  const [reportAck, setReportAck] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Participant comment (this session)
  const [mySubmittedComment, setMySubmittedComment] = useState(post._localMyCommentText || "");
  const [participantComments, setParticipantComments] = useState(mySubmittedComment ? 1 : 0);

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

  const showReactions = post.showReactions ?? false;
  const ALL_RX_KEYS = useMemo(() => Object.keys(REACTION_META), []);

  const baseReactions = useMemo(() => ({
    like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0,
    ...(post.reactions || {}),
  }), [post.reactions]);

  const liveReactions = useMemo(() => {
    const obj = { ...baseReactions };
    if (myReaction) obj[myReaction] = (obj[myReaction] || 0) + 1;
    return obj;
  }, [baseReactions, myReaction]);

  // --- COMMENTS: split "already there" vs participant's own
  const baseCommentCount = Number(post.metrics?.comments) || 0;
  const displayedCommentCount = baseCommentCount + participantComments;

  // Shares: base from post + 1 if participant has shared in this session
  const baseShareCount = Number(post.metrics?.shares) || 0;
  const [hasShared, setHasShared] = useState(false);
  const displayedShareCount = baseShareCount + (hasShared ? 1 : 0);

  const totalReactions = useMemo(
    () => sumSelectedReactions(liveReactions, ALL_RX_KEYS),
    [liveReactions, ALL_RX_KEYS]
  );
  const top3 = useMemo(
    () => topReactions(liveReactions, ALL_RX_KEYS, 3),
    [liveReactions, ALL_RX_KEYS]
  );

  const hasRx = respectShowReactions ? (showReactions && totalReactions > 0) : (totalReactions > 0);

  const click = (action, meta = {}) => { if (!disabled) onAction(action, { post_id: post.id, ...meta }); };

  const onLike = () => {
    setMyReaction(prev => {
      if (prev == null) { click("react_pick", { type: "like", prev: null }); return "like"; }
      click("react_clear", { type: prev, prev }); return null;
    });
  };
  const onPickReaction = (key) => {
    setFlyoutOpen(false);
    setMyReaction(prev => {
      if (prev === key) { click("react_clear", { type: key, prev }); return null; }
      click("react_pick", { type: key, prev }); return key;
    });
  };

  const onShare = () => {
    if (hasShared) return;              // prevent more than one share
    click("share");
    setHasShared(true);
  };
  const onExpand = () => { setExpanded(true); click("expand_text"); };
  const onOpenComment = () => { setShowComment(true); click("comment_open"); };

  // Keep modal open after submit so new row appears
  const onSubmitComment = () => {
    const txt = commentText.trim();
    if (!txt) return;
    click("comment_submit", { text: txt, length: txt.length });
    setMySubmittedComment(txt);
    setParticipantComments((c) => c + 1);
    setCommentText("");
  };

  const onImageOpen = () => { if (post.image) click("image_open", { alt: post.image.alt || "" }); };

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
    return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const LikeIcon = (p) =>
    myReaction ? <span style={{ fontSize: 18, lineHeight: 1 }} {...p}>{ALL_REACTIONS[myReaction]}</span> : <IconThumb {...p}/>;
  const likeLabel = myReaction ? (REACTION_META[myReaction]?.label || "Like") : "Like";

  // Participant id (avoid ?? + || mix that breaks older Babel)
  const myParticipantId =
    ((typeof window !== "undefined" && (window.SESSION?.participant_id || window.PARTICIPANT_ID)) || null) ||
    "Participant";

  /* Reaction chip with tooltip */
  function ReactionIconWithNames({ rxKey, count, z, post, idx = 0 }) {
    const [open, setOpen] = React.useState(false);
    const label = REACTION_META[rxKey]?.label || rxKey;
    const { names, remaining } = fakeNamesFor(post.id, count, rxKey, 4);

    return (
      <span
        className="rx"
        style={{
          zIndex: z,
          position: "relative",
          width: 22,
          height: 22,
          fontSize: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "999px",
          marginLeft: idx === 0 ? 0 : -2,
          cursor: count > 0 ? "pointer" : "default"
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
      >
        {REACTION_META[rxKey].emoji}
        {open && count > 0 && (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              bottom: "130%",
              right: 0,
              background: "#111827",
              color: "white",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.25,
              boxShadow: "0 6px 24px rgba(0,0,0,.2)",
              whiteSpace: "nowrap",
              zIndex: 50,
              maxWidth: 260,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
            {names.length ? (
              <>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {names.map((n) => (<li key={n} style={{ margin: "2px 0" }}>{n}</li>))}
                </ul>
                {remaining > 0 && (<div style={{ opacity: 0.8, marginTop: 4 }}>and {remaining} more</div>)}
              </>
            ) : (
              <div style={{ opacity: 0.8 }}>No {label.toLowerCase()} yet</div>
            )}
          </div>
        )}
      </span>
    );
  }

  // --- GHOST SHOW/HIDE RULES ---
  // Show ghost rails only if reactions are on AND there are already comments (before participant).
  const shouldShowGhosts = showReactions && baseCommentCount > 0;

  return (
    <article ref={registerViewRef(post.id)} className="card">
      <header className="card-head">
        <div className="avatar">
          {post.avatarUrl ? (
            <img
              src={post.avatarUrl}
              alt=""
              className="avatar-img"
              loading="lazy"
              decoding="async"
              onLoad={() => click("avatar_load")}
              onError={() => click("avatar_error")}
            />
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          <div className="name-row">
            <div className="name">{post.author}</div>
            {post.badge && <span className="badge"><IconBadge /></span>}
          </div>

          {/* Sponsored for ads; otherwise time + globe */}
          <div className="meta" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {post.adType === "ad" ? (
              <>
                <span>Sponsored</span>
                <span>·</span>
                <IconGlobe style={{ color: "var(--muted)", width: 14, height: 14, flexShrink: 0 }} />
              </>
            ) : (
              <>
                <span>{post.time || "Just now"}</span>
                <span>·</span>
                <IconGlobe style={{ color: "var(--muted)", width: 14, height: 14, flexShrink: 0 }} />
              </>
            )}
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

              {/* report — active */}
              <button
                className="menu-item"
                role="menuitem"
                tabIndex={0}
                onClick={() => {
                  setMenuOpen(false);
                  onAction("report_misinformation_click", { post_id: post.id });
                  setReportAck(true);
                }}
              >
                <span className="mi-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <line x1="7" y1="3" x2="7" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M7 4h10l-2 4 2 4H7z" fill="currentColor" />
                  </svg>
                </span>
                <span className="mi-text">
                  <span className="mi-title">Report post</span>
                  <span className="mi-sub">Tell us if it is misinformation.</span>
                </span>
              </button>

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
        <PostText text={post.text || ""} expanded={expanded} onExpand={onExpand} onClamp={() => click("text_clamped")} />
        {expanded && post.links?.length ? (
          <div className="link-row">
            {post.links.map((lnk, i) => (
              <a
                key={i}
                href={lnk.href}
                onClick={(e) => { e.preventDefault(); click("link_click", { label: lnk.label, href: lnk.href }); }}
                className="link"
              >
                {lnk.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {post.image && post.imageMode !== "none" ? (
        <button className="image-btn" onClick={onImageOpen} disabled={disabled} aria-label="Open image">
          {post.image.svg ? (
            <div
              dangerouslySetInnerHTML={{
                __html: post.image.svg.replace(
                  "<svg ",
                  "<svg preserveAspectRatio='xMidYMid slice' style='display:block;width:100%;height:auto;max-height:min(60vh,520px)' "
                )
              }}
            />
          ) : post.image.url ? (
            <img
              src={post.image.url}
              alt={post.image.alt || ""}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "min(60vh, 520px)",
                objectFit: "cover"
              }}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </button>
      ) : null}

      {/* Ad card (below image) */}
      {post.adType === "ad" && (
        <div
          className="ad-block"
          style={{
            marginTop: 0,
            padding: ".75rem",
            background: "var(--bg, #f3f4f6)",
            borderRadius: 0,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem"
          }}
        >
          <div style={{ minWidth: 0 }}>
            {post.adDomain && (
              <div className="subtle" style={{ fontSize: ".85rem", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {String(post.adDomain).toUpperCase()}
              </div>
            )}
            <div style={{ fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {post.adHeadline || "Free Shipping"}
            </div>
            <div className="subtle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {post.adSubheadline || "Premium Crystal Glass 🥃"}
            </div>
          </div>

          <button
            className="btn primary"
            style={{ borderRadius: 999, padding: ".5rem 1rem", flexShrink: 0 }}
            onClick={() => onAction?.("ad_cta_click", { post_id: post.id })}
            disabled={disabled}
          >
            {post.adButtonText || "Shop now"}
          </button>
        </div>
      )}

      {/* intervention surfaces */}
      {post.interventionType === "label" && (
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

      {post.interventionType === "note" && (
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

      {/* stats bar */}
      {(() => {
        const hasComments = displayedCommentCount > 0;
        const hasShares   = displayedShareCount > 0;
        const showStatsBar = hasRx || hasComments || hasShares;

        return showStatsBar ? (
          <div className="bar-stats">
            {hasRx ? (
              <div className="left">
                <div className="rx-stack">
                  {top3.map((r, i) => (
                    <ReactionIconWithNames
                      key={r.key}
                      rxKey={r.key}
                      count={liveReactions[r.key] || 0}
                      z={10 - i}
                      post={post}
                      idx={i}
                    />
                  ))}
                  <span className="muted rx-count" style={{ marginLeft: 8 }}>
                    <NamesPeek post={post} count={sumSelectedReactions(liveReactions, ALL_RX_KEYS)} kind="reactions" label="reactions" hideInlineLabel />
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {(hasComments || hasShares) && (
              <div className="right muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {hasComments && (<NamesPeek post={post} count={displayedCommentCount} kind="comments" label={displayedCommentCount === 1 ? "comment" : "comments"} />)}
                {hasComments && hasShares && <span aria-hidden="true">·</span>}
                {hasShares && (
  <NamesPeek
    post={post}
    count={displayedShareCount}
    kind="shares"
    label={displayedShareCount === 1 ? "share" : "shares"}
  />
)}
              </div>
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
          <ActionBtn
  label="Share"
  onClick={onShare}
  Icon={IconShare}
  active={hasShared}
  disabled={disabled || hasShared}
/>
        </div>
      </footer>

      {showComment && (
        <Modal onClose={() => setShowComment(false)} title="Write a comment">
          {/* Comments preview block:
              - Ghost rails only if shouldShowGhosts
              - Always show participant's real comment if present */}
          {(shouldShowGhosts || !!mySubmittedComment) && (
            <div
              className="ghost-comments"
              style={{
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: "1px solid var(--line)"
              }}
            >
              {shouldShowGhosts && Array.from({ length: Math.min(3, baseCommentCount) }).map((_, i) => (
                <div
                  key={`ghost-${i}`}
                  className="ghost-row"
                  style={{
                    alignItems: "flex-start",
                    gap: ".6rem",
                    marginTop: i === 0 ? 2 : 10
                  }}
                >
                  <div className="ghost-avatar sm" />
                  <div className="ghost-lines" style={{ flex: 1 }}>
                    <div className="ghost-line w-80" />
                    <div className="ghost-line w-50" />
                  </div>
                </div>
              ))}

              {!!mySubmittedComment && (
                <div
                  className="ghost-row"
                  style={{
                    alignItems: "flex-start",
                    gap: ".6rem",
                    marginTop: shouldShowGhosts ? 10 : 2
                  }}
                >
                  <img
                    src={neutralAvatarDataUrl(28)}
                    alt=""
                    width={28}
                    height={28}
                    style={{ display: "block", borderRadius: "999px", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".9rem", fontWeight: 600, lineHeight: 1.2 }}>
                      {String(myParticipantId)}
                    </div>
                    <div style={{ marginTop: 2, color: "#111827", fontSize: ".95rem", lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                      {mySubmittedComment}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Your real comment input */}
          <textarea
            className="textarea"
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write your comment..."
          />
          <div className="row-end">
            <button
              className="btn"
              onClick={() => {
                onAction("comment_cancel", { post_id: post.id });
                setShowComment(false);
              }}
            >
              Close
            </button>
            <button
              className="btn primary"
              onClick={onSubmitComment}
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}

/* ------------------------------- Feed ------------------------------------- */
export function Feed({ posts, registerViewRef, disabled, log, onSubmit }) {
  const STEP = 6;
  const FIRST_PAINT = Math.min(8, posts.length || 0);
  const [visibleCount, setVisibleCount] = useState(FIRST_PAINT);

  useEffect(() => {
    if (!posts?.length) return;
    const ric = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ didTimeout:false }), 200));
    const handle = ric(() => setVisibleCount((c) => Math.min(c + STEP, posts.length)));
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(handle) : clearTimeout(handle));
  }, [posts]);

  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setVisibleCount((c) => Math.min(c + STEP, posts.length));
    }, { root: null, rootMargin: "600px 0px 600px 0px", threshold: 0.01 });
    io.observe(el);
    return () => io.unobserve(el);
  }, [posts.length]);

  const renderPosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);

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
        {renderPosts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onAction={log}
            disabled={disabled}
            registerViewRef={registerViewRef}
          />
        ))}
        <div ref={sentinelRef} aria-hidden="true" />
        {visibleCount >= posts.length && <div className="end">End of Feed</div>}
        <div className="submit-wrap">
          <button type="button" className="btn primary btn-wide" onClick={onSubmit} disabled={disabled === true}>
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

/* ----------------- Overlays ------------- */
export function ParticipantOverlay({ onSubmit }) {
  const [tempId, setTempId] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); if (tempId.trim()) onSubmit(tempId.trim()); };
  return (
    <div className="modal-backdrop" style={{ background: "rgba(0,0,0,0.6)", zIndex: 100 }}>
      <div className="modal" style={{ maxWidth: 400, width: "100%" }}>
        <div className="modal-head"><h3 style={{ margin: 0 }}>Enter Participant ID</h3></div>
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

export function LoadingOverlay({ title = "Loading your feed…", subtitle = "This will only take a moment." }) {
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

const cx = (...cls) => cls.filter(Boolean).join(" ");

export function AdminLogin({ onAuth }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

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
            <label>Password</label>
            <div className="input-wrap">
              <input
                type={showPw ? "text" : "password"}
                className="input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
            {error && (<div style={{ color: "red", fontSize: ".85rem" }}>{error}</div>)}
            <div className="row-end">
              <button className="btn primary" type="submit">Enter</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ----------- New Top Bar -----------
export function TopRailPlaceholder() {
  return (
    <div className="top-rail-placeholder">
      <div className="trp-inner">
        <div className="trp-left">
          <div className="trp-logo"></div>
          <div className="trp-search"></div>
        </div>

        <div className="trp-center">
          <div className="trp-tab"></div>
          <div className="trp-tab"></div>
          <div className="trp-tab"></div>
        </div>

        <div className="trp-right">
          <div className="trp-btn"></div>
          <div className="trp-btn"></div>
          <div className="trp-avatar"></div>
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

  useEffect(() => {
    if (onAdmin) document.body.classList.add("admin-mode");
    else document.body.classList.remove("admin-mode");
  }, [onAdmin]);

  return (
    <>
      <TopRailPlaceholder />
      <div className="admin-fab-wrap">
        {onAdmin ? (
          <Link to="/" className="btn admin-fab" aria-label="Back to feed">↩</Link>
        ) : (
          <Link to="/admin" className="btn admin-fab" aria-label="Admin">⚙</Link>
        )}
      </div>
    </>
  );
}