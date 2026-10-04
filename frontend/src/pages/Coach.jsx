import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RotateCcw } from 'lucide-react';
import { sendCoachMessage } from '../api';

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    content: "Hello! I'm your AI Chess Coach, powered by your game analysis. I've studied all your games and your Chess DNA profile. I'm here to help you improve.\n\nYou can ask me things like:\n• *\"Why do I keep losing in the endgame?\"*\n• *\"How can I improve my opening play?\"*\n• *\"What should I focus on this week?\"*\n• *\"Analyze my Sicilian games\"*\n\nWhat would you like to work on today?",
    timestamp: new Date(),
  },
];

const DEMO_RESPONSES = [
  "Based on your Chess DNA analysis, your tactical sharpness (79%) is your strongest asset. I recommend exploiting this in sharp positions where you can create complications.",
  "Looking at your recent games, you tend to struggle in rook endgames — your win rate drops to 42% in technically won positions. I'd suggest studying Capablanca's rook endgame technique.",
  "Your Sicilian Defense win rate of 61% is excellent! However, I notice you often miss the thematic d5 break. Timing this correctly could improve your win rate by 8-10%.",
  "Your time management shows a clear pattern: you spend too long on moves 20-30 and rush the critical endgame phase. Try allocating your time more evenly.",
  "I've identified 3 recurring blunder patterns in your games: back-rank weaknesses (34 occurrences), undefended pieces in complex positions (28 occurrences), and missed defensive resources when under pressure.",
];

let demoIdx = 0;

const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
          <Bot size={13} style={{ color: '#080808' }} />
        </div>
      )}
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={isUser ? {
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
          color: '#F5F0E0',
          border: '1px solid rgba(212,175,55,0.25)',
          borderTopRightRadius: '4px',
        } : {
          background: '#141414',
          color: '#C0A060',
          border: '1px solid #1A1A1A',
          borderTopLeftRadius: '4px',
        }}
      >
        {msg.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
        ))}
        <div className="text-xs mt-2 opacity-40">
          {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-2 mt-0.5"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <User size={13} style={{ color: '#D4AF37' }} />
        </div>
      )}
    </div>
  );
};

const SUGGESTED = [
  "Why do I keep losing won positions?",
  "Analyze my endgame weaknesses",
  "Best openings for my style?",
  "How can I improve this week?",
];

const Coach = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendCoachMessage(content);
      const reply = res.data?.data?.message || res.data?.message;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply || DEMO_RESPONSES[demoIdx++ % DEMO_RESPONSES.length],
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: DEMO_RESPONSES[demoIdx++ % DEMO_RESPONSES.length],
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => setMessages(INITIAL_MESSAGES);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>AI Chess Coach</h2>
          <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Personalized coaching based on your game history</p>
        </div>
        <button onClick={handleReset} className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ color: '#4A4A4A', border: '1px solid #1A1A1A' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4A4A4A'; e.currentTarget.style.borderColor = '#1A1A1A'; }}>
          <RotateCcw size={11} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
        <div className="flex-1 overflow-y-auto p-5">
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
                <Bot size={13} style={{ color: '#080808' }} />
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: '#141414', border: '1px solid #1A1A1A' }}>
                <div className="flex space-x-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#D4AF37', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: 'rgba(212,175,55,0.06)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.06)'}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit}
          className="flex items-center space-x-3 px-4 py-3"
          style={{ borderTop: '1px solid #141414' }}>
          <Sparkles size={14} style={{ color: '#D4AF37', flexShrink: 0 }} />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your AI coach anything..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm"
            style={{ color: '#F5F0E0', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : '#1A1A1A',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}>
            <Send size={13} style={{ color: input.trim() ? '#080808' : '#3A3A3A' }} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Coach;
