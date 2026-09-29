import React, { useState } from "react";
import {
  Swords,
  Dna,
  Bot,
  BrainCircuit,
  TrendingUp,
  History,
  Target,
  UserCheck,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export const Navbar = ({ activeTab, setActiveTab, onOpenConnect, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const [profileDropdown, setProfileDropdown] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BrainCircuit },
    { id: "dna", label: "Chess DNA", icon: Dna },
    { id: "play", label: "Play AI", icon: Swords },
    { id: "training", label: "Training", icon: Target },
    { id: "evolution", label: "Evolution", icon: TrendingUp },
    { id: "coach", label: "AI Coach", icon: Bot },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-dark-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab(user ? "dashboard" : "landing")}
          className="flex cursor-pointer items-center space-x-3 transition-transform hover:scale-[1.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 shadow-lg shadow-gold-500/20">
            <Bot className="h-6 w-6 text-dark-900" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white">CHESS</span>
              <span className="text-xl font-extrabold tracking-tight text-gold-gradient">EVOLVE</span>
            </div>
            <p className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">AI Performance Lab</p>
          </div>
        </div>

        {/* Navigation Items */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gold-500/10 text-gold-400 border border-gold-500/30 shadow-sm"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-gold-400" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <button
                onClick={onOpenConnect}
                className="hidden sm:flex items-center space-x-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3.5 py-1.5 text-xs font-semibold text-gold-400 transition-all hover:bg-gold-500/20 hover:shadow-md hover:shadow-gold-500/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{user.chessProfile?.username ? `@${user.chessProfile.username}` : "Connect Chess.com"}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center space-x-2 rounded-lg border border-white/10 bg-dark-800 px-3 py-1.5 text-sm font-medium text-white hover:border-gold-500/40"
                >
                  <UserCheck className="h-4 w-4 text-gold-400" />
                  <span className="max-w-[100px] truncate">{user.displayName}</span>
                </button>

                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-dark-800 py-1.5 shadow-2xl backdrop-blur-lg">
                    <div className="border-b border-white/5 px-4 py-2">
                      <p className="text-xs font-semibold text-white">{user.displayName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        onOpenConnect();
                        setProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gold-400 hover:bg-white/5"
                    >
                      Sync Chess.com
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdown(false);
                        setActiveTab("landing");
                      }}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-2 text-sm font-semibold text-dark-900 transition-all hover:shadow-lg hover:shadow-gold-500/25"
            >
              <LogIn className="h-4 w-4" />
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
