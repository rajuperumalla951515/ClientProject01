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
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Server
} from 'lucide-react';
import { aiApi } from '../../services/api';
import { AIProviderConfig, AIUsageLog } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const AIProviderQuotaSection: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const data = await aiApi.getProviders();
      setProviders(data);
    } catch (err: any) {
      console.error('Failed to load AI providers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (providerName: string, isEnabled: boolean) => {
    try {
      await aiApi.updateProviderConfig(providerName);
      showSuccess(`${providerName} ${isEnabled ? 'disabled' : 'enabled'}.`);
      await loadProviders();
    } catch (err: any) {
      showError(err.message || 'Failed to update provider status.');
    }
  };

  const handleHealthCheck = async () => {
    setIsTesting(true);
    try {
      const res = await aiApi.testProviders();
      setTestResults(res.results || []);
      showSuccess('Live multi-model ping test completed!');
      await loadProviders();
    } catch (err: any) {
      showError(err.message || 'Failed to ping providers.');
    } finally {
      setIsTesting(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string = 'Unknown') => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active (Primary)
          </span>
        );
      case 'Available':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Available (Standby)
          </span>
        );
      case 'Rate Limited':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Rate Limited (Cooldown)
          </span>
        );
      case 'Quota Exhausted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Quota Exhausted
          </span>
        );
      case 'Temporarily Unavailable':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Temporarily Unavailable
          </span>
        );
      case 'Configuration Required':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-500" /> Configuration Required
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Fallback Hierarchy & Zero-Cost Policy */}
      <div className="bg-[#FAF9F5] rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#26352B]">AI Provider Quota & Health Telemetry</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Zero-Cost Protected
              </span>
            </div>
            <p className="text-xs text-[#778176] mt-1">
              Monitors free-tier request limits, circuit-breaker cooldowns, and automatic failover routing across 3 providers.
            </p>
          </div>

          <button
            onClick={handleHealthCheck}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Pinging Providers...' : 'Run Live Health Test'}
          </button>
        </div>

        {/* Fallback Flow visualization */}
        <div className="mt-4 pt-4 border-t border-[#E6E7DD]">
          <span className="text-[11px] font-bold text-[#778176] uppercase tracking-wider block mb-2">
            Automatic Failover Sequence:
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#244B37]/30 text-[#244B37] font-semibold flex items-center gap-1.5 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-[#244B37] text-white text-[10px] flex items-center justify-center font-bold">1</span>
              Cloudflare Workers AI <span className="text-[10px] text-emerald-700 font-normal">(Primary)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#8A9B69]" />
            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E7DD] text-[#26352B] font-semibold flex items-center gap-1.5 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-[#496B45] text-white text-[10px] flex items-center justify-center font-bold">2</span>
              GroqCloud <span className="text-[10px] text-[#778176] font-normal">(Fallback 1)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#8A9B69]" />
            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E7DD] text-[#26352B] font-semibold flex items-center gap-1.5 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-[#778176] text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Google Gemini <span className="text-[10px] text-[#778176] font-normal">(Fallback 2)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E6E7DD] p-10 text-center">
          <LoadingSpinner size="md" text="Reading real-time provider telemetry from D1..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {providers.map((p) => {
            const pName = p.provider_name || p.provider || '';
            const isEnabled = Boolean(p.is_enabled ?? p.is_active ?? 1);
            const limit = p.daily_limit || p.daily_request_limit || 1000;
            const used = p.requests_today || 0;
            const remaining = p.remaining_requests !== undefined ? p.remaining_requests : Math.max(0, limit - used);
            const percent = Math.min(100, Math.round((used / limit) * 100));

            return (
              <div
                key={pName}
                className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#8A9B69] transition-colors"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#496B45] uppercase tracking-wider block">
                        Priority {p.priority} {p.is_fallback ? '• Fallback' : '• Primary Provider'}
                      </span>
                      <h3 className="text-base font-bold text-[#26352B]">
                        {p.display_name || (pName === 'cloudflare' ? 'Cloudflare Workers AI' : pName === 'groq' ? 'GroqCloud Fast LLM' : 'Google Gemini API')}
                      </h3>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(pName, isEnabled)}
                      title={isEnabled ? 'Click to disable' : 'Click to enable'}
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

                  {/* Model Tag */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[11px] font-mono bg-[#F6F5EF] text-[#26352B] px-2 py-0.5 rounded-md border border-[#E6E7DD] truncate">
                      {p.model_name}
                    </span>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <div>
                  {renderStatusBadge(p.status)}
                </div>

                {/* Application-Estimated Daily Quota Ceiling */}
                <div className="space-y-1.5 bg-[#FAF9F5] p-3 rounded-xl border border-[#E6E7DD]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#778176]">Daily Zero-Cost Ceiling:</span>
                    <span className="font-mono font-bold text-[#26352B]">
                      {used} / {limit} reqs
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percent >= 80 ? 'bg-rose-500' : 'bg-[#244B37]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#778176] pt-0.5">
                    <span>Remaining Today:</span>
                    <span className="font-mono font-bold text-[#244B37]">{remaining} reqs</span>
                  </div>
                </div>

                {/* Provider-Reported Quota Information */}
                <div className="p-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-[11px] text-[#778176] space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-[#26352B]">
                    <HelpCircle className="w-3 h-3 text-[#8A9B69]" /> Provider API Quota Status:
                  </div>
                  <p className="leading-relaxed">
                    {p.provider_quota_info || 'Quota information unavailable from provider API.'}
                  </p>
                </div>

                {/* Telemetry and Audit Stats */}
                <div className="pt-2 border-t border-[#E6E7DD] space-y-1 text-[11px] text-[#778176]">
                  <div className="flex items-center justify-between">
                    <span>Last Successful Request:</span>
                    <span className="font-mono text-[#26352B]">
                      {p.last_success_at ? p.last_success_at.replace('T', ' ').slice(0, 16) : 'None recorded'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rate Limit Status:</span>
                    <span className={`font-semibold ${p.rate_limit_status?.includes('Rate Limited') ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {p.rate_limit_status || 'Normal'}
                    </span>
                  </div>
                  {p.last_error_message && (
                    <div className="pt-1 text-[10px] text-rose-600 truncate" title={p.last_error_message}>
                      Last error: {p.last_error_message}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Probe Results */}
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
                  <p className="text-[10px] text-[#778176]">
                    {tr.status === 'ok' ? 'Responded OK' : tr.error || 'Failed'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  tr.status === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {tr.status === 'ok' ? 'Online' : 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

