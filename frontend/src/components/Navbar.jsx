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
    { label: 'Preparation', path: '/preparation', icon: Bot },
    { label: 'Evolution', path: '/evolution', icon: TrendingUp },
    { label: 'Training', path: '/training', icon: GraduationCap },
    { label: 'AI Coach', path: '/coach', icon: MessageSquare },
    { label: 'My AI', path: '/my-ai', icon: Bot },
    { label: 'AI Arena', path: '/arena', icon: Globe },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 glass border-b border-[#181A24] px-4 lg:px-8 py-3 bg-[#06070B]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-3 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)' }}
          >
            <Zap className="w-5 h-5 text-[#040406]" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight font-display text-gold-gradient">
              CHESS EVOLVE
            </span>
            <span className="block text-[10px] text-[#C5A059] font-semibold tracking-wider uppercase">
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
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gold-500/15 text-[#D4B46A] border border-gold-500/30 shadow-sm'
                    : 'text-[#8A8D9F] hover:text-[#D4B46A] hover:bg-gold-500/10'
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
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0D0E14] border border-[#181A24] hover:border-gold-500/40 transition-colors shadow-sm"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #B58D3D, #926E28)', color: '#040406' }}
            >
              {user.email?.charAt(0).toUpperCase() || 'P'}
            </div>
            <span className="text-xs font-semibold text-[#F3EFE6] hidden sm:inline">
              {user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Player'}
            </span>
          </Link>

          <button
            onClick={signOut}
            title="Sign Out"
            className="p-2 rounded-xl text-[#7E8092] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
