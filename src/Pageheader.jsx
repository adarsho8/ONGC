// PageHeader.jsx — Shared ONGC dark header used on every inner page
// Usage: <PageHeader taskId={taskId} taskName={taskName} onBack={() => navigate("/")} />

export default function PageHeader({ taskId, taskName, onBack, extraRight }) {
  return (
    <>
      <header className="ongc-header">
        <div className="ongc-header__brand">
          {/* Logo block */}
          <div className="ongc-header__logo">
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#fff" strokeWidth="2.5" fill="none"/>
              <path d="M20 8 L20 32 M8 20 L32 20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="5" fill="#fff"/>
            </svg>
          </div>
          <div className="ongc-header__title">
            <span className="ongc-header__name">ONGC</span>
            <span className="ongc-header__sub">Land Acquisition Portal</span>
          </div>
        </div>

        {/* Page label in center */}
        {taskName && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.3px" }}>
            {taskName}
          </div>
        )}

        <div className="ongc-header__right">
          {taskId && (
            <span className="ongc-header__badge">Task #{taskId}</span>
          )}
          {extraRight}
          {onBack && (
            <button className="ongc-header__back" onClick={onBack}>
              ← Worklist
            </button>
          )}
        </div>
      </header>
      <div className="ongc-page-strip" />
    </>
  );
}