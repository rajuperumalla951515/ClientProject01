import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Database,
  Search,
  Filter,
  BarChart3,
  Server
} from 'lucide-react';
import { aiApi } from '../../services/api';
import { AIUsageLog } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AIProviderQuotaSection } from '../../components/ai/AIProviderQuotaSection';

export const AIProvidersPage: React.FC = () => {
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logsData = await aiApi.getUsageLogs(50);
      setUsageLogs(logsData);
    } catch (err) {
      console.error('Failed to load AI usage logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filteredLogs = usageLogs.filter(log => {
    const matchesProv = filterProvider === 'all' || log.provider === filterProvider;
    const matchesStat = filterStatus === 'all' || log.status === filterStatus;
    return matchesProv && matchesStat;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Provider Quota Telemetry & Failover Cards */}
      <AIProviderQuotaSection />

      {/* AI Usage Audit Log Section */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] text-[#244B37] flex items-center justify-center border border-[#E6E7DD]">
              <BarChart3 className="w-4 h-4 text-[#8A9B69]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#26352B]">Real-Time AI Request Audit Log</h2>
              <p className="text-[11px] text-[#778176]">
                Immutable server-side telemetry tracking task latency, prompt tokens, and zero-cost constraints.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] bg-[#FAF9F5] focus:outline-none"
            >
              <option value="all">All Providers</option>
              <option value="cloudflare">Cloudflare Workers AI</option>
              <option value="groq">GroqCloud</option>
              <option value="gemini">Google Gemini</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] bg-[#FAF9F5] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="rate_limit">Rate Limit (429)</option>
              <option value="timeout">Timeout</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoadingLogs ? (
          <div className="py-8 text-center">
            <LoadingSpinner size="sm" text="Loading request logs..." />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#778176]">
            No AI requests logged yet for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-[#778176] font-semibold border-b border-[#E6E7DD]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Provider & Model</th>
                  <th className="py-2.5 px-3">Task Type</th>
                  <th className="py-2.5 px-3">Tokens (P/C)</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]/60">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isRateLimit = log.status === 'rate_limit';
                  const isTimeout = log.status === 'timeout';

                  return (
                    <tr key={log.id} className="hover:bg-[#FAF9F5]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#778176]">
                        {log.created_at ? log.created_at.replace('T', ' ').slice(0, 19) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#26352B]">
                        <span className="capitalize">{log.provider}</span>
                        <span className="block text-[10px] text-[#778176] font-mono truncate max-w-[150px]">
                          {log.model}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#26352B] font-mono text-[11px]">
                        {log.task_type}
                      </td>
                      <td className="py-2.5 px-3 text-[#778176] font-mono text-[11px]">
                        {log.tokens_prompt || log.prompt_tokens || 0} / {log.tokens_completion || log.completion_tokens || 0}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#244B37]">
                        {log.latency_ms} ms
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isRateLimit
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isTimeout
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.error_message && (
                          <span className="block text-[10px] text-rose-600 truncate max-w-[180px]" title={log.error_message}>
                            {log.error_message}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProvidersPage;
