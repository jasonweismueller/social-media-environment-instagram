// /instagram/components-ui-core.jsx
import React from "react";
import { createPortal } from "react-dom";
import {
  // from utils/index.js (re-exports utils-core / utils-backend)
  postDisplayName,
} from "../utils";

/* ================= Icons (IG-flavored) ================= */
export function IconHeart({ filled = false, className = "", ...rest }) {
  return filled ? (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...rest}>
      <path
        d="M12 21s-7.19-4.438-9.9-8.286C.2 9.4 1.64 6 4.9 6c2.06 0 3.51 1.164 4.1 2.143C9.59 7.164 11.04 6 13.1 6c3.26 0 4.7 3.4 2.8 6.714C19.19 16.562 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...rest}>
      <path
        d="M16.5 3.75c-1.74 0-3.41.81-4.5 2.09a6.12 6.12 0 0 0-4.5-2.09A5.99 5.99 0 0 0 1.5 9.75c0 6.33 9 10.5 10.5 10.5s10.5-4.17 10.5-10.5a6 6 0 0 0-6-6Z"
        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
export function IconComment(props){ return (
  <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
    <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H12a8.7 8.7 0 0 1-3.76-.86L3 21l1.36-3.24A8.7 8.7 0 0 1 3.5 12 8.5 8.5 0 1 1 21 12Z"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)}
export function IconDM(props){ return (
  <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
    <path d="m22 3-9.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M22 3 14.5 21l-3-8-8-3L22 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
)}
export function IconBookmark({ filled=false, ...props }){
  return filled ? (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M6 3h12v18l-6-4-6 4V3z" fill="currentColor"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M6 3h12v18l-6-4-6 4V3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
export function IconDots(props){
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="19" cy="12" r="1.6" fill="currentColor"/>
    </svg>
  );
}
export const IconVolume = (p)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" {...p}>
    <path d="M4 10h3l4-3v10l-4-3H4z" fill="currentColor"/><path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" strokeWidth="1.6" fill="none"/>
  </svg>
);
export const IconVolumeMute = (p)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" {...p}>
    <path d="M4 10h3l4-3v10l-4-3H4z" fill="currentColor"/><path d="m17 9 4 6m0-6-4 6" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

/* ================ Core UI bits ================ */

export function ActionBtn({ icon, label, active=false, onClick, children, className="" }) {
  return (
    <button className={`action ${active ? "active":""} ${className}`} onClick={onClick}>
      {icon}{label && <span>{label}</span>}{children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer=null, className="" }){
  if (!open) return null;
  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose}/>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title || "dialog"}>
        {title ? <div className="modal-head"><strong>{title}</strong><button className="btn" onClick={onClose}>Close</button></div> : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </>,
    document.body
  );
}

export function NamesPeek({ names=[], more=0, title="People" }){
  if (!names?.length && !more) return null;
  return (
    <div className="names-tooltip">
      <div className="names-title">{title}</div>
      {names?.length ? (
        <ul className="names-list">
          {names.slice(0,6).map((n,i)=><li key={i}>{n}</li>)}
        </ul>
      ) : null}
      {more > 0 ? <div className="names-more">and {more} more…</div> : null}
      {!names?.length && !more ? <div className="names-empty subtle">No names available</div> : null}
    </div>
  );
}

/* IG Post text (supports “see more” clamp just like FB) */
export function PostText({ text="", clamped=true, onToggle, showSeeMore=true }) {
  if (!text) return null;
  const needsClamp = clamped && text.length > 160;
  const snippet = needsClamp ? text.slice(0,160).trim() : text;
  return (
    <div className="text-wrap">
      <div className={`text ${needsClamp ? "clamp": ""}`}>
        {snippet}{needsClamp && showSeeMore ? <>…{" "}
          <button className="see-more" onClick={onToggle}>more</button>
        </> : null}
      </div>
    </div>
  );
}

/* Avatar with IG gradient ring (when showRing=true) */
export function Avatar({ src, alt, size=40, showRing=false }) {
  const ring = showRing ? {
    background: "conic-gradient(#f58529,#feda77,#dd2a7b,#8134af,#515bd4)",
    padding: "2px", borderRadius: "999px"
  } : {};
  return (
    <div style={{ display:"inline-grid", placeItems:"center", ...ring }}>
      <img className="avatar-img" src={src} alt={alt || ""} width={size} height={size}
        style={{ borderRadius:"999px", display:"block" }}/>
    </div>
  );
}

/* Header row for an IG post */
export function IGHeader({ author, metaRight=null, onMenu }) {
  const displayName = postDisplayName(author);
  return (
    <div className="card-head">
      <div className="avatar" style={{ background:"transparent" }}>
        <Avatar src={author?.avatarUrl} alt={displayName} size={40} showRing={!!author?.storyRing}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="name-row">
          <span className="name" title={displayName}>{displayName}</span>
          {author?.verified ? <span className="badge" aria-label="Verified">✔</span> : null}
        </div>
        <div className="meta"><span className="subtle">{author?.handle || ""}</span></div>
      </div>
      {metaRight}
      <button className="dots" aria-label="Options" onClick={onMenu}><IconDots/></button>
    </div>
  );
}