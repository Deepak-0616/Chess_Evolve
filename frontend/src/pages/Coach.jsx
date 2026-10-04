import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, User, AlertCircle, Bot } from 'lucide-react';
import { sendCoachMessage } from '../api';

const Coach = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello. I'm your personalized Chess Evolve Coach. I analyze your DNA and games. What would you like to improve today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const q = text || input;
    if (!q.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendCoachMessage(q);
      const reply = res.data?.data?.reply || "I'm having trouble analyzing your request right now. Try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Coach error', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect to the coaching service. Please try again later." }]);
    }
    setLoading(false);
  };

  const suggestions = [
    "What are my biggest weaknesses in the endgame?",
    "How do I handle the Sicilian Defense as White?",
    "Analyze my recent blunders",
    "Suggest a training plan based on my DNA"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto rounded-2xl overflow-hidden"
      style={{ background: '#080808', border: '1px solid #1A1A1A' }}>

      <div className="px-6 py-4 flex items-center space-x-3" style={{ borderBottom: '1px solid #1A1A1A', background: '#0F0F0F' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <Brain size={20} style={{ color: '#D4AF37' }} />
        </div>
        <div>
          <h2 className="font-bold text-sm" style={{ color: '#F5F0E0' }}>Neural Coach</h2>
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
              <div className="flex items-end max-w-[80%] space-x-2">
                {!isUser && (
                  <div className="w-6 h-6 rounded-md flex shrink-0 items-center justify-center"
                    style={{ background: '#111', border: '1px solid #222' }}>
                    <Bot size={14} style={{ color: '#D4AF37' }} />
                  </div>
                )}
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
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
              <div className="px-4 py-3 rounded-2xl text-sm"
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
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSend(s)}
              className="text-[10px] px-3 py-1.5 rounded-full transition-all"
              style={{ background: '#1A1A1A', color: '#888', border: '1px solid #2A2A2A' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#D4AF37'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#888'; }}>
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your coach anything..."
            className="w-full pl-4 pr-12 py-3.5 rounded-xl text-sm"
            style={{ background: '#141414', border: '1px solid #222', color: '#F5F0E0', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
            onBlur={e => e.currentTarget.style.borderColor = '#222'}
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-lg transition-all"
            style={{
              background: input.trim() ? '#D4AF37' : '#222',
              color: input.trim() ? '#080808' : '#555',
            }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Coach;
