import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import Connect from './pages/Connect';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import DNA from './pages/DNA';
import Training from './pages/Training';
import Coach from './pages/Coach';
import Arena from './pages/Arena';
import Play from './pages/Play';
import Profile from './pages/Profile';
import { Preparation } from './pages/Preparation';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-2 border-t-gold-500 rounded-full animate-spin mx-auto"
        style={{ borderColor: '#2A2A2A', borderTopColor: '#D4AF37' }} />
      <p className="text-sm" style={{ color: '#4A4A4A' }}>Loading Chess Evolve...</p>
    </div>
  </div>
);

// Protected route — only accessible when authenticated
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
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
  <Routes>
    <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
    <Route path="/connect" element={<Protected><Connect /></Protected>} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/games" element={<Protected><Games /></Protected>} />
    <Route path="/dna" element={<Protected><DNA /></Protected>} />
    <Route path="/preparation" element={<Protected><Preparation /></Protected>} />
    <Route path="/training" element={<Protected><Training /></Protected>} />
    <Route path="/coach" element={<Protected><Coach /></Protected>} />
    <Route path="/arena" element={<Protected><Arena /></Protected>} />
    <Route path="/play" element={<Protected><Play /></Protected>} />
    <Route path="/profile" element={<Protected><Profile /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AppRoutes />
);

export default App;
