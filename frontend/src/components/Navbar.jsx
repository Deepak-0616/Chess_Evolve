import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Swords, 
  Dna, 
  TrendingUp, 
  GraduationCap, 
  MessageSquare, 
  Bot, 
  Globe, 
  User, 
  LogOut,
  Zap
} from 'lucide-react';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Games', path: '/games', icon: Swords },
    { label: 'Chess DNA', path: '/dna', icon: Dna },
    { label: 'Evolution', path: '/evolution', icon: TrendingUp },
    { label: 'Training', path: '/training', icon: GraduationCap },
    { label: 'AI Coach', path: '/coach', icon: MessageSquare },
    { label: 'My AI', path: '/my-ai', icon: Bot },
    { label: 'AI Arena', path: '/arena', icon: Globe },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-emerald-400">
              CHESS EVOLVE
            </span>
            <span className="block text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
              AI Decision Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Badge & Logout */}
        <div className="flex items-center space-x-3">
          <Link
            to="/profile"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-emerald-500/50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {user.email?.charAt(0).toUpperCase() || 'P'}
            </div>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'}
            </span>
          </Link>

          <button
            onClick={signOut}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
