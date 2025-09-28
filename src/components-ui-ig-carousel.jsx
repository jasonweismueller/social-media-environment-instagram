// components-ui-ig-carousel.jsx
import React from "react";

export function IGCarousel({ items = [] }) {
  const [idx, setIdx] = React.useState(0);
  const wrap = React.useRef(null);
  const hasMany = items.length > 1;

  // swipe
  React.useEffect(() => {
    const el = wrap.current; if (!el) return;
    let startX = 0, dx = 0, swiping = false;

    const onStart = (x) => { startX = x; dx = 0; swiping = true; };
    const onMove = (x) => { if (!swiping) return; dx = x - startX; };
    const onEnd = () => {
      if (!swiping) return;
      swiping = false;
      if (Math.abs(dx) > 40) {
        setIdx(i => Math.min(items.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
      }
    };

    const touchStart = (e)=> onStart(e.touches[0].clientX);
    const touchMove  = (e)=> onMove(e.touches[0].clientX);
    const touchEnd   = ()=> onEnd();
    const mouseDown  = (e)=> { onStart(e.clientX); e.preventDefault(); };
    const mouseMove  = (e)=> onMove(e.clientX);
    const mouseUp    = ()=> onEnd();
    const mouseLeave = ()=> onEnd();

    el.addEventListener("touchstart", touchStart, { passive:true });
    el.addEventListener("touchmove",  touchMove,  { passive:true });
    el.addEventListener("touchend",   touchEnd);
    el.addEventListener("mousedown",  mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup",   mouseUp);
    el.addEventListener("mouseleave", mouseLeave);

    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove",  touchMove);
      el.removeEventListener("touchend",   touchEnd);
      el.removeEventListener("mousedown",  mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup",   mouseUp);
      el.removeEventListener("mouseleave", mouseLeave);
    };
  }, [items.length]);

  // keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft")  setIdx(i => Math.max(0, i-1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(items.length-1, i+1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  return (
    <div className="igcar-wrap" ref={wrap} aria-roledescription="carousel">
      <div className="igcar-track" style={{ transform:`translateX(-${idx*100}%)` }}>
        {items.map((it, i) => (
          <div className="igcar-slide" key={i} aria-hidden={i!==idx}>
            <img className="igcar-img" src={it.url} alt={it.alt || ""} loading={i<=1 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      {hasMany && (
        <>
          <button className="igcar-arrow left"  onClick={() => setIdx(i => Math.max(0, i-1))} aria-label="Previous" />
          <button className="igcar-arrow right" onClick={() => setIdx(i => Math.min(items.length-1, i+1))} aria-label="Next" />
          <div className="igcar-dots">
            {items.map((_, i) => (
              <button key={i} className={`dot ${i===idx?"on":""}`} onClick={() => setIdx(i)} aria-label={`Slide ${i+1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}