import React, { useEffect, useState } from "react";
import {
  adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser,
  hasAdminRole,
} from "./utils";

export function AdminUsersPanel() {
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", role: "viewer", password: "" });

  const load = async () => {
    setErr("");
    try {
      const res = await adminListUsers();
      if (res?.ok) setUsers(res.users || []);
      else setErr(res?.err || "Failed to load users");
    } catch (e) { setErr(String(e.message || e)); }
  };

  useEffect(() => { if (hasAdminRole("owner")) load(); }, []);

  if (!hasAdminRole("owner")) return null;

  return (
    <section className="card" style={{ padding: "1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <h3 style={{ margin:0 }}>Users & Roles</h3>
        <button className="btn" onClick={load} disabled={busy}>Refresh</button>
      </div>
      {err && <div style={{ color:"crimson", marginTop:8 }}>{err}</div>}

      <div className="fieldset" style={{ marginTop:12 }}>
        <div className="section-title">Add user</div>
        <div className="grid-3">
          <label>Email
            <input className="input" value={form.email}
              onChange={e=>setForm({...form, email:e.target.value})}
              placeholder="name@example.com" />
          </label>
          <label>Role
            <select className="select" value={form.role}
              onChange={e=>setForm({...form, role:e.target.value})}>
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <label>Password
            <input className="input" type="password" value={form.password}
              onChange={e=>setForm({...form, password:e.target.value})}
              placeholder="set a password" />
          </label>
        </div>
        <button
          className="btn primary" style={{ marginTop:8 }}
          disabled={busy || !form.email.trim() || !form.password.trim()}
          onClick={async ()=>{
            setBusy(true); setErr("");
            const res = await adminCreateUser(form.email.trim(), form.password.trim(), form.role);
            if (!res?.ok) setErr(res?.err || "Create failed");
            await load(); setBusy(false);
          }}>
          Add user
        </button>
      </div>

      <div className="fieldset" style={{ marginTop:12 }}>
        <div className="section-title">Existing</div>
        {users.length === 0 ? <div className="subtle">No users</div> : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr className="subtle"><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.email} style={{ borderTop:"1px solid var(--line)" }}>
                  <td style={{ padding:8 }}>{u.email}</td>
                  <td style={{ padding:8 }}>{u.role}</td>
                  <td style={{ padding:8 }}>{u.disabled ? "disabled" : "active"}</td>
                  <td style={{ padding:8, display:"flex", gap:6 }}>
                    <button className="btn" onClick={async ()=>{
                      const role = prompt("Role (viewer/editor/owner):", u.role) || u.role;
                      const res = await adminUpdateUser({ email:u.email, role });
                      if (!res?.ok) alert(res?.err || "Update failed"); else load();
                    }}>Change role</button>
                    <button className="btn" onClick={async ()=>{
                      const pwd = prompt("New password:");
                      if (!pwd) return;
                      const res = await adminUpdateUser({ email:u.email, password: pwd });
                      if (!res?.ok) alert(res?.err || "Password update failed"); else load();
                    }}>Reset password</button>
                    <button className="btn" onClick={async ()=>{
                      const res = await adminUpdateUser({ email:u.email, disabled: !u.disabled });
                      if (!res?.ok) alert(res?.err || "Toggle failed"); else load();
                    }}>{u.disabled ? "Enable" : "Disable"}</button>
                    <button className="btn ghost danger" onClick={async ()=>{
                      if (!confirm(`Delete ${u.email}?`)) return;
                      const res = await adminDeleteUser(u.email);
                      if (!res?.ok) alert(res?.err || "Delete failed"); else load();
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}