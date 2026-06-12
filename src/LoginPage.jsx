import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import ongcLogo from "./assets/image.png";

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Username is required.";
    if (!password)        e.password = "Password is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    login(username.trim(), password);
    navigate("/");
  };

  const handleKey = (ev) => {
    if (ev.key === "Enter") handleSubmit();
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Header Band */}
        <div style={s.header}>
          <img src={ongcLogo} alt="ONGC Logo" style={s.logoImg} />
          <div style={s.headerText}>
            <div style={s.orgName}>ONGC</div>
            <div style={s.portalName}>LAND ACQUISITION PORTAL</div>
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>
          <h1 style={s.title}>STAFF LOGIN</h1>
          <p style={s.sub}>Enter your credentials to access the portal</p>

          {/* Username */}
          <div style={s.field}>
            <label style={s.label} htmlFor="username">USERNAME</label>
            <div style={{ ...s.inputWrap, ...(errors.username ? s.inputWrapErr : {}) }}>
              {/* Person icon */}
              <svg style={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => { setUsername(e.target.value); setErrors(v => ({ ...v, username: "" })); }}
                onKeyDown={handleKey}
                style={s.input}
                autoFocus
                autoComplete="username"
              />
            </div>
            {errors.username && <span style={s.errMsg}>{errors.username}</span>}
          </div>

          {/* Password */}
          <div style={s.field}>
            <label style={s.label} htmlFor="password">PASSWORD</label>
            <div style={{ ...s.inputWrap, ...(errors.password ? s.inputWrapErr : {}) }}>
              {/* Lock icon */}
              <svg style={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: "" })); }}
                onKeyDown={handleKey}
                style={s.input}
                autoComplete="current-password"
              />
            </div>
            {errors.password && <span style={s.errMsg}>{errors.password}</span>}
          </div>

          {/* Sign In Button */}
          <button style={s.btn} onClick={handleSubmit}>
            <svg style={s.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            SIGN IN &nbsp;
          </button>

          {/* Back link */}
          
        </div>

        {/* Footer */}
        <div style={s.footer}>
          ONGC LAND ACQUISITION PORTAL
        </div>

      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0d1117 0%, #161d2b 60%, #0d1117 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: 24,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(16px)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
    overflow: "hidden",
    color: "#fff",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "20px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
  },
  logoImg: {
    width: 64,
    height: 64,
    objectFit: "contain",
    borderRadius: 8,
  },
  headerText: { display: "flex", flexDirection: "column", gap: 2 },
  orgName: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: 2,
  },
  portalName: {
    fontSize: 10,
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: 3,
  },

  /* Body */
  body: { padding: "36px 32px 24px" },
  title: {
    margin: "0 0 8px",
    fontSize: 26,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: 3,
    textAlign: "center",
  },
  sub: {
    margin: "0 0 32px",
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  /* Fields */
  field: { marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: 2,
    marginBottom: 8,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "0 14px",
    gap: 10,
  },
  inputWrapErr: {
    borderColor: "#dc2626",
    background: "rgba(220,38,38,0.08)",
  },
  icon: {
    width: 18,
    height: 18,
    color: "#64748b",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "13px 0",
    fontSize: 14,
    color: "#fff",
    fontFamily: "inherit",
  },
  errMsg: { display: "block", marginTop: 5, fontSize: 12, color: "#f87171" },

  /* Button */
  btn: {
    width: "100%",
    padding: "14px 0",
    background: "#a52c33",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: "pointer",
    marginTop: 8,
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnIcon: { width: 16, height: 16, color: "#fff" },

  /* Back link */
  backLink: {
    textAlign: "center",
    fontSize: 12,
    color: "#64748b",
    cursor: "pointer",
    margin: 0,
  },

  /* Footer */
  footer: {
    textAlign: "center",
    padding: "14px 32px",
    fontSize: 10,
    letterSpacing: 2,
    color: "#475569",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
};