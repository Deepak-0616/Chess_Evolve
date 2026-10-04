import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Connect } from './pages/Connect';
import { Dashboard } from './pages/Dashboard';
import { Games } from './pages/Games';
import { GameAnalysis } from './pages/GameAnalysis';
import { ChessDNA } from './pages/ChessDNA';
import { Evolution } from './pages/Evolution';
import { Training } from './pages/Training';
import { Coach } from './pages/Coach';
import { PlayAI } from './pages/Play';
import { Arena } from './pages/Arena';
import { Profile } from './pages/Profile';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Landing />} />
          <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
          <Route path="/games/:gameId" element={<ProtectedRoute><GameAnalysis /></ProtectedRoute>} />
          <Route path="/analysis" element={<ProtectedRoute><Games /></ProtectedRoute>} />
          <Route path="/dna" element={<ProtectedRoute><ChessDNA /></ProtectedRoute>} />
          <Route path="/evolution" element={<ProtectedRoute><Evolution /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
          <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><PlayAI /></ProtectedRoute>} />
          <Route path="/my-ai" element={<ProtectedRoute><PlayAI /></ProtectedRoute>} />
          <Route path="/arena" element={<ProtectedRoute><Arena /></ProtectedRoute>} />
          <Route path="/arena/:playerId" element={<ProtectedRoute><Arena /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
