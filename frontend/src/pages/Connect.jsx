import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, ArrowRight, CheckCircle, AlertCircle, Loader2, User } from 'lucide-react';
import { connectChessProfile } from '../api';

const Connect = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      await connectChessProfile(username.trim());
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to connect';
      setError(msg.includes('not found')
        ? `Chess.com user "${username}" was not found. Please check the username.`
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => navigate('/dashboard');

  return (
    <div className="max-w-lg mx-auto py-8">
      {/* Card */}
      <div className="rounded-3xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
        {/* Top bar */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #D4AF37, #F0C040, #B8960C)' }} />

        <div className="p-8">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
          >
            <Link2 size={24} style={{ color: '#D4AF37' }} />
          </div>

          <h1 className="text-2xl font-bold font-display mb-2" style={{ color: '#F5F0E0' }}>
            Connect Your Chess.com Account
          </h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: '#6B6B6B' }}>
            Enter your Chess.com username to sync your games and start training your personalized AI model.
          </p>

          {success ? (
            <div className="flex flex-col items-center py-6 text-center space-y-3">
              <CheckCircle size={40} style={{ color: '#4ade80' }} />
              <p className="font-semibold" style={{ color: '#F5F0E0' }}>Successfully Connected!</p>
              <p className="text-sm" style={{ color: '#6B6B6B' }}>Redirecting to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-2 tracking-wide uppercase"
                  style={{ color: '#6B6B6B' }}>
                  Chess.com Username
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4A4A4A' }} />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. magnuscarlsen"
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                    style={{
                      background: '#080808',
                      border: '1px solid #2A2A2A',
                      color: '#F5F0E0',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.boxShadow = 'none'; }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start space-x-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: (loading || !username.trim())
                    ? '#1A1A1A'
                    : 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
                  color: (loading || !username.trim()) ? '#4A4A4A' : '#080808',
                  cursor: (loading || !username.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Connect Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px" style={{ background: '#1A1A1A' }} />
            <span className="px-3 text-xs" style={{ color: '#3A3A3A' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#1A1A1A' }} />
          </div>

          <button
            onClick={handleSkip}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', color: '#6B6B6B', border: '1px solid #1A1A1A' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#C0A060'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B6B6B'; }}
          >
            Skip for now — explore with demo data
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-4 rounded-2xl text-xs space-y-1" style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', color: '#4A4A4A' }}>
        <p>✓ We only read your public game history via the Chess.com API</p>
        <p>✓ No password or account access is required</p>
        <p>✓ You can connect or change your account anytime in Profile settings</p>
      </div>
    </div>
  );
};

export default Connect;
