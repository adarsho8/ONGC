import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const SERVICE_URL = "/api/automationservices/rest/ONGC/operations/twSearch";

// ── Route map: match taskname keywords → React page ──────────────────────────
// Keys are lowercase substrings to match against the task name.
// Order matters — more specific entries should come first.
const TASK_ROUTE_MAP = [
  { match: "civil review",        route: "/civil-review"       },
  { match: "civilreview",         route: "/civil-review"       },
  { match: "civil",               route: "/civil-review"       },
  { match: "electrical review",   route: "/electrical-review"  },
  { match: "electricalreview",    route: "/electrical-review"  },
  { match: "electrical",          route: "/electrical-review"  },
  { match: "sst review",          route: "/sst-review"         },
  { match: "sstreview",           route: "/sst-review"         },
  { match: "sst",                 route: "/sst-review"         },
  { match: "approval",            route: "/approval"            },
  { match: "approve",             route: "/approval"            },
  { match: "site survey",         route: "/survey"             },
  { match: "sitesurvey",          route: "/survey"             },
  { match: "survey",              route: "/survey"             },
];

function getRouteForTask(taskname) {
  if (!taskname) return "/survey";
  const key = taskname.toLowerCase().trim();
  for (const { match, route } of TASK_ROUTE_MAP) {
    if (key.includes(match)) return route;
  }
  return "/survey"; // fallback
}

// ── Task type badge colours ───────────────────────────────────────────────────
function taskTypeBadge(taskname) {
  const n = (taskname || "").toLowerCase();
  if (n.includes("civil"))      return { bg: "#dbeafe", color: "#1d4ed8", label: "Civil"      };
  if (n.includes("electrical")) return { bg: "#fef3c7", color: "#d97706", label: "Electrical" };
  if (n.includes("sst"))        return { bg: "#ccfbf1", color: "#0f766e", label: "SST"        };
  if (n.includes("survey"))     return { bg: "#f3e8ff", color: "#7c3aed", label: "Survey"     };
  return                               { bg: "#f1f5f9", color: "#475569", label: "Task"       };
}

export default function BwHomepage() {
  const navigate = useNavigate();
  const { username, password, logout } = useAuth();

  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [status, setStatus]           = useState("Initialising…");
  const [error, setError]             = useState("");
  const [rawJson, setRawJson]         = useState(null);
  const [showDebug, setShowDebug]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    setStatus("Fetching worklist…");
    try {
      const res = await fetch(SERVICE_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": "Basic " + btoa(`${username}:${password}`),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: username }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}\n\n${text.slice(0, 500)}`);

      let json;
      try { json = JSON.parse(text); }
      catch { throw new Error(`Response is not JSON:\n${text.slice(0, 300)}`); }

      setRawJson(json);

      const worklist =
        Array.isArray(json.worklist) ? json.worklist :
        Array.isArray(json.data)     ? json.data     :
        Array.isArray(json)          ? json          : [];

      setRows(worklist);
      setLastUpdated(new Date());
      setStatus(`${worklist.length} task(s) loaded`);
    } catch (e) {
      setError(e.message);
      setStatus("Failed");
    } finally {
      setLoading(false);
    }
  };

  const g = (row, key) => {
    const v = row?.[key];
    if (v === undefined || v === null || v === "null" || v === "") return null;
    return v;
  };

  // ── Play button: claim task then navigate ─────────────────────────────────
  const handlePlay = (row) => {
    const taskid     = g(row, "taskid");
    const taskname   = g(row, "taskname") || "Survey";
    const instanceId = g(row, "processInstanceId")
                    ?? g(row, "instanceId")
                    ?? g(row, "piid")
                    ?? "";

    if (!taskid) return;

    const route = getRouteForTask(taskname);
    navigate(
      `${route}?taskId=${taskid}&instanceId=${instanceId}&taskName=${encodeURIComponent(taskname)}`
    );
  };

  const statusColor = error ? "#dc2626" : loading ? "#d97706" : "#16a34a";

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>ONGC</div>
          <div>
            <h1 style={s.title}>Application Workspace</h1>
            <p style={s.subtitle}>LAND ACQUISITION PORTAL</p>
          </div>
        </div>
        <div style={s.headerRight}>
          {username && (
            <span style={s.userBadge}>👤 {username}</span>
          )}
          {lastUpdated && <span style={s.ts}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button style={s.btnSec} onClick={() => setShowDebug(v => !v)}>
            {showDebug ? "Hide Debug" : "🛠 Debug"}
          </button>
          <button style={s.btnPri} onClick={fetchAll} disabled={loading}>
            {loading ? "⏳ Syncing…" : "↻ Refresh"}
          </button>
          <button style={s.btnLogout} onClick={() => { logout(); }}>
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ ...s.statusBar, borderLeftColor: statusColor }}>
        <span style={{ color: statusColor, fontWeight: 700 }}>●</span>&nbsp;{status}
      </div>

      {error && (
        <div style={s.errBox}>
          <strong>⚠ Error</strong>
          <pre style={s.errPre}>{error}</pre>
          <div style={s.errHint}>Check the Debug panel below for the raw JSON.</div>
        </div>
      )}

      {showDebug && rawJson && (
        <details open style={s.debug}>
          <summary style={s.debugSum}>Raw JSON from BAW</summary>
          <pre style={s.debugPre}>{JSON.stringify(rawJson, null, 2)}</pre>
        </details>
      )}

      {!loading && !error && rows.length > 0 && (() => {
        const received = rows.filter(r => {
          const st = (g(r, "taskStatus") || "").toLowerCase();
          return st === "received" || st === "new_or_received";
        }).length;
        const closed = rows.filter(r =>
          (g(r, "taskStatus") || "").toLowerCase() === "closed"
        ).length;
        const processes = [...new Set(rows.map(r => g(r, "processName")).filter(Boolean))].length;
        return (
          <div style={s.stats}>
            {[["Total Tasks", rows.length], ["Received", received], ["Closed", closed], ["Processes", processes]].map(([label, val]) => (
              <div key={label} style={s.statCard}>
                <span style={s.statNum}>{val}</span>
                <span style={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {loading && (
        <div style={s.loadBox}>
          <div style={s.spinner} />
          <p style={{ color: "#64748b", marginTop: 16 }}>{status}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>📭</div>
          <h3>No tasks in worklist</h3>
          <p>Service responded but returned an empty worklist.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={s.tableWrap}>
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Open</th>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Task ID</th>
                  <th style={s.th}>Task Name</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Process Name</th>
                  <th style={s.th}>Received From</th>
                  <th style={s.th}>Assigned To</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Received Date</th>
                  <th style={s.th}>Due Date</th>
                  <th style={s.th}>Process Created</th>
                  <th style={s.th}>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const taskid            = g(r, "taskid");
                  const taskname          = g(r, "taskname");
                  const processName       = g(r, "processName");
                  const taskreceivedFrom  = g(r, "taskreceivedFrom");
                  const assignedTo        = g(r, "taskAssignedToUser");
                  const taskStatus        = g(r, "taskStatus");
                  const taskreceivedDate  = g(r, "taskreceivedDate");
                  const taskDueDate       = g(r, "taskDueDate");
                  const processCreateDate = g(r, "processCreateDate");
                  const processmodifyDate = g(r, "processmodifyDate");
                  const badge             = taskTypeBadge(taskname);

                  return (
                    <tr
                      key={(taskid ?? i) + "-" + i}
                      style={{ ...s.tr, background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                    >
                      {/* ── Play button ── */}
                      <td style={{ ...s.td, textAlign: "center" }}>
                        {taskid ? (
                          <button
                            onClick={() => handlePlay(r)}
                            title={`Open task #${taskid} — ${taskname}`}
                            style={s.playBtn}
                            onMouseEnter={e => { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.transform = "scale(1.12)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#3b82f6"; e.currentTarget.style.transform = "scale(1)"; }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="white" style={{ display: "block", marginLeft: 2 }}>
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          </button>
                        ) : (
                          <span style={s.nil}>—</span>
                        )}
                      </td>

                      <td style={{ ...s.td, color: "#94a3b8" }}>{i + 1}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: "#1e40af" }}>
                        {taskid ? `#${taskid}` : <span style={s.nil}>—</span>}
                      </td>
                      <td style={{ ...s.td, fontWeight: 600, color: "#0f172a" }}>
                        {taskname ?? <span style={s.nil}>—</span>}
                      </td>
                      {/* Task type badge */}
                      <td style={s.td}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        {processName ? <span style={s.processBadge}>{processName}</span> : <span style={s.nil}>—</span>}
                      </td>
                      <td style={s.td}>{taskreceivedFrom ?? <span style={s.nil}>—</span>}</td>
                      <td style={s.td}>{assignedTo       ?? <span style={s.nil}>—</span>}</td>
                      <td style={s.td}>
                        {taskStatus ? <span style={statusBadge(taskStatus)}>{taskStatus}</span> : <span style={s.nil}>—</span>}
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{taskreceivedDate  ?? <span style={s.nil}>—</span>}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{taskDueDate       ?? <span style={s.nil}>—</span>}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{processCreateDate ?? <span style={s.nil}>—</span>}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{processmodifyDate ?? <span style={s.nil}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(val) {
  const v = (val || "").toLowerCase();
  const c = v.includes("received") ? { bg: "#dbeafe", color: "#1d4ed8" }
          : v === "closed"         ? { bg: "#f1f5f9", color: "#475569" }
          : v === "active"         ? { bg: "#dcfce7", color: "#15803d" }
          :                          { bg: "#fef3c7", color: "#92400e" };
  return { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: c.bg, color: c.color };
}

const s = {
  page:        { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif", paddingBottom: 48 },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)", borderBottom: "3px solid #a52c33", boxShadow: "0 2px 20px rgba(165,44,51,0.3)", padding: "0 36px", height: 64, flexWrap: "wrap" },
  headerLeft:  { display: "flex", alignItems: "center", gap: 16 },
  logo:        { background: "#a52c33", color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 },
  title:       { margin: 0, fontSize: 22, color: "#f8fafc", fontWeight: 700 },
  subtitle:    { margin: "4px 0 0", color: "#94a3b8", fontSize: 13 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  ts:          { color: "#64748b", fontSize: 12 },
  btnPri:      { padding: "9px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnSec:      { padding: "9px 16px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  btnLogout:   { padding: "9px 16px", background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 },
  userBadge:   { color: "#94a3b8", fontSize: 13, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px" },
  statusBar:   { margin: "20px 36px 0", background: "#fff", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a", borderRadius: 8, padding: "12px 18px", fontSize: 13, color: "#334155" },
  errBox:      { margin: "16px 36px 0", background: "#fff1f2", border: "1px solid #fecdd3", borderLeft: "4px solid #dc2626", borderRadius: 10, padding: "16px 20px" },
  errPre:      { margin: "8px 0", fontSize: 12, color: "#7f1d1d", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#fff", padding: "10px", borderRadius: 6, border: "1px solid #fecdd3" },
  errHint:     { margin: 0, fontSize: 12, color: "#9f1239", lineHeight: 1.8 },
  debug:       { margin: "16px 36px 0", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" },
  debugSum:    { padding: "12px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  debugPre:    { margin: 0, padding: "0 20px 20px", fontSize: 11, color: "#7dd3fc", maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" },
  stats:       { display: "flex", gap: 16, padding: "20px 36px 0", flexWrap: "wrap" },
  statCard:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 28px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 130, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  statNum:     { fontSize: 28, fontWeight: 800, color: "#1e3a5f", lineHeight: 1 },
  statLabel:   { fontSize: 11, color: "#94a3b8", marginTop: 6, textTransform: "uppercase", letterSpacing: 1 },
  loadBox:     { textAlign: "center", padding: 64 },
  spinner:     { width: 40, height: 40, border: "4px solid #e2e8f0", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  empty:       { margin: "32px 36px", background: "#fff", borderRadius: 14, border: "2px dashed #cbd5e1", padding: "56px 32px", textAlign: "center", color: "#64748b" },
  tableWrap:   { margin: "20px 36px 0", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" },
  table:       { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thead:       { background: "#f8fafc" },
  th:          { padding: "13px 16px", fontSize: 11, fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" },
  tr:          { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" },
  td:          { padding: "13px 16px", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  processBadge:{ background: "#ede9fe", color: "#6d28d9", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  nil:         { color: "#cbd5e1", fontStyle: "italic" },
  playBtn:     { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", transition: "background 0.15s, transform 0.15s", boxShadow: "0 2px 6px rgba(59,130,246,0.4)" },
};