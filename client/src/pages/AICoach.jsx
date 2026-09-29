import React, { useState } from "react";
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const AICoach = () => {
  const [messages, setMessages] = useState([
    {
      sender: "coach",
      text: "Hello! I am your Chess Evolve AI Coach. I have full context on your Chess DNA, recent game archives, accuracy metrics, and recurring weaknesses. What would you like to explore today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(undefined);

  const samplePrompts = [
    "What is my biggest weakness right now?",
    "What openings do I perform best with?",
    "Why do I lose games?",
    "How has my playing style changed?",
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMsgs = [...messages, { sender: "user", text: query }];
    setMessages(newMsgs);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await ApiClient.askCoach(query, conversationId);
      setConversationId(res.conversationId);
      setMessages([...newMsgs, { sender: "coach", text: res.answer }]);
    } catch (err) {
      setMessages([...newMsgs, { sender: "coach", text: "I encountered an error retrieving your analytics data. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Personal Chess Coach</h1>
            <p className="text-xs text-gray-400">Grounded strictly in your stored Chess.com game analytics</p>
          </div>
        </div>

        <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-time Data Context</span>
        </div>
      </div>

      {/* Suggested Prompt Shortcuts */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            className="rounded-xl border border-white/10 bg-dark-800 px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:border-gold-500/40 hover:text-white transition-all"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="glass-panel rounded-3xl p-6 h-[480px] flex flex-col justify-between space-y-4">
        <div className="overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex items-start space-x-3 ${m.sender === "user" ? "justify-end" : ""}`}>
              {m.sender === "coach" && (
                <div className="h-8 w-8 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-gold-500 to-gold-600 font-semibold text-dark-900 shadow-md"
                    : "border border-white/10 bg-dark-900 text-gray-200"
                }`}
              >
                {m.text}
              </div>

              {m.sender === "user" && (
                <div className="h-8 w-8 rounded-xl bg-dark-800 border border-white/10 flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-gold-400 text-xs font-semibold pl-11">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing your Chess DNA metrics...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2 pt-2 border-t border-white/5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything about your chess style, performance, or weaknesses..."
            className="flex-1 rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-xs text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 p-3 text-dark-900 transition-all hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
