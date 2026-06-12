import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// SiteSurvey.jsx  (with real FileNet Document Upload tab)
// ─────────────────────────────────────────────────────────────────────────────

const AUTH         = "Basic " + btoa("bawadmin:sarasu10");
const ACCENT       = "#a52c33";
const FILENET_BASE = "http://192.168.1.154:8001";

async function fetchTaskData(taskId) {
  const fields = encodeURIComponent("locationResponse,Laq_Status");
  const res = await fetch(
    `/api/rest/bpm/wle/v1/task/${taskId}?action=getData&fields=${fields}`,
    { method: "GET", credentials: "include", headers: { Authorization: AUTH, Accept: "application/json" } }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`getData failed — HTTP ${res.status}: ${text.slice(0, 400)}`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0, 300)}`); }
  const resultMap = json?.data?.resultMap;
  if (!resultMap) throw new Error(`resultMap not found.\nGot: ${JSON.stringify(json?.data, null, 2).slice(0, 400)}`);
  return { loc: resultMap.locationResponse ?? {}, laqStatus: resultMap.Laq_Status ?? "" };
}

async function completeTask(taskId, laqStatus, comment) {
  const params = JSON.stringify({ Laq_Status: laqStatus, sitesurveyComment: comment });
  const url = `/api/rest/bpm/wle/v1/task/${taskId}?action=complete&params=${encodeURIComponent(params)}&parts=all`;
  const res = await fetch(url, { method: "PUT", credentials: "include", headers: { Authorization: AUTH, Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`complete failed — HTTP ${res.status}: ${text.slice(0, 400)}`);
}

export default function SiteSurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId   = searchParams.get("taskId")   || "";
  const taskName = searchParams.get("taskName") || "Site Survey";

  const [activeTab,   setActiveTab]   = useState("Survey Details");
  const [fetchState,  setFetchState]  = useState("loading");
  const [fetchError,  setFetchError]  = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const [rawData,     setRawData]     = useState(null);

  const [form, setForm] = useState({
    latitude: "", longitude: "", locality: "", city: "",
    principalSubdivision: "", countryName: "", countryCode: "",
    laqStatus: "", sitesurveyComment: "",
  });

  useEffect(() => {
    if (!taskId) { setFetchState("error"); setFetchError("No taskId in URL."); return; }
    (async () => {
      try {
        const { loc, laqStatus } = await fetchTaskData(taskId);
        setRawData({ locationResponse: loc, Laq_Status: laqStatus });
        setForm({
          latitude: String(loc.latitude ?? ""), longitude: String(loc.longitude ?? ""),
          locality: loc.locality ?? "", city: loc.city ?? "",
          principalSubdivision: loc.principalSubdivision ?? "",
          countryName: loc.countryName ?? "", countryCode: loc.countryCode ?? "",
          laqStatus, sitesurveyComment: "",
        });
        setFetchState("ready");
      } catch (e) { setFetchError(e.message); setFetchState("error"); }
    })();
  }, [taskId]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState("submitting"); setSubmitError("");
    try {
      await completeTask(taskId, form.laqStatus, form.sitesurveyComment);
      setSubmitState("done");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) { setSubmitState("error"); setSubmitError(err.message); }
  };

  if (fetchState === "loading") return (
    <div style={s.page}>
      <PageHeader taskId={taskId} taskName={taskName} onBack={() => navigate("/")} />
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <div style={{ ...s.spinner, borderTopColor: ACCENT }} />
        <p style={{ color: "#64748b", marginTop: 18, fontWeight: 600 }}>Loading task data from BAW…</p>
      </div>
    </div>
  );

  if (fetchState === "error") return (
    <div style={s.page}>
      <PageHeader taskId={taskId} taskName={taskName} onBack={() => navigate("/")} />
      <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px" }}>
        <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ background: "#dc2626", padding: "20px 24px" }}>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 18, margin: 0 }}>⚠ Failed to load task</h2>
          </div>
          <div style={{ padding: 24 }}>
            <pre style={{ fontSize: 12, color: "#7f1d1d", background: "#fff1f2", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{fetchError}</pre>
            <button onClick={() => navigate("/")} style={s.btnDark}>← Back to Worklist</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <PageHeader taskId={taskId} taskName={taskName} onBack={() => navigate("/")} />

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {["Survey Details", "Document Upload"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "12px 32px", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
              background: activeTab === tab ? ACCENT : "#fff",
              color: activeTab === tab ? "#fff" : "#374151",
              transition: "background 0.15s",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* ── Survey Details tab ─────────────────────────────────────────── */}
      {activeTab === "Survey Details" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 48px" }}>
          <div style={s.card}>
            {/* Card header */}
            <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", padding: "24px 32px", borderBottom: `3px solid ${ACCENT}` }}>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>{taskName}</h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4, letterSpacing: "0.3px" }}>
                Task #{taskId} · BAW data loaded · Submit to complete and advance token
              </p>
            </div>

            <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "10px 32px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
              ✅ Data fetched from BAW — locationResponse + Laq_Status populated
            </div>

            {submitState === "done" && <div style={{ ...s.alert, background: "#f0fdf4", borderLeftColor: "#16a34a", color: "#15803d" }}>✅ Task completed! Returning to worklist…</div>}
            {submitState === "error" && (
              <div style={{ ...s.alert, background: "#fff1f2", borderLeftColor: "#dc2626" }}>
                <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 13 }}>⚠ Submission failed</div>
                <pre style={{ fontSize: 11, color: "#7f1d1d", marginTop: 6, whiteSpace: "pre-wrap" }}>{submitError}</pre>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ padding: "24px 32px" }}>
              <div style={s.grid}>
                {[
                  ["latitude", "Latitude", "number"],
                  ["longitude", "Longitude", "number"],
                  ["locality", "Locality", "text"],
                  ["city", "City", "text"],
                  ["principalSubdivision", "State / Province", "text"],
                  ["countryName", "Country", "text"],
                  ["countryCode", "Country Code", "text"],
                ].map(([name, label, type]) => (
                  <div key={name}>
                    <label style={s.label}>{label} <span style={s.bawTag}>← BAW</span></label>
                    <input type={type} step={type === "number" ? "any" : undefined}
                      name={name} value={form[name]} onChange={handleChange}
                      placeholder={label} maxLength={name === "countryCode" ? 3 : undefined}
                      style={s.input} />
                  </div>
                ))}
                <div>
                  <label style={s.label}>LAQ Status <span style={s.bawTag}>← BAW</span> <span style={s.userTag}>· editable</span></label>
                  <select name="laqStatus" value={form.laqStatus} onChange={handleChange} required style={s.input}>
                    <option value="">Select Status</option>
                    <option value="surveyPending">Survey Pending</option>
                    <option value="surveyCompleted">Survey Completed</option>
                    <option value="civilBoardReviewCompleted">Civil Board Review Completed</option>
                    <option value="electricalBoardReviewCompleted">Electrical Board Review Completed</option>
                    <option value="sst">SST</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Site Survey Comment <span style={s.userTag}>← fill in</span></label>
                  <textarea name="sitesurveyComment" value={form.sitesurveyComment} onChange={handleChange}
                    rows={4} placeholder="Enter site survey comments…" style={{ ...s.input, resize: "vertical" }} />
                </div>
              </div>

              {rawData && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer", userSelect: "none" }}>🔍 Raw BAW response (debug)</summary>
                  <pre style={{ marginTop: 8, background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 11, color: "#334155", overflowX: "auto", border: "1px solid #e2e8f0" }}>{JSON.stringify(rawData, null, 2)}</pre>
                </details>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => navigate("/")} style={s.btnSecondary}>Cancel</button>
                <button type="submit" disabled={submitState === "submitting" || submitState === "done"}
                  style={{ ...s.btnPrimary, background: submitState === "submitting" ? "#cbd5e1" : ACCENT, cursor: submitState === "submitting" ? "not-allowed" : "pointer", opacity: submitState === "done" ? 0.7 : 1 }}>
                  {submitState === "submitting" ? "⏳ Saving to BAW…" : submitState === "done" ? "✅ Done" : "Submit & Complete Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Document Upload tab ──────────────────────────────────────────── */}
      {activeTab === "Document Upload" && (
        <FileNetUploadTab taskId={taskId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FileNetUploadTab — full port of DocumentUpload.jsx (no MUI/axios needed)
// API: POST http://192.168.1.154:8001/upload-pdf   (multipart)
//      GET  http://192.168.1.154:8001/get-all-pdfs
//      GET  http://192.168.1.154:8001/view-pdf/:objectId
// ─────────────────────────────────────────────────────────────────────────────
function FileNetUploadTab({ taskId }) {
  const [file,        setFile]        = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [message,     setMessage]     = useState("");
  const [msgType,     setMsgType]     = useState("success");
  const [uploading,   setUploading]   = useState(false);
  const [documents,   setDocuments]   = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [dragOver,    setDragOver]    = useState(false);
  const [activePdf,   setActivePdf]   = useState(null); // side-by-side viewer

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${FILENET_BASE}/get-all-pdfs`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Handle both {documents:[]} and plain array responses
      const docs = Array.isArray(data) ? data : (data.documents ?? []);
      setDocuments(docs);
    } catch (err) {
      console.error("FileNet fetch error:", err);
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type === "application/pdf") { setFile(dropped); setMessage(""); setProgress(0); }
    else { setMsgType("warning"); setMessage("Only PDF files are accepted."); }
  };
  const handleFileInput = (e) => {
    const picked = e.target.files?.[0];
    if (picked) { setFile(picked); setMessage(""); setProgress(0); }
  };

  const handleUpload = async () => {
    if (!file) { setMsgType("warning"); setMessage("Please select a PDF file first."); return; }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true); setMessage(""); setProgress(0);
    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${FILENET_BASE}/upload-pdf`);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100));
        };
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`)); }
        };
        xhr.onerror = () => reject(new Error("Network error — could not reach FileNet server."));
        xhr.send(formData);
      });
      if (result.status === "SUCCESS") {
        setMsgType("success");
        setMessage(`✅ "${result.file_name}" uploaded successfully to FileNet.`);
        setFile(null); setProgress(0);
        await fetchDocuments();
      } else {
        setMsgType("error");
        setMessage(result.message || "Upload failed — unknown error.");
      }
    } catch (err) { setMsgType("error"); setMessage(err.message || "Upload failed."); }
    finally { setUploading(false); }
  };

  const msgColors = {
    success: { bg: "#f0fdf4", border: "#16a34a", color: "#15803d" },
    error:   { bg: "#fff1f2", border: "#dc2626", color: "#7f1d1d" },
    warning: { bg: "#fffbeb", border: "#d97706", color: "#92400e" },
  };

  return (
    <div style={{ display: "flex", gap: 24, padding: "24px 24px 48px", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>

      {/* ── Left panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: activePdf ? "48%" : "100%", maxWidth: activePdf ? "none" : 900, transition: "width 0.3s ease" }}>

        {/* Upload card */}
        <div style={{ ...s.card }}>
          <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", padding: "24px 32px", borderBottom: `3px solid ${ACCENT}` }}>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>📎 Document Upload</h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4 }}>Task #{taskId} · Upload PDF documents to FileNet</p>
          </div>

          <div style={{ padding: "28px 32px" }}>
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => document.getElementById("fn-file-input")?.click()}
              style={{
                border: `2px dashed ${dragOver ? ACCENT : "#93c5fd"}`,
                borderRadius: 12, padding: "44px 24px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "#eff6ff" : "#f8fafc", transition: "all 0.2s", userSelect: "none",
              }}
            >
              <input id="fn-file-input" type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleFileInput} />
              <div style={{ fontSize: 52, marginBottom: 12 }}>☁️</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#1e40af", margin: "0 0 6px" }}>Drag & Drop PDF Here</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>or click to browse — PDF files only</p>
            </div>

            {/* Selected file */}
            {file && (
              <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "#f8fafc" }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{(file.size / 1024).toFixed(2)} KB</div>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setProgress(0); setMessage(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: 4 }}>✕</button>
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: ACCENT, borderRadius: 99, transition: "width 0.3s" }} />
                </div>
                <p style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 6 }}>{progress}%</p>
              </div>
            )}

            {/* Upload button */}
            <button type="button" onClick={handleUpload} disabled={uploading}
              style={{ width: "100%", marginTop: 20, padding: "13px 0", background: uploading ? "#cbd5e1" : ACCENT, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: uploading ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
              {uploading ? "⏳ Uploading to FileNet…" : "⬆ Upload PDF to FileNet"}
            </button>

            {/* Status message */}
            {message && (
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, border: `1px solid ${msgColors[msgType].border}`, background: msgColors[msgType].bg, color: msgColors[msgType].color, fontSize: 13, fontWeight: msgType === "success" ? 600 : 400 }}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Documents list card */}
        <div style={{ ...s.card }}>
          <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", padding: "18px 32px", borderBottom: `3px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>📁 FileNet Repository</h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 3 }}>{documents.length} document{documents.length !== 1 ? "s" : ""} stored</p>
            </div>
            <button type="button" onClick={fetchDocuments} disabled={docsLoading}
              style={{ fontSize: 12, padding: "6px 14px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", cursor: docsLoading ? "not-allowed" : "pointer", fontWeight: 600 }}>
              {docsLoading ? "⏳" : "↻ Refresh"}
            </button>
          </div>

          <div style={{ padding: "20px 24px" }}>
            {docsLoading ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "#94a3b8", fontSize: 13 }}>
                <div style={{ ...s.spinner, borderTopColor: ACCENT, width: 28, height: 28, margin: "0 auto 12px" }} />
                Loading documents from FileNet…
              </div>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "2px dashed #e2e8f0" }}>
                📭 No documents uploaded yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                {documents.map((doc) => {
                  const viewUrl = `${FILENET_BASE}/view-pdf/${encodeURIComponent(doc.objectId)}`;
                  const isActive = activePdf === viewUrl;
                  return (
                    <div key={doc.objectId} style={{
                      border: `1px solid ${isActive ? "#93c5fd" : "#e2e8f0"}`,
                      borderRadius: 10, padding: "12px 16px", background: isActive ? "#eff6ff" : "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 3 }}>📄 {doc.name || doc.fileName}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          🆔 <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>{doc.objectId}</code>
                          <span style={{ margin: "0 8px" }}>·</span>
                          🕐 {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => setActivePdf(isActive ? null : viewUrl)}
                        style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${isActive ? "#1d4ed8" : "#e2e8f0"}`, background: isActive ? "#1d4ed8" : "#fff", color: isActive ? "#fff" : "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {isActive ? "✕ Close" : "👁 View"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Side-by-side PDF viewer ── */}
      {activePdf && (
        <div style={{ width: "48%", minWidth: 320, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", overflow: "hidden", position: "sticky", top: 80, height: "82vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: "linear-gradient(135deg,#0d0d0d,#1a1a1a)", borderBottom: `2px solid ${ACCENT}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>📄 Document Preview</span>
            <button type="button" onClick={() => setActivePdf(null)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 14, padding: "4px 10px", fontWeight: 600 }}>✕</button>
          </div>
          <div style={{ flex: 1, background: "#525659" }}>
            <iframe src={activePdf} title="Document Preview" width="100%" height="100%" style={{ border: "none" }} />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:         { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif" },
  spinner:      { width: 44, height: 44, border: "4px solid #e2e8f0", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
  card:         { width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" },
  grid:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  label:        { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  bawTag:       { marginLeft: 6, fontSize: 11, fontWeight: 500, color: "#16a34a" },
  userTag:      { marginLeft: 6, fontSize: 11, fontWeight: 500, color: "#d97706" },
  input:        { width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" },
  alert:        { margin: "16px 32px 0", borderLeft: "4px solid", borderRadius: 8, padding: "14px 18px", border: "1px solid #e2e8f0" },
  btnPrimary:   { padding: "10px 28px", borderRadius: 8, fontWeight: 700, fontSize: 13, color: "#fff", border: "none" },
  btnSecondary: { padding: "10px 24px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#fff", color: "#374151", cursor: "pointer" },
  btnDark:      { marginTop: 20, padding: "10px 24px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" },
};