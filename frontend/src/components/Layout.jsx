import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Gamepad2, Dna, Brain, BookOpen,
  Trophy, Swords, User, LogOut, Menu, X, ChevronRight,
  Crown, Zap, Link2, CheckCircle2, Sparkles
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
  const { user, signOut, chessProfile } = useAuth();
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
  const connectedHandle = chessProfile?.chessUsername || null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#040406' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/80 lg:hidden backdrop-blur-sm"
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
          background: '#08090D',
          borderRight: '1px solid #161822',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#161822]">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="relative w-9 h-9">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)' }}
              >
                <Crown size={18} className="text-[#040406]" />
              </div>
              <div
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                style={{ background: '#040406', border: '1px solid #C5A059' }}
              >
                <Zap size={7} style={{ color: '#C5A059' }} />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold font-display text-gold-gradient tracking-wide">Chess Evolve</div>
              <div className="text-[10px] tracking-wider uppercase" style={{ color: '#7E8092' }}>AI Platform</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg"
            style={{ color: '#7E8092' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Connected Chess.com Account Status Card */}
        <div className="px-3 pt-3">
          {connectedHandle ? (
            <Link
              to="/profile"
              className="flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: 'linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.03) 100%)',
                border: '1px solid rgba(197, 160, 89, 0.28)',
              }}
              title="Chess.com account synchronized across all pages"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #B58D3D, #D4B46A)', color: '#040406' }}
                >
                  ♟
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate group-hover:text-[#F3EFE6] transition-colors" style={{ color: '#D4B46A' }}>
                    @{connectedHandle}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px]" style={{ color: '#4ade80' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Synced</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={12} className="text-[#D4B46A] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ) : (
            <Link
              to="/profile"
              className="flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 hover:border-amber-400/50 group"
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px dashed rgba(245, 158, 11, 0.3)',
              }}
              title="Connect your Chess.com profile"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Link2 size={13} className="text-amber-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-300/90 truncate">Link Chess.com</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Connect</span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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
                    ? 'font-bold'
                    : 'hover:text-[#D4B46A] hover:bg-[rgba(197,160,89,0.06)]'
                  }
                `}
                style={isActive ? {
                  background: 'rgba(197, 160, 89, 0.12)',
                  color: '#D4B46A',
                  border: '1px solid rgba(197, 160, 89, 0.28)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(197,160,89,0.15)',
                } : {
                  color: '#8A8D9F',
                }}
              >
                <Icon size={16} style={{ color: isActive ? '#D4B46A' : undefined }} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[#161822]">
          <div className="flex items-center space-x-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, #B58D3D, #926E28)', color: '#040406' }}
            >
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: '#F3EFE6' }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: '#7E8092' }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-all"
            style={{ color: '#7E8092' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#7E8092'; e.currentTarget.style.background = 'transparent'; }}
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
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0 backdrop-blur-md"
          style={{ borderBottom: '1px solid #161822', background: '#06070B' }}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg"
              style={{ color: '#7E8092' }}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-semibold capitalize tracking-wide" style={{ color: '#F3EFE6' }}>
                {navItems.find(n => n.path === location.pathname)?.label || 'Chess Evolve'}
              </h1>
            </div>
          </div>

          {/* Top Bar Status Indicator */}
          <div className="flex items-center space-x-2.5">
            {connectedHandle ? (
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:border-[#D4B46A]"
                style={{
                  background: 'rgba(197, 160, 89, 0.08)',
                  border: '1px solid rgba(197, 160, 89, 0.25)',
                  color: '#D4B46A',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">@{connectedHandle}</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Synced</span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:brightness-110"
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#FDE68A',
                }}
              >
                <Link2 size={12} />
                <span>Connect Account</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#040406' }}>
          <div className="max-w-7xl mx-auto p-5 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
