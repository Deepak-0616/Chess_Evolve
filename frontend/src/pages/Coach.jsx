import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Bot, Lightbulb, Activity, ArrowRight, ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendCoachMessage, getCoachInsights, getGames } from '../api';

const Coach = () => {
  const { chessProfile } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: chessProfile?.chessUsername ? `Hello @${chessProfile.chessUsername}! I'm your personalized Chess Evolve Coach. I analyze your DNA and games. What would you like to improve today?` : "Hello. I'm your personalized Chess Evolve Coach. I analyze your DNA and games. What would you like to improve today?" }
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
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(197,160,89,0.18), rgba(155,120,48,0.1))', border: '1px solid rgba(197,160,89,0.3)' }}>
          <Brain size={24} style={{ color: '#D4B46A' }} />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold font-display" style={{ color: '#F3EFE6' }}>
              {chessProfile?.chessUsername ? `AI Coach for @${chessProfile.chessUsername}` : 'Personalized AI Coach'}
            </h1>
            {chessProfile?.chessUsername && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                Synced
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: '#7E8092' }}>Evidence-based improvement tailored to your exact playstyle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[65vh]">
        
        {/* Left Column: Quick Actions & Insights */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-5 rounded-2xl" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#8A8D9F' }}>
              <Lightbulb size={16} style={{ color: '#D4B46A' }} /> Recommended Questions
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
                  style={{ background: '#0E1017', border: '1px solid #181A24', color: '#D5D7E2' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,160,89,0.4)'; e.currentTarget.style.color = '#F3EFE6'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#181A24'; e.currentTarget.style.color = '#D5D7E2'; }}>
                  <span>{q}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D4B46A' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
             <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#8A8D9F' }}>
              <ShieldAlert size={16} style={{ color: '#ef4444' }} /> Detected Weaknesses
            </h2>
            {loadingInsights ? (
              <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-[#C5A059]" /></div>
            ) : insights.length === 0 ? (
               <p className="text-sm text-center py-4" style={{ color: '#7E8092' }}>
                 Play more games to unlock personalized insights.
               </p>
            ) : (
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i} className="p-3.5 rounded-xl" style={{ background: '#0E1017', border: '1px solid #181A24' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#12141C', color: getSeverityColor(ins.severity) }}>
                        {ins.category}
                      </span>
                      <span className="text-[10px] text-[#7E8092]">{ins.evidenceCount} instances</span>
                    </div>
                    <p className="text-sm text-[#D5D7E2] mb-2">{ins.summary}</p>
                    <button onClick={() => handleSend(`How can I fix my ${ins.category.toLowerCase()} weakness?`)}
                      className="text-xs font-semibold hover:underline" style={{ color: '#D4B46A' }}>
                      Ask Coach to fix this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {recentGames.length > 0 && (
             <div className="p-5 rounded-2xl" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
               <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#8A8D9F' }}>
                <Activity size={16} style={{ color: '#3b82f6' }} /> Recent Games
              </h2>
              <div className="space-y-2">
                {recentGames.map((g) => (
                  <div key={g.id} className="flex justify-between items-center p-3 rounded-xl" style={{ background: '#0E1017', border: '1px solid #181A24' }}>
                    <div>
                      <span className={`text-xs font-bold ${g.result === 'WIN' ? 'text-green-400' : g.result === 'LOSS' ? 'text-red-400' : 'text-[#D4B46A]'}`}>
                        {g.result}
                      </span>
                      <p className="text-[10px] text-[#7E8092] mt-0.5">vs {g.opponentUsername} ({g.opponentRating})</p>
                    </div>
                    <button onClick={() => handleSend(`Analyze my recent game against ${g.opponentUsername} where I got a ${g.result}.`, g.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      style={{ background: 'rgba(197,160,89,0.1)', color: '#D4B46A', border: '1px solid rgba(197,160,89,0.25)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(197,160,89,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(197,160,89,0.1)'}>
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
          style={{ background: '#040406', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
          
          <div className="px-6 py-4 flex items-center space-x-3" style={{ borderBottom: '1px solid #181A24', background: '#08090D' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.25)' }}>
              <Bot size={20} style={{ color: '#D4B46A' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: '#F3EFE6' }}>Live Coaching Session</h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: '#7E8092' }}>Online</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: '#040406' }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-end max-w-[85%] space-x-2">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-md flex shrink-0 items-center justify-center"
                        style={{ background: '#0D0E14', border: '1px solid #181A24' }}>
                        <Bot size={14} style={{ color: '#D4B46A' }} />
                      </div>
                    )}
                    <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-sans"
                      style={{
                        background: isUser ? 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)' : '#0D0E14',
                        color: isUser ? '#040406' : '#E4E2DC',
                        border: isUser ? 'none' : '1px solid #181A24',
                        borderBottomRightRadius: isUser ? '4px' : '16px',
                        borderBottomLeftRadius: !isUser ? '4px' : '16px',
                        boxShadow: isUser ? '0 4px 15px rgba(181, 141, 61, 0.25)' : 'none',
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
                    style={{ background: '#0D0E14', border: '1px solid #181A24' }}>
                    <Bot size={14} style={{ color: '#D4B46A' }} />
                  </div>
                  <div className="px-5 py-4 rounded-2xl text-sm"
                    style={{ background: '#0D0E14', border: '1px solid #181A24', borderBottomLeftRadius: '4px' }}>
                    <div className="flex space-x-1.5 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4" style={{ background: '#08090D', borderTop: '1px solid #181A24' }}>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Message your coach..."
                className="w-full pl-5 pr-14 py-4 rounded-xl text-sm"
                style={{ background: '#0D0E14', border: '1px solid #1E202A', color: '#F3EFE6', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(197,160,89,0.55)'}
                onBlur={e => e.currentTarget.style.borderColor = '#1E202A'}
                disabled={loading}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="absolute right-3 p-2.5 rounded-lg transition-all shadow-md"
                style={{
                  background: input.trim() ? 'linear-gradient(135deg, #B58D3D, #D4B46A)' : '#141622',
                  color: input.trim() ? '#040406' : '#555869',
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
