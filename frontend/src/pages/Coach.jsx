import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Bot, Lightbulb, Activity, ArrowRight, ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { sendCoachMessage, getCoachInsights, getGames } from '../api';

const Coach = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello. I'm your personalized Chess Evolve Coach. I analyze your DNA and games. What would you like to improve today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [recentGames, setRecentGames] = useState([]);

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const insRes = await getCoachInsights();
        if (insRes.data?.insights) {
          setInsights(insRes.data.insights);
        }
        
        const gamesRes = await getGames({ limit: 5 });
        if (gamesRes.data?.games) {
          setRecentGames(gamesRes.data.games);
        }
      } catch (err) {
        console.error("Failed to load coach insights", err);
      } finally {
        setLoadingInsights(false);
      }
    }
    loadInitialData();
  }, []);

  const handleSend = async (text, gameId = null) => {
    const q = text || input;
    if (!q.trim() && !gameId) return;

    if (q.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: q }]);
    }
    setInput('');
    setLoading(true);

    try {
      const res = await sendCoachMessage(q, conversationId, gameId);
      const reply = res.data?.response || res.data?.reply || "I'm having trouble analyzing your request right now. Try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (res.data?.conversationId) {
        setConversationId(res.data.conversationId);
      }
    } catch (err) {
      console.error('Coach error', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect to the coaching service. Please try again later." }]);
    }
    setLoading(false);
  };

  const getSeverityColor = (severity) => {
    if (severity === 'HIGH') return '#ef4444';
    if (severity === 'MEDIUM') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(184,150,12,0.1))', border: '1px solid rgba(212,175,55,0.3)' }}>
          <Brain size={24} style={{ color: '#D4AF37' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: '#F5F0E0' }}>Personalized AI Coach</h1>
          <p className="text-sm" style={{ color: '#888' }}>Evidence-based improvement tailored to your exact playstyle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[65vh]">
        
        {/* Left Column: Quick Actions & Insights */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-5 rounded-2xl" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#888' }}>
              <Lightbulb size={16} style={{ color: '#D4AF37' }} /> Recommended Questions
            </h2>
            <div className="space-y-2">
              {[
                "What is my biggest weakness?",
                "How am I improving?",
                "Compare me with Peak Self",
                "What should I practice?"
              ].map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl transition-all flex items-center justify-between group"
                  style={{ background: '#141414', border: '1px solid #222', color: '#D1D1D1' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#222' }}>
                  <span>{q}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D4AF37' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
             <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#888' }}>
              <ShieldAlert size={16} style={{ color: '#ef4444' }} /> Detected Weaknesses
            </h2>
            {loadingInsights ? (
              <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-gray-500" /></div>
            ) : insights.length === 0 ? (
               <p className="text-sm text-center py-4" style={{ color: '#555' }}>
                 Play more games to unlock personalized insights.
               </p>
            ) : (
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: '#141414', border: '1px solid #222' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: '#111', color: getSeverityColor(ins.severity) }}>
                        {ins.category}
                      </span>
                      <span className="text-[10px] text-gray-500">{ins.evidenceCount} instances</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{ins.summary}</p>
                    <button onClick={() => handleSend(`How can I fix my ${ins.category.toLowerCase()} weakness?`)}
                      className="text-xs font-medium hover:underline" style={{ color: '#D4AF37' }}>
                      Ask Coach to fix this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {recentGames.length > 0 && (
             <div className="p-5 rounded-2xl" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
               <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#888' }}>
                <Activity size={16} style={{ color: '#3b82f6' }} /> Recent Games
              </h2>
              <div className="space-y-2">
                {recentGames.map((g) => (
                  <div key={g.id} className="flex justify-between items-center p-3 rounded-xl" style={{ background: '#141414', border: '1px solid #222' }}>
                    <div>
                      <span className={`text-xs font-bold ${g.result === 'WIN' ? 'text-green-500' : g.result === 'LOSS' ? 'text-red-500' : 'text-gray-400'}`}>
                        {g.result}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">vs {g.opponentUsername} ({g.opponentRating})</p>
                    </div>
                    <button onClick={() => handleSend(`Analyze my recent game against ${g.opponentUsername} where I got a ${g.result}.`, g.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#1A1A1A', color: '#D4AF37', border: '1px solid #2A2A2A' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#222'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}>
                      Analyze
                    </button>
                  </div>
                ))}
              </div>
             </div>
          )}
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl overflow-hidden h-full"
          style={{ background: '#080808', border: '1px solid #1A1A1A' }}>
          
          <div className="px-6 py-4 flex items-center space-x-3" style={{ borderBottom: '1px solid #1A1A1A', background: '#0F0F0F' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Bot size={20} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: '#F5F0E0' }}>Live Coaching Session</h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] tracking-widest uppercase" style={{ color: '#4A4A4A' }}>Online</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: '#050505' }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-end max-w-[85%] space-x-2">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-md flex shrink-0 items-center justify-center"
                        style={{ background: '#111', border: '1px solid #222' }}>
                        <Bot size={14} style={{ color: '#D4AF37' }} />
                      </div>
                    )}
                    <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-sans"
                      style={{
                        background: isUser ? '#D4AF37' : '#141414',
                        color: isUser ? '#080808' : '#D1D1D1',
                        border: isUser ? 'none' : '1px solid #222',
                        borderBottomRightRadius: isUser ? '4px' : '16px',
                        borderBottomLeftRadius: !isUser ? '4px' : '16px',
                      }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-end space-x-2">
                  <div className="w-6 h-6 rounded-md flex shrink-0 items-center justify-center"
                    style={{ background: '#111', border: '1px solid #222' }}>
                    <Bot size={14} style={{ color: '#D4AF37' }} />
                  </div>
                  <div className="px-5 py-4 rounded-2xl text-sm"
                    style={{ background: '#141414', border: '1px solid #222', borderBottomLeftRadius: '4px' }}>
                    <div className="flex space-x-1.5 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4" style={{ background: '#0F0F0F', borderTop: '1px solid #1A1A1A' }}>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Message your coach..."
                className="w-full pl-5 pr-14 py-4 rounded-xl text-sm"
                style={{ background: '#141414', border: '1px solid #222', color: '#F5F0E0', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = '#222'}
                disabled={loading}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="absolute right-3 p-2.5 rounded-lg transition-all"
                style={{
                  background: input.trim() ? '#D4AF37' : '#222',
                  color: input.trim() ? '#080808' : '#555',
                }}>
                <Send size={18} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Coach;
