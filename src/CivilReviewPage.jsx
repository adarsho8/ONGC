import { useState, useEffect, useRef } from "react";
import PageHeader from "./PageHeader.jsx";
import { useSearchParams, useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// CivilReviewPage.jsx
//
// GET /api/rest/bpm/wle/v1/task/<taskId>?action=getData
//     &fields=locationResponse,commandResponse,Laq_Status,sitesurveyComment
//
// PUT /api/rest/bpm/wle/v1/task/<taskId>?action=complete
//     &params={Laq_Status,civilReviewComment,civilReviewSignature}&parts=all
// ─────────────────────────────────────────────────────────────────────────────

const AUTH   = "Basic " + btoa("bawadmin:sarasu10");
const ACCENT = "#1d4ed8";   // civil = blue
const LIGHT  = "#eff6ff";

async function fetchTaskData(taskId) {
  const fields = encodeURIComponent(
    "locationResponse,commandResponse,Laq_Status,sitesurveyComment"
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
  if (!rm) throw new Error(`resultMap missing.\nGot: ${JSON.stringify(json?.data).slice(0, 400)}`);

  return {
    loc:              rm.locationResponse  ?? {},
    commandResponse:  rm.commandResponse   ?? {},
    laqStatus:        rm.Laq_Status        ?? "",
    sitesurveyComment: rm.sitesurveyComment ?? "",
  };
}

async function completeTask(taskId, laqStatus, comment, signature) {
  const params = JSON.stringify({
    civilReviewComment:   comment,
    civilReviewSignature: signature,
  });
  const url = `/api/rest/bpm/wle/v1/task/${taskId}?action=complete&params=${encodeURIComponent(params)}&parts=all`;
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
export default function CivilReviewPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const taskId   = searchParams.get("taskId")   || "";
  const taskName = searchParams.get("taskName") || "Civil Review";

  const [activeTab,   setActiveTab]   = useState("Review Details");
  const [fetchState,  setFetchState]  = useState("loading");
  const [fetchError,  setFetchError]  = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const [rawData,     setRawData]     = useState(null);

  const sigCanvasRef = useRef(null);
  const sigDrawing   = useRef(false);
  const [hasSig,     setHasSig]     = useState(false);

  const [form, setForm] = useState({
    // from locationResponse — read-only
    latitude: "", longitude: "", locality: "", city: "",
    principalSubdivision: "", countryName: "", countryCode: "",
    // from process vars — read-only
    laqStatus: "",
    sitesurveyComment: "",
    // commandResponse fields — read-only
    commandResponse: {},
    // civil fills
    civilReviewComment:   "",
    civilReviewSignature: "",
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) {
      setFetchState("error");
      setFetchError("No taskId in URL.");
      return;
    }
    (async () => {
      try {
        const { loc, commandResponse, laqStatus, sitesurveyComment } =
          await fetchTaskData(taskId);
        setRawData({ locationResponse: loc, commandResponse, Laq_Status: laqStatus, sitesurveyComment });
        setForm(prev => ({
          ...prev,
          latitude:             String(loc.latitude             ?? ""),
          longitude:            String(loc.longitude            ?? ""),
          locality:             loc.locality                    ?? "",
          city:                 loc.city                        ?? "",
          principalSubdivision: loc.principalSubdivision        ?? "",
          countryName:          loc.countryName                 ?? "",
          countryCode:          loc.countryCode                 ?? "",
          laqStatus,
          sitesurveyComment,
          commandResponse,
        }));
        setFetchState("ready");
      } catch (e) {
        setFetchError(e.message);
        setFetchState("error");
      }
    })();
  }, [taskId]);

  // ── Signature canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "Review Details") return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };
    const down = (e) => { sigDrawing.current = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if (!sigDrawing.current) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSig(true); };
    const up   = () => { sigDrawing.current = false; };

    canvas.addEventListener("mousedown",  down);
    canvas.addEventListener("mousemove",  move);
    canvas.addEventListener("mouseup",    up);
    canvas.addEventListener("mouseleave", up);
    canvas.addEventListener("touchstart", down, { passive: true });
    canvas.addEventListener("touchmove",  move, { passive: false });
    canvas.addEventListener("touchend",   up);
    return () => {
      canvas.removeEventListener("mousedown",  down);
      canvas.removeEventListener("mousemove",  move);
      canvas.removeEventListener("mouseup",    up);
      canvas.removeEventListener("mouseleave", up);
      canvas.removeEventListener("touchstart", down);
      canvas.removeEventListener("touchmove",  move);
      canvas.removeEventListener("touchend",   up);
    };
  }, [activeTab, fetchState]);

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState("submitting");
    setSubmitError("");
    const sigData = hasSig ? sigCanvasRef.current?.toDataURL("image/png") : "";
    try {
      await completeTask(taskId, null, form.civilReviewComment, sigData);
      setSubmitState("done");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err.message);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (fetchState === "loading") return <LoadingScreen taskId={taskId} label="locationResponse,commandResponse,Laq_Status,sitesurveyComment" accent={ACCENT} />;
  if (fetchState === "error")   return <ErrorScreen  error={fetchError} navigate={navigate} />;

  const tabs = ["Review Details", "Document Upload"];

  return (
    <div style={s.page}>
      <div style={s.breadcrumb}>
        <button onClick={() => navigate("/")} style={s.backBtn}>← Worklist</button>
        <span style={{ color: "#cbd5e1" }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{taskName}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>Task #{taskId}</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", overflow: "hidden" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "12px 32px", fontWeight: 600, fontSize: 14,
              border: "none", cursor: "pointer",
              background: activeTab === tab ? ACCENT : "#fff",
              color:      activeTab === tab ? "#fff" : "#374151",
              transition: "background 0.15s",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === "Review Details" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 48px" }}>
          <div style={s.card}>

            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", padding: "24px 32px", borderBottom: `3px solid ${ACCENT}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", fontSize: 22 }}>🏗️</div>
                <div>
                  <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{taskName}</h1>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 3 }}>
                    Task #{taskId} · Civil Review · Submit to complete and advance workflow
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: LIGHT, borderBottom: `1px solid #bfdbfe`, padding: "10px 32px", fontSize: 12, color: ACCENT, fontWeight: 600 }}>
              ✅ All site survey data loaded — review below and add your civil assessment
            </div>

            {/* Alerts */}
            {submitState === "done" && <Alert type="success" msg="✅ Civil Review completed! Token advanced in BAW. Returning to worklist…" />}
            {submitState === "error" && <Alert type="error" msg={submitError} />}

            <form onSubmit={handleSubmit} style={{ padding: "28px 32px" }}>

              {/* ── Section: Location (from Site Survey) ── */}
              <SectionHeader icon="📍" title="Site Location" subtitle="From site survey — locationResponse" accent={ACCENT} />
              <div style={s.grid}>
                <ReadField label="Latitude"        value={form.latitude} />
                <ReadField label="Longitude"       value={form.longitude} />
                <ReadField label="Locality"        value={form.locality} />
                <ReadField label="City"            value={form.city} />
                <ReadField label="State / Province" value={form.principalSubdivision} />
                <ReadField label="Country"         value={form.countryName} />
                <ReadField label="Country Code"    value={form.countryCode} />
                <ReadField label="LAQ Status"      value={form.laqStatus} />
              </div>

              {/* ── Section: Site Survey Comment ── */}
              <SectionHeader icon="📝" title="Site Survey Comment" subtitle="Submitted by surveyor" accent={ACCENT} />
              <div style={{ ...s.readBox, marginBottom: 24 }}>
                {form.sitesurveyComment || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No comment provided</span>}
              </div>

              {/* ── Section: Command Response ── */}
              <SectionHeader icon="⚙️" title="Command Response" subtitle="Process variable — commandResponse" accent={ACCENT} />
              <CommandResponseBlock data={form.commandResponse} />

              {/* ── Section: Civil Review Input ── */}
              <SectionHeader icon="🏗️" title="Civil Review Assessment" subtitle="Your review — required fields" accent={ACCENT} />
              <div style={{ display: "grid", gap: 20 }}>
                <div>
                  <label style={s.label}>
                    Civil Review Comment <span style={s.reqTag}>* required</span>
                  </label>
                  <textarea name="civilReviewComment"
                    value={form.civilReviewComment} onChange={handleChange}
                    rows={4} required
                    placeholder="Enter civil review findings, observations, and recommendations…"
                    style={{ ...s.input, resize: "vertical" }} />
                </div>

                {/* Signature pad */}
                <div>
                  <label style={s.label}>
                    Civil Review Signature <span style={s.reqTag}>* draw below</span>
                  </label>
                  <div style={{ border: `2px solid #bfdbfe`, borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
                    <canvas
                      ref={sigCanvasRef}
                      width={836}
                      height={120}
                      style={{ display: "block", width: "100%", cursor: "crosshair", touchAction: "none" }}
                    />
                    <div style={{ background: LIGHT, padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid #bfdbfe` }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {hasSig ? "✏️ Signature captured" : "✏️ Draw your signature above"}
                      </span>
                      <button type="button" onClick={clearSig} style={{ fontSize: 11, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Debug */}
              {rawData && (
                <details style={{ marginTop: 20 }}>
                  <summary style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer", userSelect: "none" }}>🔍 Raw BAW response (debug)</summary>
                  <pre style={s.debugPre}>{JSON.stringify(rawData, null, 2)}</pre>
                </details>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
                <button type="button" onClick={() => navigate("/")} style={s.btnSecondary}>Cancel</button>
                <button type="submit"
                  disabled={submitState === "submitting" || submitState === "done"}
                  style={{
                    ...s.btnPrimary,
                    background: submitState === "submitting" ? "#cbd5e1" : ACCENT,
                    cursor: submitState === "submitting" ? "not-allowed" : "pointer",
                    opacity: submitState === "done" ? 0.7 : 1,
                  }}>
                  {submitState === "submitting" ? "⏳ Saving to BAW…"
                    : submitState === "done"    ? "✅ Done"
                    : "Submit Civil Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "Document Upload" && (
        <DocUploadTab taskId={taskId} accent={ACCENT} />
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 16px", paddingBottom: 10, borderBottom: `2px solid #e2e8f0` }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function ReadField({ label, value }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>{label}</label>
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#334155", minHeight: 38 }}>
        {value || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}

function CommandResponseBlock({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 24 }}>
        No command response data available
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
      {Object.entries(data).map(([k, v]) => (
        <ReadField key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "")} />
      ))}
    </div>
  );
}

function DocUploadTab({ taskId, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px" }}>
      <div style={s.card}>
        <div style={{ background: accent, padding: "24px 32px" }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Document Upload</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>Task #{taskId}</p>
        </div>
        <div style={{ padding: 32, color: "#64748b" }}>Document upload functionality goes here.</div>
      </div>
    </div>
  );
}

function Alert({ type, msg }) {
  const isSuccess = type === "success";
  return (
    <div style={{
      margin: "16px 32px 0",
      background: isSuccess ? "#f0fdf4" : "#fff1f2",
      borderLeft: `4px solid ${isSuccess ? "#16a34a" : "#dc2626"}`,
      borderRadius: 8, padding: "14px 18px", border: "1px solid #e2e8f0",
      color: isSuccess ? "#15803d" : "#7f1d1d", fontSize: 13, fontWeight: isSuccess ? 600 : 400,
    }}>
      {isSuccess ? msg : <><div style={{ fontWeight: 700, color: "#dc2626" }}>⚠ Submission failed</div><pre style={{ fontSize: 11, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{msg}</pre></>}
    </div>
  );
}

function LoadingScreen({ taskId, label, accent }) {
  return (
    <div style={s.page}>
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <div style={{ ...s.spinner, borderTopColor: accent }} />
        <p style={{ color: "#64748b", marginTop: 18, fontWeight: 600 }}>Loading task data from BAW…</p>
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 6, fontFamily: "monospace" }}>
          GET /rest/bpm/wle/v1/task/{taskId}?action=getData&fields={label}
        </p>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  breadcrumb:  { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  backBtn:     { fontSize: 13, fontWeight: 600, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 },
  spinner:     { width: 44, height: 44, border: "4px solid #e2e8f0", borderTopColor: "#1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  card:        { width: "100%", maxWidth: 960, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" },
  grid:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 },
  label:       { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  reqTag:      { marginLeft: 6, fontSize: 11, fontWeight: 500, color: "#dc2626" },
  input:       { width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" },
  readBox:     { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#334155", lineHeight: 1.6 },
  debugPre:    { marginTop: 8, background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 11, color: "#334155", overflowX: "auto", border: "1px solid #e2e8f0", lineHeight: 1.6 },
  btnPrimary:  { padding: "10px 28px", borderRadius: 8, fontWeight: 700, fontSize: 13, color: "#fff", border: "none" },
  btnSecondary:{ padding: "10px 24px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#fff", color: "#374151", cursor: "pointer" },
  btnDark:     { marginTop: 20, padding: "10px 24px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" },
};