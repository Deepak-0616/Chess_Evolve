import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Gamepad2, Dna, Brain, BookOpen,
  Trophy, Swords, User, LogOut, Menu, X, ChevronRight,
  Crown, Zap
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/games', icon: Gamepad2, label: 'Games' },
  { path: '/dna', icon: Dna, label: 'Chess DNA' },
  { path: '/training', icon: Brain, label: 'Training' },
  { path: '/coach', icon: BookOpen, label: 'AI Coach' },
  { path: '/arena', icon: Trophy, label: 'Arena' },
  { path: '/play', icon: Swords, label: 'Play AI' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isDevMode, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/');
  };

  const avatarInitial = user?.user_metadata?.full_name?.[0] ||
    user?.email?.[0]?.toUpperCase() || '?';

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080808' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full flex flex-col transition-transform duration-300
          lg:static lg:translate-x-0 w-64 flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: '#0A0A0A',
          borderRight: '1px solid #1A1A1A',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.04]">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="relative w-9 h-9">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)' }}
              >
                <Crown size={18} className="text-black" />
              </div>
              <div
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                style={{ background: '#080808', border: '1px solid #D4AF37' }}
              >
                <Zap size={7} style={{ color: '#D4AF37' }} />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold font-display text-gold-gradient">Chess Evolve</div>
              <div className="text-[10px]" style={{ color: '#4A4A4A' }}>AI Platform</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg"
            style={{ color: '#4A4A4A' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Dev mode badge */}
        {isDevMode && (
          <div className="mx-4 mt-3">
            <div className="px-3 py-1.5 rounded-lg text-xs font-medium text-center"
              style={{ background: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
              Demo Mode
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'text-gold'
                    : 'text-muted hover:text-text-secondary'
                  }
                `}
                style={isActive ? {
                  background: 'rgba(212,175,55,0.1)',
                  color: '#D4AF37',
                  border: '1px solid rgba(212,175,55,0.18)',
                } : {
                  color: '#6B6B6B',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/[0.04]">
          <div className="flex items-center space-x-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}
            >
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: '#F5F0E0' }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: '#4A4A4A' }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-all"
            style={{ color: '#6B6B6B' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B6B6B'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={14} />
            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #1A1A1A', background: '#080808' }}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg"
              style={{ color: '#6B6B6B' }}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-semibold capitalize" style={{ color: '#F5F0E0' }}>
                {navItems.find(n => n.path === location.pathname)?.label || 'Chess Evolve'}
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isDevMode && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                Demo
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#080808' }}>
          <div className="max-w-7xl mx-auto p-5 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
