// components-admin-media.jsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { randomSVG, uploadFileToS3ViaSigner, uploadImageToS3 } from "./utils";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

/**
 * Square preview that lets you drag to set the image focal point (object-position).
 * Stores values as percentages (0–100).
 */
function ImageCropper({
  src,
  alt = "",
  focalX = 50,
  focalY = 50,
  onChange,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onPointerMove = useCallback((e) => {
    if (!dragging || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
    const xPct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPct = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange?.({ focalX: Math.round(xPct), focalY: Math.round(yPct) });
  }, [dragging, onChange]);

  const startDrag = useCallback((e) => {
    if (disabled) return;
    setDragging(true);
    onPointerMove(e);
    e.preventDefault();
  }, [disabled, onPointerMove]);

  const stopDrag = useCallback(() => setDragging(false), []);

  // Event listeners on document for smooth drag
  React.useEffect(() => {
    if (!dragging) return;
    const move = (ev) => onPointerMove(ev);
    const up = () => stopDrag();
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up);
    document.addEventListener("touchcancel", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", up);
    };
  }, [dragging, onPointerMove, stopDrag]);

  const objectPosition = useMemo(() => `${focalX}% ${focalY}%`, [focalX, focalY]);

  return (
    <div>
      <div
        ref={wrapRef}
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "8px 0",
          aspectRatio: "1 / 1",
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          background: "#f3f4f6",
          userSelect: "none",
          cursor: disabled ? "default" : (dragging ? "grabbing" : "grab"),
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition,
              display: "block",
            }}
            draggable={false}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#9ca3af" }}>
            No image
          </div>
        )}

        {/* Focal marker */}
        {src && (
          <div
            style={{
              position: "absolute",
              left: `calc(${focalX}% - 8px)`,
              top: `calc(${focalY}% - 8px)`,
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid white",
              background: "rgba(0,0,0,.35)",
              boxShadow: "0 0 0 2px rgba(0,0,0,.15)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        <label>
          X position
          <input
            type="range"
            min={0}
            max={100}
            value={focalX}
            onChange={(e) => onChange?.({ focalX: Number(e.target.value), focalY })}
            disabled={disabled}
          />
        </label>
        <label>
          Y position
          <input
            type="range"
            min={0}
            max={100}
            value={focalY}
            onChange={(e) => onChange?.({ focalX, focalY: Number(e.target.value) })}
            disabled={disabled}
          />
        </label>
      </div>
      <div className="subtle" style={{ marginTop: 4 }}>
        Tip: drag inside the square to reposition; sliders fine-tune.
      </div>
    </div>
  );
}

export function MediaFieldset({
  editing,
  setEditing,
  feedId,
  isNew,
  setUploadingVideo,
  setUploadingPoster,
}) {
  const imgUrl = editing.image?.url || "";
  const focalX = Number(editing.image?.focalX ?? 50);
  const focalY = Number(editing.image?.focalY ?? 50);

  return (
    <>
      <h4 className="section-title">Post Media</h4>
      <fieldset className="fieldset">
        <label>Media type
          <select
            className="select"
            value={
              editing.videoMode !== "none" ? "video"
              : (editing.imageMode !== "none" ? "image" : "none")
            }
            onChange={(e) => {
              const type = e.target.value;
              if (type === "none") {
                setEditing(ed => ({ ...ed, imageMode: "none", image: null, videoMode: "none", video: null, videoPosterUrl: "" }));
              } else if (type === "image") {
                setEditing(ed => ({
                  ...ed,
                  videoMode: "none",
                  video: null,
                  videoPosterUrl: "",
                  imageMode: (ed.imageMode === "none" ? "random" : ed.imageMode) || "random",
                  image: ed.image || { ...randomSVG("Image"), focalX: 50, focalY: 50 }
                }));
              } else if (type === "video") {
                setEditing(ed => ({
                  ...ed,
                  imageMode: "none",
                  image: null,
                  videoMode: (ed.videoMode === "none" ? "url" : ed.videoMode) || "url",
                  video: ed.video || { url: "" }
                }));
              }
            }}
          >
            <option value="none">None</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>

        {/* IMAGE controls */}
        {editing.videoMode === "none" && editing.imageMode !== "none" && (
          <>
            <div className="grid-2">
              <label>Image mode
                <select
                  className="select"
                  value={editing.imageMode}
                  onChange={(e) => {
                    const m = e.target.value;
                    let image = editing.image;
                    if (m === "none") image = null;
                    if (m === "random") image = { ...randomSVG("Image"), focalX: 50, focalY: 50 };
                    setEditing({ ...editing, imageMode: m, image });
                  }}
                >
                  <option value="random">Random graphic</option>
                  <option value="upload">Upload image</option>
                  <option value="url">Direct URL</option>
                  <option value="none">No image</option>
                </select>
              </label>
            </div>

            {editing.imageMode === "url" && (
              <label>Image URL
                <input
                  className="input"
                  value={(editing.image && editing.image.url) || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      image: {
                        ...(editing.image||{}),
                        url: e.target.value,
                        alt: (editing.image && editing.image.alt) || "Image",
                        focalX: editing.image?.focalX ?? 50,
                        focalY: editing.image?.focalY ?? 50,
                      }
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
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      // Show lightweight progress in the title
                      const setPct = (pct) => {
                        const el = document.querySelector(".modal h3, .section-title");
                        if (el && typeof pct === "number") el.textContent = `Uploading… ${pct}%`;
                      };

                      // Upload via signer (same helper used for videos/posters)
                      const { cdnUrl } = await uploadFileToS3ViaSigner({
                        file: f,
                        feedId,
                        onProgress: setPct,
                        prefix: "images",
                      });

                      const el = document.querySelector(".modal h3, .section-title");
                      if (el) el.textContent = isNew ? "Add Post" : "Edit Post";

                      // Initialize focal point to center
                      setEditing((ed) => ({
                        ...ed,
                        imageMode: "url",
                        image: { alt: "Image", url: cdnUrl, focalX: 50, focalY: 50 },
                      }));
                      alert("Image uploaded ✔");
                    } catch (err) {
                      console.error(err);
                      alert(String(err?.message || "Image upload failed."));
                    } finally {
                      e.target.value = ""; // allow re-pick
                    }
                  }}
                />
              </label>
            )}

            {/* Crop/position tool + preview (for URL mode) */}
            {editing.imageMode !== "none" && imgUrl && (
              <ImageCropper
                src={imgUrl}
                alt={editing.image?.alt || ""}
                focalX={focalX}
                focalY={focalY}
                onChange={({ focalX: x, focalY: y }) =>
                  setEditing((ed) => ({
                    ...ed,
                    image: { ...(ed.image || {}), focalX: x, focalY: y },
                  }))
                }
              />
            )}

            {/* Random SVG preview */}
            {editing.imageMode === "random" && editing.image?.svg && (
              <div
                className="img-preview"
                style={{
                  maxWidth:"100%",
                  maxHeight:"min(40vh, 360px)",
                  minHeight:120,
                  overflow:"hidden",
                  borderRadius:8,
                  background:"#f9fafb",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  padding:8
                }}
              >
                <div
                  className="svg-wrap"
                  dangerouslySetInnerHTML={{
                    __html: editing.image.svg.replace(
                      "<svg ",
                      "<svg preserveAspectRatio='xMidYMid meet' style='display:block;max-width:100%;height:auto;max-height:100%' "
                    )
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* VIDEO controls */}
        {editing.videoMode !== "none" && (
          <>
            <div className="grid-2">
              <label>Video source
                <select
                  className="select"
                  value={editing.videoMode}
                  onChange={(e) => {
                    const m = e.target.value; // "url" | "upload"
                    setEditing(ed => ({
                      ...ed,
                      videoMode: m,
                      video: m === "url" ? (ed.video || { url: "" }) : null
                    }));
                  }}
                >
                  <option value="url">Direct URL</option>
                  <option value="upload">Upload video</option>
                </select>
              </label>
              <div />
            </div>

            {editing.videoMode === "url" && (
              <label>Video URL
                <input
                  className="input"
                  placeholder="https://…/clip.mp4 (CloudFront URL)"
                  value={editing.video?.url || ""}
                  onChange={(e) =>
                    setEditing(ed => ({
                      ...ed,
                      video: { ...(ed.video || {}), url: e.target.value }
                    }))
                  }
                />
              </label>
            )}

            {editing.videoMode === "upload" && (
              <label>Upload video
                <input
                  type="file"
                  accept="video/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    try {
                      setUploadingVideo?.(true);

                      const setPct = (pct) => {
                        const el = document.querySelector(".modal h3, .section-title");
                        if (el && typeof pct === "number") el.textContent = `Uploading… ${pct}%`;
                      };

                      const { cdnUrl } = await uploadFileToS3ViaSigner({
                        file: f,
                        feedId,
                        onProgress: setPct,
                        prefix: "videos",
                      });

                      const el = document.querySelector(".modal h3, .section-title");
                      if (el) el.textContent = isNew ? "Add Post" : "Edit Post";

                      setEditing(ed => ({
                        ...ed,
                        videoMode: "url",
                        video: { url: cdnUrl },
                      }));
                      alert("Video uploaded ✔");
                    } catch (err) {
                      console.error(err);
                      alert(String(err?.message || "Video upload failed."));
                    } finally {
                      setUploadingVideo?.(false);
                      e.target.value = ""; // allow re-pick
                    }
                  }}
                />
              </label>
            )}

            <div className="grid-2">
              <label>Poster image URL (optional)
                <input
                  className="input"
                  placeholder="https://…/poster.jpg"
                  value={editing.videoPosterUrl || ""}
                  onChange={(e) => setEditing(ed => ({ ...ed, videoPosterUrl: e.target.value }))}
                />
              </label>
              <label>Upload poster (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    try {
                      setUploadingPoster?.(true);
                      const { cdnUrl } = await uploadFileToS3ViaSigner({ file: f, feedId, prefix: "posters" });
                      setEditing(ed => ({ ...ed, videoPosterUrl: cdnUrl }));
                      alert("Poster uploaded ✔");
                    } catch (err) {
                      console.error(err);
                      alert(String(err?.message || "Poster upload failed."));
                    } finally {
                      setUploadingPoster?.(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid-3">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!editing.videoAutoplayMuted}
                  onChange={(e) => setEditing(ed => ({ ...ed, videoAutoplayMuted: !!e.target.checked }))}
                /> Autoplay muted
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!editing.videoShowControls}
                  onChange={(e) => setEditing(ed => ({ ...ed, videoShowControls: !!e.target.checked }))}
                /> Show controls
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!editing.videoLoop}
                  onChange={(e) => setEditing(ed => ({ ...ed, videoLoop: !!e.target.checked }))}
                /> Loop
              </label>
            </div>
          </>
        )}
      </fieldset>
    </>
  );
}