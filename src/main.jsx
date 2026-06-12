import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import LoginPage             from './LoginPage.jsx'
import App                   from './App.jsx'
import SiteSurveyPage        from './SiteSurvey.jsx'
import CivilReviewPage       from './CivilReviewPage.jsx'
import ElectricalReviewPage  from './ElectricalReviewPage.jsx'
import SSTReviewPage         from './SSTReviewPage.jsx'
import ApprovalPage          from './ApprovalPage.jsx'

// Redirect to /login if not authenticated
function Protected({ children }) {
  const { username } = useAuth();
  if (!username) return <Navigate to="/login" replace />;
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <Protected><App /></Protected>
          } />
          <Route path="/survey" element={
            <Protected><SiteSurveyPage /></Protected>
          } />
          <Route path="/civil-review" element={
            <Protected><CivilReviewPage /></Protected>
          } />
          <Route path="/electrical-review" element={
            <Protected><ElectricalReviewPage /></Protected>
          } />
          <Route path="/sst-review" element={
            <Protected><SSTReviewPage /></Protected>
          } />
          <Route path="/approval" element={
            <Protected><ApprovalPage /></Protected>
          } />

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)