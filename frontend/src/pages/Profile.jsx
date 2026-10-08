import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Link2, Settings, Shield, LogOut, Edit3, Check, X, Camera, AlertCircle } from 'lucide-react';
import { getProfile, updateProfile, connectChessProfile } from '../api';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', chessUsername: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getProfile();
        const p = res.data?.profile || res.data?.data;
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
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setEditing(false);
      // Reload profile to refresh stats and linked chess account
      const res = await getProfile();
      const p = res.data?.profile || res.data?.data;
      if (p) setProfile(p);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarInitial = (form.displayName || displayName)[0]?.toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F3EFE6' }}>Profile</h2>
        <p className="text-sm mt-0.5" style={{ color: '#7E8092' }}>Manage your account and preferences</p>
      </div>

      {/* Avatar card */}
      <div className="p-6 rounded-2xl"
        style={{ background: '#0B0C12', border: '1px solid rgba(197, 160, 89, 0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black"
              style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)', color: '#040406' }}>
              {avatarInitial}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ background: '#141622', border: '1px solid #181A24' }}>
              <Camera size={12} style={{ color: '#7E8092' }} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold" style={{ color: '#F3EFE6' }}>{form.displayName || displayName}</h3>
            <p className="text-sm" style={{ color: '#7E8092' }}>{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">

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
            style={{ background: 'rgba(197, 160, 89, 0.1)', color: '#C5A059', border: '1px solid rgba(197, 160, 89, 0.25)' }}>
            <Edit3 size={12} />
            <span>{editing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-5 space-y-3 pt-5" style={{ borderTop: '1px solid #181A24' }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#7E8092' }}>
                Display Name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#06070A', border: '1px solid #181A24', color: '#F3EFE6', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(197, 160, 89, 0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = '#181A24'}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#7E8092' }}>
                Chess.com Username
              </label>
              <input
                type="text"
                value={form.chessUsername}
                onChange={e => setForm(f => ({ ...f, chessUsername: e.target.value }))}
                placeholder="e.g. magnuscarlsen"
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#06070A', border: '1px solid #181A24', color: '#F3EFE6', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(197, 160, 89, 0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = '#181A24'}
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)', color: '#040406' }}>
                <Check size={12} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: '#141622', color: '#7E8092', border: '1px solid #181A24' }}>
                Cancel
              </button>
            </div>
            {error && (
              <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#f87171' }}>
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
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
          {
            label: 'Games Played',
            value: profile?.totalGames ?? '0',
            sub: `${profile?.ratedGames ?? 0} rated · ${profile?.unratedGames ?? 0} unrated`
          },
          { label: 'Win Rate', value: `${profile?.winRate ?? 0}%` },
          { label: 'Peak Rating', value: profile?.peakRating ?? '—' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-xl text-center flex flex-col justify-between min-h-[92px]" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
            <div className="text-xl font-black font-display" style={{
              background: 'linear-gradient(135deg, #E6C87C 0%, #C5A059 45%, #9B7830 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#7E8092' }}>{label}</div>
            {sub && <div className="text-[11px] mt-1 font-semibold" style={{ color: '#C5A059' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
        <div className="flex items-center space-x-2 px-5 py-4 border-b" style={{ borderColor: '#181A24' }}>
          <Settings size={14} style={{ color: '#C5A059' }} />
          <span className="font-bold text-sm" style={{ color: '#F3EFE6' }}>Account Settings</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#181A24' }}>
          {[
            { icon: Link2, label: 'Connect Chess.com Account', desc: 'Sync your games automatically', action: () => navigate('/connect'), color: '#C5A059' },
            { icon: Shield, label: 'Privacy & Security', desc: 'Manage your data and privacy settings', action: () => {}, color: '#4ade80' },
          ].map(({ icon: Icon, label, desc, action, color }) => (
            <button key={label} onClick={action}
              className="w-full flex items-center space-x-4 px-5 py-4 text-left transition-all"
              style={{ borderBottom: '1px solid #181A24' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(197, 160, 89, 0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#F3EFE6' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#7E8092' }}>{desc}</p>
              </div>
              <span style={{ color: '#7E8092' }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}
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
