// components-admin-login.jsx
import React, { useEffect, useState } from "react";
import { adminLogin, hasAdminSession } from "./utils";

export default function AdminLogin({ onAuth }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (hasAdminSession()) onAuth?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!pw.trim() || loading) return;
    setLoading(true);
    setErr("");
    const res = await adminLogin(pw.trim());
    setLoading(false);
    if (res?.ok) {
      onAuth?.();
    } else {
      setErr(res?.err || "Login failed");
    }
  };

  return (
    <div className="admin-login-wrap">
      <div className="card admin-login-card">
        <h2 style={{ margin: 0, textAlign: "center" }}>Admin Login</h2>
        <p className="subtle" style={{ textAlign: "center", marginTop: 6 }}>
          Enter your admin password
        </p>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Password
          <div className="input-with-toggle">
            <input
              className="input"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              autoFocus
            />
            <button
              type="button"
              className="eye-btn"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((v) => !v)}
              title={show ? "Hide password" : "Show password"}
            >
              {/* simple SVG eye */}
              {show ? (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c-5 0-9 4-10 7 1 3 5 7 10 7s9-4 10-7c-1-3-5-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"></path>
                  <path d="M4 20L20 4" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c-5 0-9 4-10 7 1 3 5 7 10 7s9-4 10-7c-1-3-5-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"></path>
                </svg>
              )}
            </button>
          </div>
        </label>

        {err && (
          <div style={{ color: "crimson", fontSize: ".9rem", marginTop: ".5rem" }}>
            {err}
          </div>
        )}

        <button
          className="btn primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={submit}
          disabled={loading || !pw.trim()}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}