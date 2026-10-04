import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';

export const Coach = () => {
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'COACH',
      text: 'Hello! I am your AI Chess Evolve Grandmaster Coach. I have inspected your analyzed game history, Stockfish evaluation trends, and Chess DNA metrics. Ask me anything about your opening choices, tactical weaknesses, or Peak Self improvement strategy!',
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || isSending) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setIsSending(true);

    try {
      const res = await apiClient.post('/coach/chat', { message: userText });
      setMessages((prev) => [...prev, { sender: 'COACH', text: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'COACH', text: 'I am reviewing your position details. Ask again shortly!' }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <MessageSquare className="w-8 h-8 text-emerald-400" />
          <span>AI Grandmaster Coach</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Natural language strategic advice powered by your real Stockfish evaluations and Chess DNA metrics
        </p>
      </div>

      <div className="p-6 rounded-2xl glass-panel flex flex-col h-[550px]">
        {/* Messages Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${m.sender === 'USER' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.sender === 'COACH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {m.sender === 'COACH' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm max-w-[80%] whitespace-pre-line leading-relaxed ${
                m.sender === 'USER'
                  ? 'bg-emerald-500/20 text-slate-100 border border-emerald-500/30'
                  : 'bg-surface border border-white/10 text-slate-200'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Coach is analyzing your position query...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-white/10 flex items-center space-x-3">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Ask the AI Coach (e.g. 'How can I fix my middlegame blunders?')"
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isSending}
            className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-glow transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
