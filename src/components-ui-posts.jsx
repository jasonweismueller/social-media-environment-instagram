// /instagram/components-ui-posts.jsx
import React from "react";
import { createPortal } from "react-dom";
import {
  REACTION_META,
  sumSelectedReactions,
  topReactions,
  fakeNamesFor,
  displayTimeForPost,
} from "../utils";

import IGCarousel from "./components-ui-ig-carousel";
import {
  IGHeader,
  IconHeart,
  IconComment,
  IconDM,
  IconBookmark,
  ActionBtn,
  PostText,
  Modal,
  NamesPeek,
} from "./components-ui-core";

/* --- In-view autoplay hook (matches FB style) --- */
function useInViewAutoplay(threshold = 0.6) {
  const wrapRef = React.useRef(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        setInView(!!e?.isIntersecting && e.intersectionRatio >= threshold);
      },
      { threshold: [threshold, 0.99] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { wrapRef, inView };
}

/* ===================== IG Post Card ===================== */
function IGPostCard({
  post,
  onLike,
  onBookmark,
  onOpenComments,
  onMenu,
  onShare,
}) {
  const { wrapRef, inView } = useInViewAutoplay(0.6);
  const [clamped, setClamped] = React.useState(true);
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  // Prepare media array for carousel
  const media = (post?.media || []).map(m => {
    if (m.type === "video") return { type:"video", src:m.src, poster:m.poster, thumb:m.thumb, alt:m.alt };
    return { type:"image", src:m.src, alt:m.alt };
  });

  // Like/Bookmark state (can be controlled from parent; fall back to local)
  const [liked, setLiked] = React.useState(!!post?.liked);
  const [saved, setSaved] = React.useState(!!post?.saved);

  React.useEffect(()=>{ setLiked(!!post?.liked); }, [post?.liked]);
  React.useEffect(()=>{ setSaved(!!post?.saved); }, [post?.saved]);

  function toggleLike(){
    const next = !liked; setLiked(next);
    onLike?.(post, next);
  }
  function toggleSave(){
    const next = !saved; setSaved(next);
    onBookmark?.(post, next);
  }

  React.useEffect(()=>{
    // If a video is the active slide and inView, try play; else pause (handled by carousel)
    // The carousel already handles pausing; nothing needed here beyond future hooks.
  }, [carouselIndex, inView]);

  const rxCounts = post?.reactions || {};
  const rxTotal = sumSelectedReactions(rxCounts);
  const rxTop = topReactions(rxCounts, 3);

  // Names peek for hoverable metrics (optional)
  const [namesOpen, setNamesOpen] = React.useState(false);
  const names = React.useMemo(()=> fakeNamesFor(6), []);
  const more = Math.max(0, (post?.metrics?.likes || 0) - names.length);

  return (
    <article className="card" ref={wrapRef} data-post-id={post?.id}>
      {/* Header */}
      <IGHeader
        author={post?.author}
        onMenu={()=>onMenu?.(post)}
        metaRight={
          <div className="meta subtle">{displayTimeForPost(post)}</div>
        }
      />

      {/* Media */}
      {media?.length ? (
        <IGCarousel
          items={media}
          active={carouselIndex}
          onChange={setCarouselIndex}
          aspect={1}
          enableVideoControls
        />
      ) : null}

      {/* Actions row (IG layout) */}
      <div className="footer" style={{ borderTop: "none", paddingBottom: 0 }}>
        <div className="actions" style={{
          display:"grid",
          gridTemplateColumns:"auto auto auto 1fr auto",
          gap: ".25rem",
          alignItems:"center"
        }}>
          <ActionBtn
            className="ghost"
            icon={<IconHeart filled={liked} />}
            onClick={toggleLike}
          />
          <ActionBtn
            className="ghost"
            icon={<IconComment />}
            onClick={() => onOpenComments?.(post)}
          />
          <ActionBtn
            className="ghost"
            icon={<IconDM />}
            onClick={() => onShare?.(post)}
          />
          <span /> {/* spacer */}
          <ActionBtn
            className="ghost"
            icon={<IconBookmark filled={saved} />}
            onClick={toggleSave}
          />
        </div>
      </div>

      {/* Reactions summary (compact IG style) */}
      <div className="bar-stats" style={{ paddingTop: ".35rem" }}>
        <div className="left">
          {rxTop?.length ? (
            <span className="rx-stack" aria-hidden="true">
              {rxTop.map((k,i)=>(
                <span key={i} className="rx" title={REACTION_META[k]?.label || k}>
                  {REACTION_META[k]?.emoji || "👍"}
                </span>
              ))}
            </span>
          ) : null}
          <span className="rx-count">{rxTotal.toLocaleString()} likes</span>
        </div>
        <div className="muted">{(post?.metrics?.comments || 0).toLocaleString()} comments</div>
      </div>

      {/* Caption (inline with "more") */}
      <div className="card-body" style={{ paddingTop: ".35rem" }}>
        <PostText
          text={post?.text || ""}
          clamped={clamped}
          onToggle={() => setClamped(false)}
        />
        {/* Optional link row (hashtags, mentions) */}
        {post?.links?.length ? (
          <div className="link-row">
            {post.links.map((l,i)=>(
              <a key={i} className="link" href={l.href} target="_blank" rel="noreferrer">{l.label || l.href}</a>
            ))}
          </div>
        ) : null}
      </div>

      {/* Hover names peek demo (likes) */}
      <div className="footer" style={{ paddingTop: 0 }}>
        <div
          className="hoverable-metric metric hoverable"
          onMouseEnter={()=>setNamesOpen(true)}
          onMouseLeave={()=>setNamesOpen(false)}
          aria-expanded={namesOpen ? "true":"false"}
        >
          <span className="muted">{rxTotal.toLocaleString()} liked</span>
          {namesOpen ? <NamesPeek names={names} more={more} title="Liked by"/> : null}
        </div>
      </div>
    </article>
  );
}

/* ===================== Feed ===================== */

export default function IGFeed({
  posts = [],
  onLike = () => {},
  onBookmark = () => {},
  onOpenComments = () => {},
  onMenu = () => {},
  onShare = () => {},
}) {
  if (!posts?.length) {
    return (
      <div className="card">
        <div className="card-body">No posts yet.</div>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map((p) => (
        <IGPostCard
          key={p.id || p._id}
          post={p}
          onLike={onLike}
          onBookmark={onBookmark}
          onOpenComments={onOpenComments}
          onMenu={onMenu}
          onShare={onShare}
        />
      ))}
      <div className="end">You’re all caught up</div>
    </div>
  );
}