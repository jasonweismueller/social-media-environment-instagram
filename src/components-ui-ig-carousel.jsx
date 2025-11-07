// /instagram/components-ui-ig-carousel.jsx
import React from "react";
import { IconVolume, IconVolumeMute } from "./components-ui-core";

/**
 * Instagram-style carousel:
 * - Square visual footprint by default
 * - Arrows on hover/active
 * - Dots beneath
 * - Supports images and videos (auto-pause when slide not active)
 */
export default function IGCarousel({
  items = [],                 // [{type:"image"|"video", src, thumb?, alt?, poster?}]
  active = 0,
  onChange = () => {},
  aspect = 1,                 // IG square = 1
  showDots = true,
  enableVideoControls = true,
}) {
  const [index, setIndex] = React.useState(active);
  const wrapRef = React.useRef(null);
  const videosRef = React.useRef({}); // index → HTMLVideoElement
  const [muted, setMuted] = React.useState(true);

  React.useEffect(() => { setIndex(active); }, [active]);

  React.useEffect(() => {
    // pause all non-active videos; play active if visible
    Object.entries(videosRef.current).forEach(([i, el]) => {
      if (!el) return;
      if (Number(i) === index) { /* don't autoplay here; outer logic handles */ }
      else { try { el.pause(); } catch {} }
    });
  }, [index]);

  function goto(i){
    const next = (i + items.length) % items.length;
    setIndex(next);
    onChange(next);
  }

  function setVideoRef(i, el){
    if (!el) return; videosRef.current[i] = el;
    el.muted = !!muted;
  }

  function toggleMute(){
    const nm = !muted; setMuted(nm);
    Object.values(videosRef.current).forEach(v => { if (v) v.muted = nm; });
  }

  return (
    <div className="video-wrap" ref={wrapRef} style={{ aspectRatio: `${aspect} / ${aspect}` }}>
      {/* Slides */}
      <div
        style={{
          position:"absolute", inset:0, display:"grid",
          gridTemplateColumns: `repeat(${items.length}, 100%)`,
          transform: `translateX(calc(${index} * -100%))`,
          transition: "transform .25s ease-out"
        }}
      >
        {items.map((m,i) => {
          const isActive = i === index;
          if (m.type === "video") {
            return (
              <video
                key={i}
                ref={el => setVideoRef(i, el)}
                className="video-el"
                src={m.src}
                poster={m.poster || m.thumb}
                playsInline
                controls={false}
                muted={muted}
                preload="metadata"
                onCanPlay={e => { if (isActive) try { e.currentTarget.play(); } catch {} }}
                onEnded={() => {/* stay */}}
                style={{ width:"100%", height:"100%", objectFit:"contain" }}
              />
            );
          }
          return (
            <img
              key={i}
              className="video-el"
              src={m.src}
              alt={m.alt || ""}
              draggable={false}
              style={{ width:"100%", height:"100%", objectFit:"contain" }}
            />
          );
        })}
      </div>

      {/* Controls overlay */}
      {items.length > 1 ? (
        <div className="fb-controls" style={{ opacity: 1, pointerEvents: "auto" }}>
          <button className="fb-btn" aria-label="Prev" onClick={()=>goto(index-1)}>‹</button>
          <div className="fb-spacer" />
          <button className="fb-btn" aria-label="Next" onClick={()=>goto(index+1)}>›</button>
        </div>
      ) : null}

      {/* Mute button (global for all slides) */}
      {enableVideoControls ? (
        <button className="video-mute-btn" onClick={toggleMute} aria-pressed={!muted}>
          {muted ? <IconVolumeMute/> : <IconVolume/>}
        </button>
      ) : null}

      {/* Dots */}
      {showDots && items.length > 1 ? (
        <div style={{
          position:"absolute", left:0, right:0, bottom:8, display:"flex",
          gap:6, justifyContent:"center"
        }}>
          {items.map((_,i)=>(
            <button
              key={i}
              aria-label={`Go to slide ${i+1}`}
              onClick={()=>goto(i)}
              style={{
                width:6, height:6, borderRadius:999, border:0, cursor:"pointer",
                background: i===index ? "#fff" : "rgba(255,255,255,.45)"
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}