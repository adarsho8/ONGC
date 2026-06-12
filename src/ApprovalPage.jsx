import { useState, useEffect } from "react";
import PageHeader from "./PageHeader.jsx";
import { useSearchParams, useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalPage.jsx
//
// GET /api/rest/bpm/wle/v1/task/<taskId>?action=getData
//     &fields=locationResponse,commandResponse,Laq_Status,sitesurveyComment,
//             civilReviewComment,electricalReviewComment,SSTreviewComment,
//             civilReviewSignature,electricalReviewSignature,SSTreviewSignature
//
// PUT /api/rest/bpm/wle/v1/task/<taskId>?action=complete&parts=all
// ─────────────────────────────────────────────────────────────────────────────

const AUTH   = "Basic " + btoa("bawadmin:sarasu10");
const ACCENT = "#1e40af";   // Approval = deep blue
const LIGHT  = "#eff6ff";

async function fetchTaskData(taskId) {
  const fields = encodeURIComponent(
    "locationResponse,commandResponse,Laq_Status,sitesurveyComment," +
    "civilReviewComment,electricalReviewComment,SSTreviewComment," +
    "civilReviewSignature,electricalReviewSignature,SSTreviewSignature"
  );
  const res = await fetch(
    `/api/rest/bpm/wle/v1/task/${taskId}?action=getData&fields=${fields}`,
    {
      method: "GET",
      credentials: "include",
      headers: { Authorization: AUTH, Accept: "application/json" },
    }
  );
  const text = await res.text();
  if (!res.ok)
    throw new Error(`getData failed — HTTP ${res.status}: ${text.slice(0, 400)}`);
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response: ${text.slice(0, 300)}`); }

  const rm = json?.data?.resultMap;
  if (!rm)
    throw new Error(`resultMap missing.\nGot: ${JSON.stringify(json?.data).slice(0, 400)}`);

  return {
    loc:                      rm.locationResponse          ?? {},
    commandResponse:          rm.commandResponse           ?? {},
    laqStatus:                rm.Laq_Status                ?? "",
    sitesurveyComment:        rm.sitesurveyComment         ?? "",
    civilReviewComment:       rm.civilReviewComment        ?? "",
    electricalReviewComment:  rm.electricalReviewComment   ?? "",
    sstReviewComment:         rm.SSTreviewComment          ?? "",
    civilReviewSignature:     rm.civilReviewSignature      ?? "",
    electricalReviewSignature:rm.electricalReviewSignature ?? "",
    sstReviewSignature:       rm.SSTreviewSignature        ?? "",
  };
}

async function completeTask(taskId) {
  const url = `/api/rest/bpm/wle/v1/task/${taskId}?action=complete&parts=all`;
  const res = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`complete failed — HTTP ${res.status}: ${text.slice(0, 400)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ApprovalPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const taskId   = searchParams.get("taskId")   || "";
  const taskName = searchParams.get("taskName") || "Final Approval";

  const [fetchState,  setFetchState]  = useState("loading");
  const [fetchError,  setFetchError]  = useState("");
  const [approveState, setApproveState] = useState("idle"); // idle | approving | done | error
  const [approveError, setApproveError] = useState("");
  const [rawData,      setRawData]      = useState(null);
  const [data,         setData]         = useState(null);
  const [showModal,    setShowModal]    = useState(false);

  useEffect(() => {
    if (!taskId) { setFetchState("error"); setFetchError("No taskId in URL."); return; }
    (async () => {
      try {
        const d = await fetchTaskData(taskId);
        setRawData(d);
        setData(d);
        setFetchState("ready");
      } catch (e) {
        setFetchError(e.message);
        setFetchState("error");
      }
    })();
  }, [taskId]);

  const handleApprove = async () => {
    setShowModal(false);
    setApproveState("approving");
    setApproveError("");
    try {
      await completeTask(taskId);
      setApproveState("done");
      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setApproveState("error");
      setApproveError(err.message);
    }
  };

  if (fetchState === "loading") return <LoadingScreen taskId={taskId} />;
  if (fetchState === "error")   return <ErrorScreen  error={fetchError} navigate={navigate} />;

  const loc = data.loc;

  return (
    <div style={s.page}>
      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <button onClick={() => navigate("/")} style={s.backBtn}>← Worklist</button>
        <span style={{ color: "#cbd5e1" }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{taskName}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
          Task #{taskId}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 60px" }}>
        <div style={s.card}>

          {/* Card Header */}
          <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", padding: "28px 36px", borderBottom: `3px solid ${ACCENT}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px", fontSize: 26 }}>
                ✅
              </div>
              <div>
                <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>
                  {taskName}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 4 }}>
                  Task #{taskId} · Review all details below before approving
                </p>
              </div>
            </div>
          </div>

          {/* Status banner */}
          <div style={{ background: LIGHT, borderBottom: "1px solid #bfdbfe", padding: "10px 36px", fontSize: 12, color: "#1e40af", fontWeight: 600 }}>
            📋 All review data loaded — scroll down to approve
          </div>

          {/* Alert banners */}
          {approveState === "done"  && <Alert type="success" msg="✅ Task approved and completed! Workflow advanced in BAW. Returning to worklist…" />}
          {approveState === "error" && <Alert type="error"   msg={approveError} />}

          <div style={{ padding: "32px 36px" }}>

            {/* ── 1. Site Location ── */}
            <SectionHeader icon="📍" title="Site Location" subtitle="From site survey — locationResponse" />
            <div style={s.grid}>
              <ReadField label="Latitude"          value={loc.latitude} />
              <ReadField label="Longitude"         value={loc.longitude} />
              <ReadField label="Locality"          value={loc.locality} />
              <ReadField label="City"              value={loc.city} />
              <ReadField label="State / Province"  value={loc.principalSubdivision} />
              <ReadField label="Country"           value={loc.countryName} />
              <ReadField label="Country Code"      value={loc.countryCode} />
              <ReadField label="LAQ Status"        value={data.laqStatus} />
            </div>

            {/* ── 2. Site Survey Comment ── */}
            <SectionHeader icon="🗒️" title="Site Survey Comment" subtitle="Submitted by surveyor" />
            <ReadBox value={data.sitesurveyComment} placeholder="No comment provided" />

            {/* ── 3. Command Response ── */}
            <SectionHeader icon="⚙️" title="Command Response" subtitle="Process variable — commandResponse" />
            <CommandResponseBlock data={data.commandResponse} />

            {/* ── 4. Civil Review ── */}
            <SectionHeader icon="🏗️" title="Civil Review" subtitle="Assessment by civil engineer" color="#1d4ed8" />
            <div style={s.reviewCard("#dbeafe", "#1d4ed8")}>
              <ReadField label="Civil Review Comment" value={data.civilReviewComment} />
              {data.civilReviewSignature && (
                <SignatureDisplay label="Civil Review Signature" dataUrl={data.civilReviewSignature} />
              )}
            </div>

            {/* ── 5. Electrical Review ── */}
            <SectionHeader icon="⚡" title="Electrical Review" subtitle="Assessment by electrical engineer" color="#d97706" />
            <div style={s.reviewCard("#fef3c7", "#d97706")}>
              <ReadField label="Electrical Review Comment" value={data.electricalReviewComment} />
              {data.electricalReviewSignature && (
                <SignatureDisplay label="Electrical Review Signature" dataUrl={data.electricalReviewSignature} />
              )}
            </div>

            {/* ── 6. SST Review ── */}
            <SectionHeader icon="🛡️" title="SST Review" subtitle="Assessment by SST officer" color="#0f766e" />
            <div style={s.reviewCard("#ccfbf1", "#0f766e")}>
              <ReadField label="SST Review Comment" value={data.sstReviewComment} />
              {data.sstReviewSignature && (
                <SignatureDisplay label="SST Review Signature" dataUrl={data.sstReviewSignature} />
              )}
            </div>

            {/* Raw debug */}
            {rawData && (
              <details style={{ marginTop: 24 }}>
                <summary style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer", userSelect: "none" }}>
                  🔍 Raw BAW response (debug)
                </summary>
                <pre style={s.debugPre}>{JSON.stringify(rawData, null, 2)}</pre>
              </details>
            )}

            {/* ── Divider ── */}
            <div style={{ borderTop: "2px dashed #e2e8f0", margin: "36px 0 32px" }} />

            {/* ── Approve Button ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: 0 }}>
                By clicking <strong>Approve</strong>, you confirm all review details are satisfactory
                and the task will be marked as complete in BAW.
              </p>
              <button
                onClick={() => setShowModal(true)}
                disabled={approveState === "approving" || approveState === "done"}
                style={{
                  ...s.approveBtn,
                  background: approveState === "approving" || approveState === "done"
                    ? "#cbd5e1" : "#16a34a",
                  cursor: approveState === "approving" || approveState === "done"
                    ? "not-allowed" : "pointer",
                  opacity: approveState === "done" ? 0.7 : 1,
                }}
              >
                {approveState === "approving" ? "⏳ Processing…"
                  : approveState === "done"   ? "✅ Approved"
                  : "✅ Approve"}
              </button>
              {approveState === "idle" && (
                <button onClick={() => navigate("/")} style={s.cancelBtn}>Cancel</button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontWeight: 800, fontSize: 18, textAlign: "center", margin: "0 0 10px", color: "#0f172a" }}>
              Confirm Approval
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 1.6, margin: "0 0 24px" }}>
              You are about to <strong>approve and complete</strong> Task #{taskId}.<br />
              This action will advance the BAW workflow and cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleApprove} style={{ ...s.approveBtn, background: "#16a34a", cursor: "pointer" }}>
                ✅ Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 16px", paddingBottom: 10, borderBottom: "2px solid #e2e8f0" }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: color || "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function ReadField({ label, value }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#334155", minHeight: 38 }}>
        {value || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}

function ReadBox({ value, placeholder }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 24, minHeight: 48 }}>
      {value || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{placeholder}</span>}
    </div>
  );
}

function SignatureDisplay({ label, dataUrl }) {
  return (
    <div style={{ marginTop: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: 8, display: "inline-block" }}>
        <img
          src={dataUrl}
          alt={label}
          style={{ display: "block", maxHeight: 80, maxWidth: "100%", borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

function CommandResponseBlock({ data }) {
  if (!data || Object.keys(data).length === 0)
    return (
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 24 }}>
        No command response data available
      </div>
    );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
      {Object.entries(data).map(([k, v]) => (
        <ReadField key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "")} />
      ))}
    </div>
  );
}

function Alert({ type, msg }) {
  const ok = type === "success";
  return (
    <div style={{ margin: "16px 36px 0", background: ok ? "#f0fdf4" : "#fff1f2", borderLeft: `4px solid ${ok ? "#16a34a" : "#dc2626"}`, borderRadius: 8, padding: "14px 18px", border: "1px solid #e2e8f0", color: ok ? "#15803d" : "#7f1d1d", fontSize: 13, fontWeight: ok ? 600 : 400 }}>
      {ok ? msg : (
        <>
          <div style={{ fontWeight: 700, color: "#dc2626" }}>⚠ Approval failed</div>
          <pre style={{ fontSize: 11, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{msg}</pre>
        </>
      )}
    </div>
  );
}

function LoadingScreen({ taskId }) {
  return (
    <div style={s.page}>
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <div style={s.spinner} />
        <p style={{ color: "#64748b", marginTop: 18, fontWeight: 600 }}>Loading task data from BAW…</p>
        {taskId && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Task #{taskId}</p>}
      </div>
    </div>
  );
}

function ErrorScreen({ error, navigate }) {
  return (
    <div style={s.page}>
      <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px" }}>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ background: "#dc2626", padding: "20px 24px" }}>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 18, margin: 0 }}>⚠ Failed to load task</h2>
          </div>
          <div style={{ padding: 24 }}>
            <pre style={{ fontSize: 12, color: "#7f1d1d", background: "#fff1f2", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error}</pre>
            <button onClick={() => navigate("/")} style={s.btnDark}>← Back to Worklist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:        { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  breadcrumb:  { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  backBtn:     { fontSize: 13, fontWeight: 600, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 },
  spinner:     { width: 44, height: 44, border: "4px solid #e2e8f0", borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  card:        { width: "100%", maxWidth: 980, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" },
  grid:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 },
  reviewCard:  (bg, border) => ({ background: bg, border: `1px solid ${border}30`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, display: "grid", gap: 14 }),
  readBox:     { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#334155", lineHeight: 1.6 },
  debugPre:    { marginTop: 8, background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 11, color: "#334155", overflowX: "auto", border: "1px solid #e2e8f0", lineHeight: 1.6 },
  approveBtn:  { padding: "14px 52px", borderRadius: 10, fontWeight: 800, fontSize: 16, color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(22,163,74,0.35)", letterSpacing: "0.3px", transition: "transform 0.1s, box-shadow 0.1s" },
  cancelBtn:   { padding: "11px 28px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#fff", color: "#374151", cursor: "pointer" },
  btnDark:     { marginTop: 20, padding: "10px 24px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  modal:       { background: "#fff", borderRadius: 16, padding: "36px 40px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
};