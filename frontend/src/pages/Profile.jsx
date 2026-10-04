import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Link2, Settings, Shield, LogOut, Edit3, Check, X, Camera } from 'lucide-react';
import { getProfile, updateProfile, connectChessProfile } from '../api';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, signOut, isDevMode } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', chessUsername: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getProfile();
        const p = res.data?.data;
        setProfile(p);
        setForm({
          displayName: p?.displayName || displayName,
          chessUsername: p?.chessUsername || '',
        });
      } catch {
        setForm({ displayName, chessUsername: '' });
      }
      setLoading(false);
    };
    load();
  }, [displayName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarInitial = (form.displayName || displayName)[0]?.toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Profile</h2>
        <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Manage your account and preferences</p>
      </div>

      {/* Avatar card */}
      <div className="p-6 rounded-2xl"
        style={{ background: 'linear-gradient(145deg, #141414, #111111)', border: '1px solid rgba(212,175,55,0.15)', boxShadow: '0 0 30px rgba(212,175,55,0.05)' }}>
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080808' }}>
              {avatarInitial}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
              <Camera size={12} style={{ color: '#4A4A4A' }} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold" style={{ color: '#F5F0E0' }}>{form.displayName || displayName}</h3>
            <p className="text-sm" style={{ color: '#4A4A4A' }}>{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              {isDevMode && (
                <span className="text-xs px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                  Demo Mode
                </span>
              )}
              {profile?.chessUsername && (
                <span className="text-xs px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ♟ {profile.chessUsername}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Edit3 size={12} />
            <span>{editing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-5 space-y-3 pt-5" style={{ borderTop: '1px solid #1A1A1A' }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                Display Name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#080808', border: '1px solid #2A2A2A', color: '#F5F0E0', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                Chess.com Username
              </label>
              <input
                type="text"
                value={form.chessUsername}
                onChange={e => setForm(f => ({ ...f, chessUsername: e.target.value }))}
                placeholder="e.g. magnuscarlsen"
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#080808', border: '1px solid #2A2A2A', color: '#F5F0E0', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
                <Check size={12} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: '#111', color: '#6B6B6B', border: '1px solid #1A1A1A' }}>
                Cancel
              </button>
            </div>
            {saved && (
              <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#4ade80' }}>
                <Check size={12} />
                <span>Profile saved successfully</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Games Played', value: profile?.totalGames || '248' },
          { label: 'Win Rate', value: `${profile?.winRate || 54}%` },
          { label: 'Peak Rating', value: profile?.peakRating || '1,612' },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-xl text-center" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            <div className="text-xl font-black font-display" style={{
              background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
        <div className="flex items-center space-x-2 px-5 py-4 border-b" style={{ borderColor: '#111' }}>
          <Settings size={14} style={{ color: '#D4AF37' }} />
          <span className="font-bold text-sm" style={{ color: '#F5F0E0' }}>Account Settings</span>
        </div>
        <div className="divide-y" style={{ divideColor: '#0F0F0F' }}>
          {[
            { icon: Link2, label: 'Connect Chess.com Account', desc: 'Sync your games automatically', action: () => navigate('/connect'), color: '#D4AF37' },
            { icon: Shield, label: 'Privacy & Security', desc: 'Manage your data and privacy settings', action: () => {}, color: '#4ade80' },
          ].map(({ icon: Icon, label, desc, action, color }) => (
            <button key={label} onClick={action}
              className="w-full flex items-center space-x-4 px-5 py-4 text-left transition-all"
              style={{ borderBottom: '1px solid #111' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#F5F0E0' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>{desc}</p>
              </div>
              <span style={{ color: '#3A3A3A' }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

export default Profile;
