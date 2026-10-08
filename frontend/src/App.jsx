import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Pages (Code-split with React.lazy for instant initial bundle loading and faster page navigation)
const Landing = React.lazy(() => import('./pages/Landing'));
const SignIn = React.lazy(() => import('./pages/SignIn'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const Connect = React.lazy(() => import('./pages/Connect'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Games = React.lazy(() => import('./pages/Games'));
const DNA = React.lazy(() => import('./pages/DNA'));
const Evolution = React.lazy(() => import('./pages/Evolution'));
const Training = React.lazy(() => import('./pages/Training'));
const TrainingSessionView = React.lazy(() => import('./pages/TrainingSessionView'));
const TrainingProgressView = React.lazy(() => import('./pages/TrainingProgressView'));
const Coach = React.lazy(() => import('./pages/Coach'));
const Arena = React.lazy(() => import('./pages/Arena'));
const ArenaMatch = React.lazy(() => import('./pages/ArenaMatch'));
const Play = React.lazy(() => import('./pages/Play'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Preparation = React.lazy(() => import('./pages/Preparation').then(m => ({ default: m.Preparation })));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#040406' }}>
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto"
        style={{ borderColor: '#181A24', borderTopColor: '#C5A059' }} />
      <p className="text-sm font-medium tracking-wide" style={{ color: '#7E8092' }}>Loading Chess Evolve...</p>
    </div>
  </div>
);

// Protected route — only accessible when authenticated
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

// Public route — redirects to dashboard if already signed in
const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <React.Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><SignIn /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/connect" element={<Protected><Connect /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/games" element={<Protected><Games /></Protected>} />
      <Route path="/dna" element={<Protected><DNA /></Protected>} />
      <Route path="/evolution" element={<Protected><Evolution /></Protected>} />
      <Route path="/preparation" element={<Protected><Preparation /></Protected>} />
      <Route path="/training" element={<Protected><Training /></Protected>} />
      <Route path="/training/session/:sessionId" element={<Protected><TrainingSessionView /></Protected>} />
      <Route path="/training/progress" element={<Protected><TrainingProgressView /></Protected>} />
      <Route path="/coach" element={<Protected><Coach /></Protected>} />
      <Route path="/arena" element={<Protected><Arena /></Protected>} />
      <Route path="/arena/:matchId" element={<Protected><ArenaMatch /></Protected>} />
      <Route path="/play" element={<Protected><Play /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </React.Suspense>
);

const App = () => (
  <AppRoutes />
);

export default App;
