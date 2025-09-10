// components-ui-posts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  REACTION_META, sumSelectedReactions, topReactions, fakeNamesFor
} from "./utils";

import {
  IconBadge, IconDots, IconGlobe, IconInfo, IconUsers,
  IconThumb, IconComment, IconShare,
  ActionBtn, PostText, Modal, NamesPeek, neutralAvatarDataUrl,
} from "./components-ui-core";

/* --- In-view autoplay hook --- */
function useInViewAutoplay(threshold = 0.6) {
  const wrapRef = React.useRef(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      ([e]) => setInView(!!(e?.isIntersecting && e.intersectionRatio >= threshold)),
      { root: null, threshold: [0, threshold, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { wrapRef, inView };
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

  // in-view detector for media
  const { wrapRef, inView } = useInViewAutoplay(0.6);

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

  // --- COMMENTS/SHARES
  const baseCommentCount = Number(post.metrics?.comments) || 0;
  const displayedCommentCount = baseCommentCount + participantComments;

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

  // 👇 Provide NamesPeek with a version of the post that always:
  // - has showReactions=true (unblocks internal gates),
  // - contains the *displayed* counts so names match what the user sees.
  const postForCounts = useMemo(() => ({
    ...post,
    showReactions: true,
    metrics: {
      ...post.metrics,
      comments: displayedCommentCount,
      shares: displayedShareCount,
      reactions: totalReactions,
    },
  }), [post, displayedCommentCount, displayedShareCount, totalReactions]);

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
    if (hasShared) return; // only once
    click("share");
    setHasShared(true);
  };
  const onExpand = () => { setExpanded(true); click("expand_text"); };
  const onOpenComment = () => { setShowComment(true); click("comment_open"); };

  // comment submit
  const onSubmitComment = () => {
    const txt = commentText.trim();
    if (!txt) return;
    click("comment_submit", { text: txt, length: txt.length });
    setMySubmittedComment(txt);
    setParticipantComments((c) => c + 1);
    setCommentText("");
  };

  // media (image/video)
  const onImageOpen = () => { if (post.image) click("image_open", { alt: post.image.alt || "" }); };

  // --- VIDEO SUPPORT
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  // default to admin flag; fallback to muted true (helps autoplay)
  const [isMuted, setIsMuted] = useState(post.videoAutoplayMuted !== false);

  const onVideoTogglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
        setIsVideoPlaying(true);
        click("video_play");
      } else {
        v.pause();
        setIsVideoPlaying(false);
        click("video_pause");
      }
    } catch { /* ignore */ }
  };
  const onVideoToggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
    click(v.muted ? "video_mute" : "video_unmute");
  };
  const onVideoEnded = () => {
    setIsVideoPlaying(false);
    click("video_ended");
  };

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

  // Participant id
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

      {/* Media: prefer video, else image */}
      {post.video && post.videoMode !== "none" ? (
        (() => {
          const u = post.video?.url || "";

          // Detect Drive URLs
          const isDrive =
            /(?:^|\/\/)(?:drive\.google\.com|drive\.usercontent\.google\.com)/i.test(u);

          // Extract Drive file ID from ?id=... or /d/<id>/
          let driveId = null;
          {
            const qMatch = /[?&]id=([a-zA-Z0-9_-]+)/.exec(u);
            const dMatch = /\/d\/([a-zA-Z0-9_-]+)/.exec(u);
            if (qMatch) driveId = qMatch[1];
            else if (dMatch) driveId = dMatch[1];
          }

          if (isDrive && driveId) {
            // Drive preview player (autoplay not guaranteed)
            return (
              <div className="video-wrap drive-embed" ref={wrapRef}>
                <iframe
                  src={`https://drive.google.com/file/d/${driveId}/preview`}
                  title="Drive video"
                  loading="lazy"
                  allow="autoplay; fullscreen"
                  style={{
                    width: "100%",
                    height: "min(60vh, 520px)",
                    border: 0,
                    display: "block",
                    background: "#000",
                  }}
                />
              </div>
            );
          }

          // Non-Drive (e.g., S3/CloudFront) → native <video> w/ in-view autoplay
          return (
            <div className="video-wrap" ref={wrapRef}>
  <video
    ref={videoRef}
    className="video-el"
    src={u}
    poster={post.videoPosterUrl || undefined}
    playsInline
    muted={isMuted}
    autoPlay={inView}
    preload="auto"
    loop={!!post.videoLoop}
    onPlay={() => setIsVideoPlaying(true)}
    onPause={() => setIsVideoPlaying(false)}
    onEnded={onVideoEnded}
    controls={!!post.videoShowControls}
    disablePictureInPicture
    controlsList="nodownload noremoteplayback"
  />
  {!post.videoShowControls && (
    <>
      <button type="button" className="video-center-btn" onClick={onVideoTogglePlay} disabled={disabled}>
        {isVideoPlaying ? "❚❚" : "▶"}
      </button>
      <button type="button" className="video-mute-btn" onClick={onVideoToggleMute} disabled={disabled}>
        {isMuted ? "🔇" : "🔊"}
      </button>
    </>
  )}
</div>
          );
        })()
      ) : post.image && post.imageMode !== "none" ? (
        <button className="image-btn" onClick={onImageOpen} disabled={disabled} aria-label="Open image">
          {post.image.svg ? (
            <div
              dangerouslySetInnerHTML={{
                __html: post.image.svg.replace(
                  "<svg ",
                  "<svg preserveAspectRatio='xMidYMid slice' style='display:block;width:100%;height:auto;max-height:min(60vh,520px)' "
                ),
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
                objectFit: "cover",
              }}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </button>
      ) : null}

      {/* Ensure programmatic in-view play/pause on inView change for native <video> */}
      {/* This effect is placed after the video markup so refs are set. */}
      <InViewVideoController inView={inView} videoRef={videoRef} setIsVideoPlaying={setIsVideoPlaying} muted={isMuted} />

      {/* Ad card */}
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
                    {/* Use postForCounts so NamesPeek sees correct counts & showReactions=true */}
                    <NamesPeek post={postForCounts} count={totalReactions} kind="reactions" label="reactions" hideInlineLabel />
                  </span>
                </div>
              </div>
            ) : <div />}

            {(hasComments || hasShares) && (
              <div className="right muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {hasComments && (
                  <NamesPeek
                    post={postForCounts}
                    count={displayedCommentCount}
                    kind="comments"
                    label={displayedCommentCount === 1 ? "comment" : "comments"}
                  />
                )}
                {hasComments && hasShares && <span aria-hidden="true">·</span>}
                {hasShares && (
                  <NamesPeek
                    post={postForCounts}
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
          <ActionBtn label="Share" onClick={onShare} Icon={IconShare} active={hasShared} disabled={disabled || hasShared} />
        </div>
      </footer>

      {showComment && (
        <Modal onClose={() => setShowComment(false)} title="Write a comment">
          {(shouldShowGhosts || !!mySubmittedComment) && (
            <div className="ghost-comments" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
              {shouldShowGhosts && Array.from({ length: Math.min(3, baseCommentCount) }).map((_, i) => (
                <div key={`ghost-${i}`} className="ghost-row" style={{ alignItems: "flex-start", gap: ".6rem", marginTop: i === 0 ? 2 : 10 }}>
                  <div className="ghost-avatar sm" />
                  <div className="ghost-lines" style={{ flex: 1 }}>
                    <div className="ghost-line w-80" />
                    <div className="ghost-line w-50" />
                  </div>
                </div>
              ))}

              {!!mySubmittedComment && (
                <div className="ghost-row" style={{ alignItems: "flex-start", gap: ".6rem", marginTop: shouldShowGhosts ? 10 : 2 }}>
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

          <textarea
            className="textarea"
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write your comment..."
          />
          <div className="row-end">
            <button className="btn" onClick={() => { onAction("comment_cancel", { post_id: post.id }); setShowComment(false); }}>
              Close
            </button>
            <button className="btn primary" onClick={onSubmitComment} disabled={!commentText.trim()}>
              Post
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}

/* Programmatic in-view play/pause for native <video> */
function InViewVideoController({ inView, videoRef, setIsVideoPlaying, muted }) {
  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    try {
      if (inView) {
        v.muted = muted !== false; // keep muted true unless explicitly false
        v.play().then(() => setIsVideoPlaying(true)).catch(() => {});
      } else {
        v.pause();
        setIsVideoPlaying(false);
      }
    } catch { /* ignore */ }
  }, [inView, videoRef, setIsVideoPlaying, muted]);

  return null;
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
      {/* left rail skeletons, same as before */}
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

      {/* right rail skeletons, same as before */}
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