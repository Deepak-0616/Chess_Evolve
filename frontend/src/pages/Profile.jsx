import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { User, Shield, CheckCircle2, Loader2 } from 'lucide-react';

export const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [visibility, setVisibility] = useState('PUBLIC');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/profile');
        setProfile(res.data.profile);
        setDisplayName(res.data.profile.displayName || '');
        if (res.data.profile.arenaProfile) {
          setVisibility(res.data.profile.arenaProfile.visibility);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await apiClient.patch('/profile', {
        displayName,
        arenaVisibility: visibility,
      });
      setSavedMsg('Profile settings updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <User className="w-8 h-8 text-emerald-400" />
          <span>User Profile & Security Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account parameters and AI model visibility controls
        </p>
      </div>

      <div className="p-8 rounded-2xl glass-panel space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Connected Chess.com Account
            </label>
            <input
              type="text"
              value={profile.chessProfile?.chessUsername || 'Not connected'}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-white/5 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              AI Arena Visibility Control
            </label>
            <div className="grid grid-cols-3 gap-4">
              {['PRIVATE', 'DISCOVERABLE', 'PUBLIC'].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`py-3 rounded-xl border text-xs font-extrabold transition-all ${
                    visibility === v
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-surface border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              PRIVATE models are accessible only to you. PUBLIC models allow community players to challenge your AI in the Arena while shielding all private game data.
            </p>
          </div>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-glow transition-all"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};
