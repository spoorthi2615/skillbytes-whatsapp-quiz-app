import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/authStore';

// Auth pages (not lazy — small, needed immediately)
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages (lazy loaded)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExamSelection = lazy(() => import('./pages/ExamSelection'));
const QuizSession = lazy(() => import('./pages/QuizSession'));
const Results = lazy(() => import('./pages/Results'));
const Analytics = lazy(() => import('./pages/Analytics'));
const UploadMaterial = lazy(() => import('./pages/UploadMaterial'));
const GeneratedContent = lazy(() => import('./pages/GeneratedContent'));

// Sprint 2+ pages — gracefully fall back if not yet implemented
const Profile = lazy(() =>
  import('./pages/Profile').catch(() => ({
    default: () => (
      <div style={{ color: '#E9EDEF', padding: '40px', textAlign: 'center' }}>
        Profile — Coming in Sprint 2
      </div>
    ),
  }))
);
const History = lazy(() =>
  import('./pages/History').catch(() => ({
    default: () => (
      <div style={{ color: '#E9EDEF', padding: '40px', textAlign: 'center' }}>
        History — Coming in Sprint 4
      </div>
    ),
  }))
);
const Achievements = lazy(() =>
  import('./pages/Achievements').catch(() => ({
    default: () => (
      <div style={{ color: '#E9EDEF', padding: '40px', textAlign: 'center' }}>
        Achievements — Coming in Sprint 3
      </div>
    ),
  }))
);
const Tracks = lazy(() =>
  import('./pages/Tracks').catch(() => ({
    default: () => (
      <div style={{ color: '#E9EDEF', padding: '40px', textAlign: 'center' }}>
        Tracks — Coming in Sprint 4
      </div>
    ),
  }))
);

const Fallback = () => (
  <div style={{
    color: '#E9EDEF', padding: '20px', textAlign: 'center',
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#0B141A',
  }}>
    Loading...
  </div>
);

function ProtectedLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B141A' }}>
      <Navbar />
      {children}
    </div>
  );
}

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="app-container">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#202C33',
            color: '#E9EDEF',
            border: '1px solid #2A3942',
            fontSize: '14px',
          },
        }}
      />
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Public routes — redirect to / if already authenticated */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProtectedLayout><Dashboard /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <ProtectedRoute>
                <ProtectedLayout><ExamSelection /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:chapterId"
            element={
              <ProtectedRoute>
                <QuizSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:sessionId"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <ProtectedLayout><Analytics /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <ProtectedLayout><UploadMaterial /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/generated-content"
            element={
              <ProtectedRoute>
                <ProtectedLayout><GeneratedContent /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProtectedLayout><Profile /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <ProtectedLayout><History /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <ProtectedLayout><Achievements /></ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracks"
            element={
              <ProtectedRoute>
                <ProtectedLayout><Tracks /></ProtectedLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
