import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What products are available today?',
  'What are your delivery charges?',
  'Which oil is suitable for everyday cooking?',
  'Track my order',
];

export const CustomerSupportWidget: React.FC = () => {
  const { user, openLoginModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I can help with products, prices, availability, delivery, policies, and your orders. I answer in English using verified store information.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (value?: string) => {
    const question = (value ?? input).trim();
    if (!question || loading) return;
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: question };
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const response = await api.askCustomerSupport(question, history);
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: 'assistant', content: response.answer },
      ]);
      if (response.requires_authentication && !user) openLoginModal();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'I could not reach customer support. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] sm:w-96 h-[min(34rem,calc(100vh-8rem))] overflow-hidden rounded-3xl border border-rootly-sage/30 bg-[#FAF8F5] shadow-2xl flex flex-col animate-[fadeIn_180ms_ease-out]">
          <div className="bg-[#244B37] px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-white/10 p-2"><Bot className="w-4 h-4 text-rootly-sagePale" /></div>
              <div>
                <p className="text-sm font-bold">Sri Adithya Support</p>
                <p className="text-[11px] text-white/70">Verified store information</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="p-2 rounded-full hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user' ? 'bg-[#244B37] text-white rounded-br-sm' : 'bg-white border border-stone-200 text-stone-700 rounded-bl-sm'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)} className="rounded-full border border-rootly-sage/40 bg-white px-2.5 py-1.5 text-[11px] text-rootly-forest hover:bg-rootly-mint">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="text-xs text-stone-500 animate-pulse">Assistant is checking verified store information...</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t border-stone-200 bg-white p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} disabled={loading} placeholder="Ask in English..." className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs outline-none focus:border-rootly-forest" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="rounded-xl bg-[#244B37] px-3 text-white disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Close support assistant' : 'Open support assistant'} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#244B37] text-white shadow-xl ring-4 ring-white/80 transition-transform hover:scale-105">
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};
