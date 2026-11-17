import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Database, PackageCheck, Send, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface InventorySummary {
  total_variants: number;
  total_units: number;
  inventory_retail_value: number;
  low_stock: Array<{ name: string; unit: string; stock: number; price: number }>;
  out_of_stock: Array<{ name: string; unit: string; stock: number }>;
  restock_candidates: Array<{
    name: string;
    unit: string;
    stock: number;
    suggested_restock_to_14_day_cover: number;
    estimated_days_of_cover: number | null;
  }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUERIES = [
  'Which products should I restock first?',
  'Which products are out of stock?',
  'What is my current inventory value?',
  'Which products have not sold in the last 30 days?',
];

export const InventoryAIAssistant: React.FC = () => {
  const { showError } = useToast();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'I analyze live inventory and the last 30 days of recorded sales. I only recommend changes; stock updates still require the existing authorized workflow.',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      setSummary(await api.getInventoryAISummary());
    } catch (error: any) {
      showError(error.message || 'Unable to load inventory intelligence.');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const ask = async (value?: string) => {
    const text = (value || question).trim();
    if (!text || loading) return;
    const history = messages.slice(-6);
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setQuestion('');
    setLoading(true);
    try {
      const response = await api.askInventoryAI(text, history);
      setMessages((current) => [...current, { role: 'assistant', content: response.answer }]);
    } catch (error: any) {
      showError(error.message || 'Inventory assistant could not complete the analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
      <div className="p-4 border-b border-[#E6E7DD] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#B8C99A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#26352B]">AI Inventory Intelligence</h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Read-only
              </span>
            </div>
            <p className="text-xs text-[#778176] mt-0.5">
              Verified D1 stock, audit logs, and {30} days of recorded sales.
            </p>
          </div>
        </div>
        <button onClick={() => void loadSummary()} className="text-xs font-semibold text-[#496B45] hover:text-[#244B37]">
          Refresh intelligence
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#FAF9F5] border-b border-[#E6E7DD]">
        <div className="rounded-xl bg-white border border-[#E6E7DD] p-3">
          <p className="text-[10px] uppercase font-bold text-[#778176]">Stock units</p>
          <p className="text-lg font-bold text-[#26352B]">{summaryLoading ? '—' : summary?.total_units.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E6E7DD] p-3">
          <p className="text-[10px] uppercase font-bold text-[#778176]">Retail value</p>
          <p className="text-lg font-bold text-[#26352B]">{summaryLoading ? '—' : `₹${summary?.inventory_retail_value.toLocaleString('en-IN')}`}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E6E7DD] p-3">
          <p className="text-[10px] uppercase font-bold text-[#778176]">Low stock</p>
          <p className="text-lg font-bold text-amber-700">{summaryLoading ? '—' : summary?.low_stock.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E6E7DD] p-3">
          <p className="text-[10px] uppercase font-bold text-[#778176]">Out of stock</p>
          <p className="text-lg font-bold text-rose-700">{summaryLoading ? '—' : summary?.out_of_stock.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 p-4">
        <div className="space-y-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4" /> Immediate attention
            </div>
            <div className="mt-2 space-y-1.5">
              {(summary?.out_of_stock || []).slice(0, 3).map((item) => (
                <p key={`${item.name}-${item.unit}`} className="text-xs text-rose-900">{item.name} ({item.unit}) — out of stock</p>
              ))}
              {(summary?.out_of_stock || []).length === 0 && <p className="text-xs text-rose-900/70">No out-of-stock variants recorded.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <PackageCheck className="w-4 h-4" /> Restock candidates
            </div>
            <div className="mt-2 space-y-1.5">
              {(summary?.restock_candidates || []).slice(0, 4).map((item) => (
                <p key={`${item.name}-${item.unit}`} className="text-xs text-amber-900">
                  {item.name}: +{item.suggested_restock_to_14_day_cover} units
                  {item.estimated_days_of_cover !== null ? ` (${item.estimated_days_of_cover} days cover)` : ' (no recent sales baseline)'}
                </p>
              ))}
              {(summary?.restock_candidates || []).length === 0 && <p className="text-xs text-amber-900/70">No calculated restock candidates.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] p-3 flex flex-col min-h-[19rem]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#26352B]">
            <Sparkles className="w-4 h-4 text-[#496B45]" /> Ask inventory questions
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 py-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  message.role === 'user' ? 'bg-[#244B37] text-white' : 'bg-white border border-[#E6E7DD] text-[#26352B]'
                }`}>{message.content}</p>
              </div>
            ))}
            {loading && <p className="text-xs text-[#778176] animate-pulse">Analyzing verified inventory records...</p>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_QUERIES.map((query) => (
              <button key={query} onClick={() => void ask(query)} disabled={loading} className="text-[10px] rounded-full border border-[#D7DDCE] bg-white px-2 py-1 text-[#496B45] disabled:opacity-50">{query}</button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="flex gap-2">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about stock, sales, or restocking..." disabled={loading} className="min-w-0 flex-1 rounded-xl border border-[#E6E7DD] bg-white px-3 py-2 text-xs outline-none focus:border-[#496B45]" />
            <button type="submit" disabled={loading || !question.trim()} className="rounded-xl bg-[#244B37] px-3 text-white disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </form>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-[#778176]"><Database className="w-3 h-3" /> Recommendations never modify stock automatically.</p>
        </div>
      </div>
    </section>
  );
};
