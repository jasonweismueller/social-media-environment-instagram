// components-admin.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  REACTION_META,
  GS_ENDPOINT,
  GS_TOKEN,
  sumSelectedReactions,
  topReactions,
  abbr,
  pravatar,
  randomAvatarUrl,
  randomSVG,
  fileToDataURL,
  toCSV,
  loadParticipantsRoster,
  summarizeRoster,
  nfCompact,
  extractPerPostFromRosterRow,
  // backend helpers for feeds/default feed
  listFeedsFromBackend,            // ← NEW (use utils version)
  getDefaultFeedFromBackend,       // ← NEW
  setDefaultFeedOnBackend,         // ← NEW
} from "./utils";
import { PostCard, Modal } from "./components-ui";

// Cache
const mkCacheKey = (feedId) =>
  `fb_participants_cache_v2::${GS_ENDPOINT}::${feedId || "noid"}`;

/* -------------------- Backend helpers (feed-aware) -------------------- */
// Keep lightweight GET wrapper for posts only (feeds/default handled via utils)
async function apiGet(path, params = {}) {
  const q = new URLSearchParams({ ...(params || {}), _ts: String(Date.now()) });
  const url = `${GS_ENDPOINT}?path=${encodeURIComponent(path)}&${q}`;
  const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}
async function loadPostsForFeed(feedId) {
  if (!feedId) return [];
  try { return await apiGet("posts", { feed_id: feedId }); } catch { return []; }
}
async function publishFeedPosts(feedId, name, posts) {
  const payload = {
    token: GS_TOKEN,
    action: "publish_posts",
    feed_id: feedId,
    name: name || feedId,
    posts,
  };
  // no-cors: assume success
  await fetch(GS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

/* -------------------- Random Post Generator helpers -------------------- */
const RAND_NAMES = [
  "Jordan Li","Maya Patel","Samir Khan","Alex Chen","Luca Rossi",
  "Nora Williams","Priya Nair","Diego Santos","Hana Suzuki","Ava Johnson",
  "Ethan Brown","Isabella Garcia","Leo Müller","Zoe Martin","Ibrahim Ali"
];
const RAND_TIMES = ["Just now","2m","8m","23m","1h","2h","3h","Yesterday","2d","3d"];
const LOREM_SNIPPETS = [
  "This is wild—can’t believe it happened.","Anyone else following this?",
  "New details emerging as we speak.","Here’s what I’ve learned so far.",
  "Not saying it’s true, but interesting.","Quick thread on what matters here.",
  "Posting this for discussion.","Context below—make up your own mind.",
  "Sharing for visibility.","Thoughts?","Sources seem mixed on this.",
  "Bookmarking this for later.","Some folks say this is misleading.",
  "If accurate, this is big.","Adding a couple links in the comments."
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

export function makeRandomPost() {
  const author = randPick(RAND_NAMES);
  const time = randPick(RAND_TIMES);
  const text = Array.from({ length: randInt(1, 3) }, () => randPick(LOREM_SNIPPETS)).join(" ");

  const fixedAvatarUrl = randomAvatarUrl();

  const willHaveImage = chance(0.55);
  const fixedImage = willHaveImage ? randomSVG(randPick(["Image", "Update", "Breaking"])) : null;

  const interventionType = chance(0.20) ? randPick(["label", "note"]) : "none";
  const noteText = interventionType === "note" ? randPick(NOTE_SNIPPETS) : "";

  const showReactions = chance(0.85);
  const rxKeys = Object.keys(REACTION_META);
  const selectedReactions = showReactions ? sampleKeys(rxKeys, randInt(1, 3)) : ["like"];

  const baseCount = randInt(5, 120);
  const reactions = {
    like:  chance(0.9) ? randInt(Math.floor(baseCount*0.6), baseCount) : 0,
    love:  chance(0.5) ? randInt(0, Math.floor(baseCount*0.5)) : 0,
    care:  chance(0.25) ? randInt(0, Math.floor(baseCount*0.3)) : 0,
    haha:  chance(0.35) ? randInt(0, Math.floor(baseCount*0.4)) : 0,
    wow:   chance(0.3) ? randInt(0, Math.floor(baseCount*0.35)) : 0,
    sad:   chance(0.2) ? randInt(0, Math.floor(baseCount*0.25)) : 0,
    angry: chance(0.2) ? randInt(0, Math.floor(baseCount*0.25)) : 0,
  };
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

    avatarMode: "url",
    avatarUrl: fixedAvatarUrl,

    imageMode: willHaveImage ? "random" : "none",
    image: fixedImage,

    interventionType,
    noteText,

    showReactions,
    selectedReactions,
    reactions,
    metrics
  };
}

/* --------------------------- tiny helper + stat --------------------------- */
function ms(n) {
  if (n == null) return "—";
  const s = Math.round(n / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}
function msShort(n) {
  if (!Number.isFinite(n)) return "—";
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

/* ----------------------- Participant detail modal ------------------------- */
function ParticipantDetailModal({ open, onClose, submission }) {
  if (!open) return null;

  const header = (
    <div className="modal-head">
      <h3 style={{ margin: 0, fontWeight: 600 }}>Submission Details</h3>
      <button className="dots" aria-label="Close" onClick={onClose}>×</button>
    </div>
  );

  const perPost = submission?.perPost || [];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        {header}
        <div className="modal-body">
          <div className="subtle" style={{ marginBottom: ".5rem" }}>
            <div><strong>Participant:</strong> {submission?.participant_id || "—"}</div>
            <div><strong>Session:</strong> <span style={{ fontFamily: "monospace" }}>{submission?.session_id}</span></div>
            <div><strong>Submitted At:</strong> {submission?.submitted_at_iso || "—"}</div>
            <div><strong>Time to submit:</strong> {msShort(Number(submission?.ms_enter_to_submit))}</div>
          </div>

          {perPost.length === 0 ? (
            <div className="card" style={{ padding: "1rem" }}>No per-post interaction fields found for this submission.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ textAlign: "left",  padding: ".4rem .25rem" }}>Post ID</th>
                    <th style={{ textAlign: "center",padding: ".4rem .25rem" }}>Reacted</th>
                    <th style={{ textAlign: "center", padding: ".4rem .25rem" }}>Expandable</th>
                    <th style={{ textAlign: "center",padding: ".4rem .25rem" }}>Expanded</th>
                    <th style={{ textAlign: "left",  padding: ".4rem .25rem" }}>Reaction(s)</th>
                    <th style={{ textAlign: "center",padding: ".4rem .25rem" }}>Commented</th>
                    <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Comments</th>
                    <th style={{ textAlign: "center",padding: ".4rem .25rem" }}>Shared</th>
                    <th style={{ textAlign: "center",padding: ".4rem .25rem" }}>Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {perPost.map((p) => (
                    <tr key={p.post_id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: ".35rem .25rem", fontFamily: "monospace" }}>{p.post_id}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.reacted ? "✓" : "—"}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.expandable ? "✓" : "—"}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.expanded ? "✓" : "—"}</td>
                      <td style={{ padding: ".35rem .25rem" }}>
                        {Array.isArray(p.reaction_types)
                          ? (p.reaction_types.length ? p.reaction_types.join(", ") : "—")
                          : (p.reaction_types || "—")}
                      </td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.commented ? "✓" : "—"}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{p.comment_count ?? 0}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.shared ? "✓" : "—"}</td>
                      <td style={{ padding: ".35rem .25rem", textAlign: "center" }}>{p.reported ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Participants ------------------------------ */
function ParticipantsPanel({ feedId }) {
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [showPerPost, setShowPerPost] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSubmission, setDetailSubmission] = useState(null);

  const abortRef = useRef(null);

  const saveCache = React.useCallback((data) => {
    const key = mkCacheKey(feedId);
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), rows: data })); } catch {}
  }, [feedId]);

  const readCache = React.useCallback(() => {
    const key = mkCacheKey(feedId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.rows) ? parsed : null;
    } catch { return null; }
  }, [feedId]);

  const computeSummaryIdle = React.useCallback((data) => {
    const run = () => {
      React.startTransition(() => {
        try { setSummary(summarizeRoster(data)); } catch {}
      });
    };
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 0)))(run);
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached?.rows?.length) {
      setRows(cached.rows);
      setLoading(false);
      computeSummaryIdle(cached.rows);
    }
    refresh(!!cached?.rows?.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedId]);

  const refresh = React.useCallback(async (silent = false) => {
    setError("");
    if (!silent) setLoading(true);

    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      let data;
      try {
        data = await loadParticipantsRoster(feedId, { signal: ctrl.signal });
      } catch {
        if (ctrl.signal.aborted) return;
        data = await loadParticipantsRoster(feedId);
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
      setLoading(false);
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [feedId, computeSummaryIdle, saveCache]);

  const totalRows = rows?.length || 0;

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    const a = [...rows];
    a.sort((x, y) => String(y.submitted_at_iso).localeCompare(String(x.submitted_at_iso)));
    return a;
  }, [rows]);

  const visible = useMemo(() => sorted.slice(0, pageSize), [sorted, pageSize]);

  const perPostList = useMemo(() => {
    if (!showPerPost || !summary?.perPost) return [];
    return Object.entries(summary.perPost).map(([id, agg]) => ({
      id,
      reacted: agg.reacted,
      expandable: agg.expandable ?? 0,
      expanded: agg.expanded ?? 0,
      expandRate: agg.expandRate,
      commented: agg.commented,
      shared: agg.shared,
      reported: agg.reported,
    }));
  }, [showPerPost, summary]);

  return (
    <div className="card" style={{ padding: "1rem" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0 }}>
          Participants ({nfCompact.format(totalRows)})
          {feedId ? <span className="subtle"> · {feedId}</span> : null}
        </h4>
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
              a.href = url;
              a.download = `fakebook_participants${feedId ? `_${feedId}` : ""}.csv`;
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
        <StatCard title="Total" value={nfCompact.format(summary?.counts?.total ?? totalRows)} />
        <StatCard title="Completed" value={nfCompact.format(summary?.counts?.completed ?? 0)} sub={`${(((summary?.counts?.completionRate ?? 0) * 100).toFixed(1))}% completion`} />
        <StatCard title="Avg time to submit" value={ms(summary?.timing?.avgEnterToSubmit)} />
        <StatCard title="Median time to submit" value={ms(summary?.timing?.medEnterToSubmit)} />
        <StatCard title="Avg last interaction" value={ms(summary?.timing?.avgEnterToLastInteraction)} />
        <StatCard title="Median last interaction" value={ms(summary?.timing?.medEnterToLastInteraction)} />
      </div>

      {/* per-post aggregate toggle */}
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
                <th style={{ textAlign: "left",  padding: ".4rem .25rem" }}>Post ID</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Reacted</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Expandable</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Expanded</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Expand rate</th>
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
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.expandable)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.expanded)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>
                    {p.expandRate == null ? "—" : `${Math.round(p.expandRate * 100)}%`}
                  </td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.commented)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.shared)}</td>
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>{nfCompact.format(p.reported)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* latest submissions */}
      <h5 style={{ margin: "1rem 0 .5rem" }}>Latest submissions</h5>
      {visible.length === 0 ? (
        <div className="subtle" style={{ padding: ".5rem 0" }}>No submissions yet.</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: ".9rem" }}>
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left",  padding: ".4rem .25rem" }}>Participant</th>
                <th style={{ textAlign: "left",  padding: ".4rem .25rem" }}>Submitted At</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }}>Time to Submit</th>
                <th style={{ textAlign: "right", padding: ".4rem .25rem" }} />
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
                  <td style={{ padding: ".35rem .25rem", textAlign: "right" }}>
                    <button
                      className="btn ghost"
                      onClick={() => {
                        const perPostHash = extractPerPostFromRosterRow(r);
                        const perPost = Object.entries(perPostHash).map(([post_id, agg]) => ({
                          post_id,
                          reacted: Number(agg.reacted) === 1,
                          expandable: Number(agg.expandable) === 1,
                          expanded: Number(agg.expanded) === 1,
                          reaction_types: agg.reactions || agg.reaction_types || [],
                          commented: Number(agg.commented) === 1,
                          comment_count: Number(agg.comment_count || 0),
                          shared: Number(agg.shared) === 1,
                          reported: Number(agg.reported) === 1,
                        }));
                        setDetailSubmission({
                          session_id: r.session_id,
                          participant_id: r.participant_id ?? null,
                          submitted_at_iso: r.submitted_at_iso ?? null,
                          ms_enter_to_submit: r.ms_enter_to_submit ?? null,
                          perPost,
                        });
                        setDetailOpen(true);
                      }}
                    >
                      Details
                    </button>
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

      {/* detail modal */}
      <ParticipantDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailSubmission(null); }}
        submission={detailSubmission}
      />
    </div>
  );
}

/* ------------------------------- Sections --------------------------------- */
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

/* ----------------------------- Admin Dashboard ---------------------------- */
export function AdminDashboard({
  posts, setPosts,
  randomize, setRandomize,
  showComposer, setShowComposer,
  resetLog,
  onPublishPosts, // signature may be (posts) or (posts, {feedId, name}); extra args are ignored if unused
}) {
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);

  // Feeds UI state
  const [feeds, setFeeds] = useState([]);               // registry list
  const [feedId, setFeedId] = useState("");             // current selected feed
  const [feedName, setFeedName] = useState("");         // display name (optional)
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [defaultFeedId, setDefaultFeedId] = useState(null); // ← NEW

  // Load feed registry + backend default on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      setFeedsLoading(true);
      const [list, backendDefault] = await Promise.all([
        listFeedsFromBackend(),
        getDefaultFeedFromBackend(),
      ]);
      if (!alive) return;

      const feedsList = Array.isArray(list) ? list : [];
      setFeeds(feedsList);
      setDefaultFeedId(backendDefault || null);

      // choose default feed if present, else first, else create blank
      const chosen = feedsList.find(f => f.feed_id === backendDefault) || feedsList[0] || null;
      if (chosen) {
        setFeedId(chosen.feed_id);
        setFeedName(chosen.name || chosen.feed_id);
        const fresh = await loadPostsForFeed(chosen.feed_id);
        if (!alive) return;
        setPosts(Array.isArray(fresh) ? fresh : []);
      } else {
        setFeedId("feed_1");
        setFeedName("Feed 1");
        setPosts([]);
      }
      setFeedsLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch feed handler
  const selectFeed = async (id) => {
    const row = feeds.find(f => String(f.feed_id) === String(id));
    setFeedId(id);
    setFeedName(row?.name || id);
    const fresh = await loadPostsForFeed(id);
    setPosts(Array.isArray(fresh) ? fresh : []);
  };

  const createNewFeed = () => {
    const id = prompt("New feed ID (letters/numbers/underscores):", `feed_${(feeds.length || 0) + 1}`);
    if (!id) return;
    const name = prompt("Optional feed name (shown in admin):", id) || id;
    setFeedId(id);
    setFeedName(name);
    setPosts([]);
    // Optimistically show in dropdown (will be persisted on first Save)
    setFeeds(prev => {
      const exists = prev.some(f => String(f.feed_id) === String(id));
      return exists ? prev : [{ feed_id: id, name, checksum: "", updated_at: "" }, ...prev];
    });
  };

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
      if (clean.imageMode === "random" && !clean.image) clean.image = randomSVG("Image");
      return idx === -1 ? [...arr, clean] : arr.map((p, i) => (i === idx ? clean : p));
    });
    setEditing(null);
  };

  const clearFeed = async () => {
    if (!posts.length) return;
    if (!confirm("Delete ALL posts from this feed? This cannot be undone.")) return;
    setPosts([]);
  };

  return (
    <div className="admin-shell" style={{ display: "grid", gap: "1rem" }}>
      <Section
        title="Admin Dashboard"
        subtitle="Manage multiple feeds (conditions), set the default feed for participants, and review per-feed analytics."
        right={
          <>
            {/* Feed selector */}
            <div className="input-wrap" style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
              <label className="subtle" htmlFor="feedSelect">Feed</label>
              <select
                id="feedSelect"
                className="select"
                value={feedId}
                disabled={feedsLoading}
                onChange={(e) => selectFeed(e.target.value)}
              >
                {feeds.map(f => {
                  const isDefault = f.feed_id === defaultFeedId;
                  return (
                    <option key={f.feed_id} value={f.feed_id}>
                      {isDefault ? "⭐ " : ""}{f.name || f.feed_id}
                    </option>
                  );
                })}
                {!feeds.length && <option value={feedId}>{feedName || feedId}</option>}
              </select>
              <button className="btn ghost" onClick={createNewFeed}>+ New feed</button>
            </div>

            <button
              className="btn"
              onClick={async () => {
                const ok = await setDefaultFeedOnBackend(feedId);
                if (ok) {
                  setDefaultFeedId(feedId);
                  alert(`Set "${feedName || feedId}" as the default feed.`);
                } else {
                  alert("Failed to set default feed. Please try again.");
                }
              }}
              title="Make this the backend default feed for participants without an explicit feed_id"
            >
              Set as Default
            </button>

            <button
              className="btn primary"
              onClick={async () => {
                // Prefer parent handler if provided; pass feed context as 2nd arg
                if (typeof onPublishPosts === "function") {
                  await onPublishPosts(posts, { feedId, name: feedName });
                } else {
                  await publishFeedPosts(feedId, feedName, posts);
                }
                // Refresh registry + default + posts after publish
                const [list, backendDefault] = await Promise.all([
                  listFeedsFromBackend(),
                  getDefaultFeedFromBackend(),
                ]);
                setFeeds(Array.isArray(list) ? list : []);
                setDefaultFeedId(backendDefault || null);
                const fresh = await loadPostsForFeed(feedId);
                setPosts(Array.isArray(fresh) ? fresh : []);
              }}
              title="Save this feed to backend (participants sheet may reset if post schema changed)"
            >
              Save Feed
            </button>

            <button
              className="btn"
              onClick={async () => {
                const fresh = await loadPostsForFeed(feedId);
                if (fresh) setPosts(fresh);
              }}
              title="Reload posts for this feed from backend"
            >
              Refresh Posts
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(0,1fr)",
        }}
        className="admin-grid"
      >
        {/* Participants */}
        <Section
          title="Participants"
          subtitle={
            <>
              Live snapshot & interaction aggregates for{" "}
              <code style={{ fontSize: ".9em" }}>{feedId}</code>
              {defaultFeedId === feedId && <span className="subtle"> · default</span>}
            </>
          }
          right={null}
        >
          <ParticipantsPanel feedId={feedId} />
        </Section>

        {/* Posts */}
        <Section
          title={`Posts (${posts.length})`}
          subtitle="Curate and publish the canonical feed shown to participants."
          right={
            <>
              <ChipToggle
                label="Randomize feed order"
                checked={!!randomize}
                onChange={setRandomize}
              />
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
              <button className="btn ghost" onClick={openNew}>+ Add Post</button>

              <button
                className="btn ghost danger"
                onClick={clearFeed}
                disabled={!posts.length}
                title="Delete all posts from this feed"
              >
                Clear Feed
              </button>
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
                        const data = await fileToDataURL(f);
                        setEditing((ed) => ({ ...ed, avatarMode: "upload", avatarUrl: data }));
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
                        const data = await fileToDataURL(f);
                        setEditing((ed) => ({ ...ed, imageMode: "upload", image: { alt: "Image", url: data } }));
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