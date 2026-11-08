import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Boxes,
  Tag,
  RefreshCw,
  Plus,
  Lock,
  Key,
  Database,
  FileCheck
} from 'lucide-react';
import { api, aiApi } from '../../services/api';
import { Product, AIActionApproval } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AIApprovalsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [approvals, setApprovals] = useState<AIActionApproval[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Proposal Modal State
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeActionType, setProposeActionType] = useState<'price_change' | 'stock_adjustment'>('stock_adjustment');
  const [proposeProductId, setProposeProductId] = useState<string>('');
  const [proposeNewValue, setProposeNewValue] = useState<string>('');
  const [proposeReason, setProposeReason] = useState<string>('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Execution State
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [approvalsData, prodsData] = await Promise.all([
        aiApi.getApprovals(filterStatus === 'all' ? undefined : filterStatus),
        api.getProducts()
      ]);
      setApprovals(approvalsData);
      setProducts(prodsData);
    } catch (err) {
      console.error('Failed to load approvals or products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    setExecutingId(id);
    try {
      const res = await aiApi.executeApproval(id, decision);
      showSuccess(res.message || `Proposal ${decision}d successfully!`);
      await loadData();
    } catch (err: any) {
      showError(err.message || `Failed to ${decision} proposal.`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeProductId || !proposeNewValue || !proposeReason) {
      showError('Please fill in all fields.');
      return;
    }

    const targetProd = products.find(p => String(p.id) === proposeProductId);
    if (!targetProd) return;

    setIsSubmittingProposal(true);
    try {
      const isPrice = proposeActionType === 'price_change';
      const currentValue = isPrice
        ? (targetProd.price ?? targetProd.min_price ?? 0)
        : (targetProd.stock ?? targetProd.variants?.[0]?.stock ?? 0);
      const proposedValue = Number(proposeNewValue);

      await aiApi.proposeApproval({
        action_type: proposeActionType,
        target_entity: 'product',
        entity_id: proposeProductId,
        current_value: { [isPrice ? 'price' : 'stock']: currentValue },
        proposed_value: { [isPrice ? 'price' : 'stock']: proposedValue },
        reason: proposeReason
      });

      showSuccess('Proposal submitted to the Two-Step Approval Queue!');
      setShowProposeModal(false);
      setProposeProductId('');
      setProposeNewValue('');
      setProposeReason('');
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to submit proposal.');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Two-Step Security Notice */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5 text-[#8A9B69]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#26352B]">Action Approvals & Verification Queue</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> Two-Step Approval Enforced
                </span>
              </div>
              <p className="text-xs text-[#778176]">
                AI proposals and automated inventory/pricing recommendations require explicit administrator approval before modifying the Cloudflare D1 database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProposeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Propose Action
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex border-b border-[#E6E7DD] gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all capitalize ${
                filterStatus === st
                  ? 'border-[#244B37] text-[#244B37]'
                  : 'border-transparent text-[#778176] hover:text-[#26352B]'
              }`}
            >
              {st} {st === 'pending' && approvals.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                  {approvals.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Approvals List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E6E7DD] p-12 text-center shadow-xs">
            <LoadingSpinner size="md" text="Loading approvals queue from Cloudflare D1..." />
          </div>
        ) : approvals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#E6E7DD] p-12 text-center text-[#778176] shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">No {filterStatus} proposals in the queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvals.map((appr) => {
              const isStock = appr.action_type === 'stock_adjustment';
              const isPrice = appr.action_type === 'price_change';

              // Extract values
              let curVal = appr.current_value;
              let propVal = appr.proposed_value;
              if (appr.preview_diff_json) {
                try {
                  const parsed = JSON.parse(appr.preview_diff_json);
                  curVal = parsed.before ?? parsed.current ?? curVal;
                  propVal = parsed.after ?? parsed.proposed ?? propVal;
                } catch {}
              }
              if (typeof curVal === 'string') {
                try { curVal = JSON.parse(curVal); } catch {}
              }
              if (typeof propVal === 'string') {
                try { propVal = JSON.parse(propVal); } catch {}
              }

              const fromVal = isPrice ? (curVal?.price ?? curVal) : (curVal?.stock ?? curVal);
              const toVal = isPrice ? (propVal?.price ?? propVal) : (propVal?.stock ?? propVal);

              return (
                <div
                  key={appr.id}
                  className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] flex items-center justify-center text-[#244B37]">
                          {isStock ? <Boxes className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider block">
                            {isStock ? 'Stock Adjustment' : isPrice ? 'Price Modification' : 'Action Proposal'}
                          </span>
                          <h3 className="text-sm font-bold text-[#26352B]">
                            Entity #{appr.entity_id || appr.target_id || ''}
                          </h3>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        appr.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : appr.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {appr.status}
                      </span>
                    </div>

                    {/* Visual Diff Card */}
                    <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] flex items-center justify-between">
                      <div className="text-center flex-1">
                        <span className="text-[10px] font-bold text-[#778176] uppercase">Current Value</span>
                        <p className="text-base font-bold text-[#26352B] mt-0.5">
                          {isPrice ? `₹${fromVal ?? 0}` : `${fromVal ?? 0} units`}
                        </p>
                      </div>

                      <div className="px-3 text-[#8A9B69]">
                        <ArrowRight className="w-5 h-5" />
                      </div>

                      <div className="text-center flex-1">
                        <span className="text-[10px] font-bold text-[#244B37] uppercase">Proposed Value</span>
                        <p className="text-base font-bold text-[#244B37] mt-0.5">
                          {isPrice ? `₹${toVal ?? 0}` : `${toVal ?? 0} units`}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-[#26352B]">
                      <span className="font-bold text-[#778176] block mb-0.5">Stated Justification:</span>
                      <p className="leading-relaxed bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E6E7DD]">
                        {appr.reason || appr.summary}
                      </p>
                    </div>

                    {/* Idempotency Key & Timestamps */}
                    <div className="pt-2 border-t border-[#E6E7DD] flex flex-wrap items-center justify-between text-[10px] text-[#778176] gap-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#8A9B69]" /> {appr.idempotency_key?.slice(0, 16)}...
                      </span>
                      <span>{new Date(appr.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons for Pending */}
                  {appr.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E6E7DD]">
                      <button
                        onClick={() => handleDecision(String(appr.id), 'approve')}
                        disabled={executingId === String(appr.id)}
                        className="flex-1 py-2 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                      >
                        {executingId === String(appr.id) ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve & Apply
                      </button>

                      <button
                        onClick={() => handleDecision(String(appr.id), 'reject')}
                        disabled={executingId === String(appr.id)}
                        className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Propose Action Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E7DD] p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E7DD] pb-3">
              <h3 className="text-sm font-bold text-[#26352B]">Submit Proposal to Verification Queue</h3>
              <button
                onClick={() => setShowProposeModal(false)}
                className="text-[#778176] hover:text-[#26352B]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#26352B] mb-1">Action Type</label>
                <select
                  value={proposeActionType}
                  onChange={(e: any) => setProposeActionType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] outline-none"
                >
                  <option value="stock_adjustment">Stock Inventory Adjustment</option>
                  <option value="price_change">Product Price Modification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#26352B] mb-1">Target Product</label>
                <select
                  value={proposeProductId}
                  onChange={(e) => setProposeProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] outline-none"
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock ?? p.variants?.[0]?.stock ?? 0}, Price: ₹{p.price ?? p.min_price ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#26352B] mb-1">
                  Proposed New {proposeActionType === 'price_change' ? 'Price (₹)' : 'Stock Count (units)'}
                </label>
                <input
                  type="number"
                  step={proposeActionType === 'price_change' ? '0.01' : '1'}
                  value={proposeNewValue}
                  onChange={(e) => setProposeNewValue(e.target.value)}
                  required
                  placeholder={proposeActionType === 'price_change' ? 'e.g. 350.00' : 'e.g. 50'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#26352B] mb-1">Justification / Reason</label>
                <textarea
                  rows={3}
                  value={proposeReason}
                  onChange={(e) => setProposeReason(e.target.value)}
                  required
                  placeholder="e.g. Physical inventory batch count reconciliation at Nellore processing unit..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E7DD]">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-3 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingProposal ? 'Submitting...' : 'Submit to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIApprovalsPage;