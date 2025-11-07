// /instagram/App.jsx
import React, { useEffect, useState } from "react";
import IGFeed from "./components-ui-posts";
import {
  listProjectsFromBackend,
  listFeedsFromBackend,
  getDefaultProjectFromBackend,
  getDefaultFeedFromBackend,
  loadPostsFromBackend,
  startSessionWatch,
  touchAdminSession,
} from "../utils"; // shared utils folder
import "../styles.css"; // merged stylesheet

export default function App() {
  const [projects, setProjects] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentFeed, setCurrentFeed] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blurred, setBlurred] = useState(false);

  // --- Admin session monitor (same as FB) ---
  useEffect(() => {
    const stop = startSessionWatch((secLeft) => {
      if (secLeft <= 0) setBlurred(true);
      else setBlurred(false);
    });
    const tick = setInterval(() => touchAdminSession(), 30000);
    return () => {
      stop?.();
      clearInterval(tick);
    };
  }, []);

  // --- Load projects + feeds from backend ---
  useEffect(() => {
    async function init() {
      try {
        const [projList, defaultProj] = await Promise.all([
          listProjectsFromBackend(),
          getDefaultProjectFromBackend(),
        ]);
        setProjects(projList || []);
        setCurrentProject(defaultProj || projList?.[0] || null);
      } catch (e) {
        console.error("Error loading projects:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!currentProject) return;
    async function loadFeeds() {
      try {
        const [feedList, defaultFeed] = await Promise.all([
          listFeedsFromBackend(currentProject.id),
          getDefaultFeedFromBackend(currentProject.id),
        ]);
        setFeeds(feedList || []);
        setCurrentFeed(defaultFeed || feedList?.[0] || null);
      } catch (e) {
        console.error("Error loading feeds:", e);
      }
    }
    loadFeeds();
  }, [currentProject]);

  // --- Load posts ---
  useEffect(() => {
    if (!currentProject || !currentFeed) return;
    setLoading(true);
    loadPostsFromBackend(currentProject.id, currentFeed.id)
      .then((res) => setPosts(res || []))
      .catch((e) => console.error("Error loading posts:", e))
      .finally(() => setLoading(false));
  }, [currentProject, currentFeed]);

  return (
    <div className={`app-shell ${blurred ? "blurred" : ""}`}>
      <div className="page">
        <div className="container feed">
          {loading ? (
            <div className="card">
              <div className="card-body">Loading Instagram posts…</div>
            </div>
          ) : (
            <IGFeed
              posts={posts}
              onLike={(p, liked) => console.log("like:", p.id, liked)}
              onBookmark={(p, saved) => console.log("bookmark:", p.id, saved)}
              onOpenComments={(p) => console.log("open comments:", p.id)}
              onMenu={(p) => console.log("menu:", p.id)}
              onShare={(p) => console.log("share:", p.id)}
            />
          )}
        </div>
      </div>

      {/* Optional: bottom debug info */}
      <div className="end subtle" style={{ marginTop: "1.5rem" }}>
        <div>Instagram Feed</div>
        {currentProject && (
          <div>
            <strong>Project:</strong> {currentProject.name || currentProject.id}
          </div>
        )}
        {currentFeed && (
          <div>
            <strong>Feed:</strong> {currentFeed.name || currentFeed.id}
          </div>
        )}
      </div>
    </div>
  );
}