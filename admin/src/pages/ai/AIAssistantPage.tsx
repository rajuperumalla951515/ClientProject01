import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Trash2,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { aiApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  tool_executed?: string | null;
  tool_data?: any;
  provider?: string;
  model?: string;
  cached?: boolean;
}

const QUICK_PROMPTS = [
  {
    label: "👋 Hello / How are you?",
    prompt: "Hello! How are you today? What can you help me with?"
  },
  {
    label: "🌾 Organic Product Advice",
    prompt: "Suggest high-demand organic products we should consider stocking for our traditional store."
  },
  {
    label: "📈 Boost Oil Sales",
    prompt: "How can I improve sales for our traditional wood-pressed oils (Groundnut, Sesame, Coconut)?"
  },
  {
    label: "📦 Low Stock Alert",
    prompt: "Which organic products are low in stock or out of stock right now?"
  },
  {
    label: "📊 Today's Revenue & Orders",
    prompt: "What is today's revenue, order count, and average order value from Cloudflare D1?"
  },
  {
    label: "🏆 Top Selling Products",
    prompt: "What are our top 5 best selling organic products by revenue?"
  },
  {
    label: "⏳ Pending Orders",
    prompt: "How many orders are currently pending fulfillment and need packing?"
  },
  {
    label: "🏢 Entire Application Details",
    prompt: "Provide a comprehensive breakdown of our entire application details, database state, system architecture, delivery logistics, and AI telemetry."
  },
  {
    label: "Telugu: అమ్మకాల సలహాలు",
    prompt: "మన స్టోర్‌లో చెక్క గానుగ నూనెల అమ్మకాలను ఎలా పెంచాలో మంచి సలహాలు ఇవ్వండి."
  }
];

export const AIAssistantPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Namaste! I am the Sri Adithya Organics AI Business Intelligence Assistant. I am connected directly to your Cloudflare D1 database via verified, parameterized analytics tools. You can ask me about live sales, stock levels, pending orders, product rankings, and revenue comparisons. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'Cloudflare Workers AI',
      model: '@cf/meta/llama-3.1-8b-instruct'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleToolData = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      const response = await aiApi.assistantChat({
        message: textToSend,
        conversation_history: history,
        auto_tool: true
      });

      const assistantMessage: ChatMessage = {
        id: 'assistant_' + Date.now(),
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tool_executed: response.tool_executed,
        tool_data: response.tool_data,
        provider: response.provider,
        model: response.model,
        cached: response.cached
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      showError(err.message || 'Failed to communicate with AI Assistant.');
      setMessages(prev => [
        ...prev,
        {
          id: 'error_' + Date.now(),
          sender: 'assistant',
          text: `I encountered an issue processing that query: ${err.message || 'System error'}. Please verify that your AI providers and Cloudflare D1 are reachable.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'System Guard'
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'assistant',
        text: "Conversation cleared. Ready for your next query on Sri Adithya Organics operations.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'Cloudflare Workers AI'
      }
    ]);
    showSuccess('Chat history cleared.');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-6xl mx-auto space-y-4">
      {/* Top Header & Guardrail Banner */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5 text-[#8A9B69]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#26352B]">AI Business Intelligence Assistant</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Zero-Cost Active
              </span>
            </div>
            <p className="text-xs text-[#778176]">
              Real-time analytics powered by Cloudflare Workers AI with parameterized D1 database verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E6E7DD] flex flex-col overflow-hidden shadow-xs">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-[#FAF9F5]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-[#496B45] text-white'
                      : 'bg-[#244B37] text-[#8A9B69] border border-[#E6E7DD]'
                  }`}
                >
                  {isUser ? 'ME' : <Bot className="w-4 h-4" />}
                </div>

                {/* Content Box */}
                <div className="space-y-1.5 min-w-0">
                  <div
                    className={`rounded-2xl p-4 shadow-xs text-xs md:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#244B37] text-white rounded-tr-xs'
                        : 'bg-white border border-[#E6E7DD] text-[#26352B] rounded-tl-xs'
                    }`}
                  >
                    {/* Assistant Message Body */}
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* D1 Tool Execution Badge & Data Viewer */}
                    {!isUser && msg.tool_executed && (
                      <div className="mt-3 pt-3 border-t border-[#E6E7DD] space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Database className="w-3 h-3 text-emerald-600" /> Verified from Cloudflare D1
                            </span>
                            <span className="text-[10px] font-mono text-[#778176]">
                              {msg.tool_executed}
                            </span>
                          </div>

                          {msg.tool_data && (
                            <button
                              onClick={() => toggleToolData(msg.id)}
                              className="text-[10px] font-semibold text-[#496B45] hover:text-[#244B37] flex items-center gap-0.5 transition-colors"
                            >
                              {expandedTools[msg.id] ? (
                                <>Hide Raw D1 Data <ChevronDown className="w-3 h-3" /></>
                              ) : (
                                <>Inspect D1 Data <ChevronRight className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Collapsible Raw D1 Data */}
                        {expandedTools[msg.id] && msg.tool_data && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[#F6F5EF] border border-[#E6E7DD] text-[11px] font-mono overflow-x-auto text-[#26352B]">
                            <pre className="whitespace-pre-wrap max-h-56 overflow-y-auto">
                              {JSON.stringify(msg.tool_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Meta Info & Action Footer */}
                  <div
                    className={`flex items-center gap-2 text-[10px] text-[#778176] px-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && msg.provider && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-[#496B45]">{msg.provider}</span>
                        {msg.model && <span className="text-[#8A9B69]">({msg.model})</span>}
                        {msg.cached && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px]">
                            Cached
                          </span>
                        )}
                        <span>•</span>
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="hover:text-[#244B37] transition-colors flex items-center gap-0.5"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-xl bg-[#244B37] text-[#8A9B69] flex items-center justify-center shrink-0 border border-[#E6E7DD]">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-xs p-4 bg-white border border-[#E6E7DD] shadow-xs flex items-center gap-3">
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[#496B45] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#496B45] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#496B45] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-semibold text-[#778176]">
                  Thinking & preparing response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="p-3 bg-white border-t border-[#E6E7DD] overflow-x-auto">
          <div className="flex items-center gap-1.5 pb-1">
            <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#496B45]" /> Suggested Queries:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="px-2.5 py-1 rounded-xl bg-[#F6F5EF] hover:bg-[#EAE8DD] text-[#244B37] border border-[#E6E7DD] text-xs font-medium whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-white border-t border-[#E6E7DD]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus-within:border-[#244B37] focus-within:bg-white transition-all">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about live sales, top products, low stock, customer retention... (Shift+Enter for newline)"
                rows={2}
                disabled={isLoading}
                className="w-full px-3 py-2.5 text-xs md:text-sm bg-transparent outline-none resize-none text-[#26352B] placeholder-[#778176]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="h-11 px-4 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[10px] text-[#778176]">
            <span>Deterministic D1 read-only queries with zero SQL injection risk.</span>
            <span>Cloudflare Workers AI Primary • GroqCloud Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;