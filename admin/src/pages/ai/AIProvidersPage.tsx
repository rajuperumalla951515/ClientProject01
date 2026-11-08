import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  Database,
  Search,
  Filter,
  BarChart3,
  Server
} from 'lucide-react';
import { aiApi } from '../../services/api';
import { AIProviderConfig, AIUsageLog } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AIProvidersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  // Filters for logs
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [provsData, logsData] = await Promise.all([
        aiApi.getProviders(),
        aiApi.getUsageLogs(50)
      ]);
      setProviders(provsData);
      setUsageLogs(logsData);
    } catch (err) {
      console.error('Failed to load AI providers or usage logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProvider = async (providerName: string, currentActive: boolean) => {
    try {
      await aiApi.updateProviderConfig(providerName, { is_active: !currentActive });
      showSuccess(`${providerName} ${!currentActive ? 'enabled' : 'disabled'}.`);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to update provider status.');
    }
  };

  const handleRunHealthCheck = async () => {
    setIsTesting(true);
    try {
      const res = await aiApi.testProviders();
      setTestResults(res.results || []);
      showSuccess('Live multi-model ping test completed!');
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Provider health check failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const filteredLogs = usageLogs.filter(log => {
    const matchesProv = filterProvider === 'all' || log.provider === filterProvider;
    const matchesStat = filterStatus === 'all' || log.status === filterStatus;
    return matchesProv && matchesStat;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Zero-Cost Quota Guarantees */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-5 h-5 text-[#8A9B69]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#26352B]">AI Provider Health & Free Quota Telemetry</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Zero-Cost Policy Active
                </span>
              </div>
              <p className="text-xs text-[#778176]">
                Automated multi-model failover routing across Cloudflare Workers AI (Primary), GroqCloud (Fallback 1), and Google Gemini (Fallback 2).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunHealthCheck}
              disabled={isTesting}
              className="px-3.5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Pinging Providers...' : 'Run Failover Health Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Provider Health Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E6E7DD] p-12 text-center shadow-xs">
          <LoadingSpinner size="md" text="Reading provider health from Cloudflare D1..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((p) => {
            const pName = p.provider_name || p.provider || '';
            const isCF = pName === 'cloudflare';
            const isGroq = pName === 'groq';
            const isGemini = pName === 'gemini';

            const roleLabel = isCF ? 'Primary Provider' : isGroq ? 'Fallback 1' : 'Fallback 2';
            const quotaMax = p.daily_quota_limit || p.daily_request_limit || 1000;
            const quotaUsed = p.requests_today || 0;
            const quotaPercent = Math.min(100, Math.round((quotaUsed / quotaMax) * 100));

            const isCircuitOpen = p.circuit_breaker_open || (p.consecutive_errors >= 5);
            const isCoolingDown = p.cooldown_until && new Date(p.cooldown_until) > new Date();
            const isEnabled = Boolean(p.is_enabled ?? p.is_active);

            return (
              <div
                key={pName}
                className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Top Badge */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#496B45] uppercase tracking-wider block">
                        {roleLabel}
                      </span>
                      <h3 className="text-base font-bold text-[#26352B] capitalize">
                        {pName === 'cloudflare' ? 'Cloudflare Workers AI' : pName === 'groq' ? 'GroqCloud Fast LLM' : 'Google Gemini API'}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleToggleProvider(pName, isEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-[#244B37]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs font-mono text-[#778176] mt-1 truncate">
                    {p.model_name}
                  </p>
                </div>

                {/* Circuit Breaker & Status Flags */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {isCircuitOpen ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Circuit Open (Tripped)
                    </span>
                  ) : isCoolingDown ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> In Cooldown
                    </span>
                  ) : isEnabled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready / Healthy
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Daily Quota Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#778176]">Daily Free Quota:</span>
                    <span className="font-mono text-[#26352B]">
                      {quotaUsed} / {quotaMax} reqs ({quotaPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#F6F5EF] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        quotaPercent > 80 ? 'bg-rose-500' : 'bg-[#244B37]'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry Stats */}
                <div className="pt-2 border-t border-[#E6E7DD] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#778176] block">Consecutive Errs:</span>
                    <span className="font-mono font-bold text-[#26352B]">{p.consecutive_errors || 0}</span>
                  </div>
                  <div>
                    <span className="text-[#778176] block">Total Processed:</span>
                    <span className="font-mono font-bold text-[#244B37]">{p.total_requests ?? p.requests_today ?? 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Health Test Results Banner */}
      {testResults && testResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6E7DD] p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-[#244B37] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#496B45]" /> Live Failover Probe Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {testResults.map((tr, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#26352B] capitalize">{tr.provider}</span>
                  <p className="text-[10px] text-[#778176]">{tr.status === 'ok' ? 'Responded OK' : tr.error || 'Failed'}</p>
                </div>
                <span className="font-mono font-bold text-[#496B45]">
                  {tr.latency_ms ? `${tr.latency_ms} ms` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Usage Logs Table */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E7DD] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#496B45]" /> AI Usage & Telemetry Logs
            </h2>
            <p className="text-xs text-[#778176]">
              Real-time audit records stored in Cloudflare D1 (`ai_usage_logs`).
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] font-semibold text-[#26352B] outline-none"
            >
              <option value="all">All Providers</option>
              <option value="cloudflare">Cloudflare Workers AI</option>
              <option value="groq">GroqCloud</option>
              <option value="gemini">Google Gemini</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] font-semibold text-[#26352B] outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-xs text-[#778176] py-8 text-center">No telemetry logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6E7DD] text-[#778176]">
                  <th className="pb-2 font-bold">Timestamp</th>
                  <th className="pb-2 font-bold">Task Type</th>
                  <th className="pb-2 font-bold">Provider</th>
                  <th className="pb-2 font-bold">Model</th>
                  <th className="pb-2 font-bold">Latency</th>
                  <th className="pb-2 font-bold">Tokens</th>
                  <th className="pb-2 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF9F5]">
                    <td className="py-2.5 text-[#778176] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-semibold text-[#26352B] capitalize">
                      {log.task_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 text-[#496B45] font-medium capitalize">
                      {log.provider}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-[#778176]">
                      {log.model}
                    </td>
                    <td className="py-2.5 font-mono text-[#26352B]">
                      {log.latency_ms ? `${log.latency_ms} ms` : '—'}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-[#778176]">
                      {(log.tokens_prompt ?? log.prompt_tokens ?? 0)}p / {(log.tokens_completion ?? log.completion_tokens ?? 0)}c
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProvidersPage;