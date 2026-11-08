import React, { useEffect, useState, useMemo } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Search,
  MessageSquare,
  ShieldCheck,
  Clock,
  Filter,
  Check,
  X,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { Review } from '../types';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Delete State
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadReviews = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getReviews(statusFilter);
      setReviews(data);
      if (isManual) {
        showSuccess('Product reviews synced from Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load reviews.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const handleUpdateStatus = async (review: Review, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      await api.updateReviewStatus(review.id, newStatus);
      showSuccess(`Review marked as ${newStatus}.`, 'Status Updated');
      loadReviews();
    } catch (err: any) {
      showError(err.message || 'Failed to update review status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteReview(reviewToDelete.id);
      showSuccess('Review deleted permanently.', 'Deleted');
      setReviewToDelete(null);
      loadReviews();
    } catch (err: any) {
      showError(err.message || 'Failed to delete review.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Search filter
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchSearch =
        (r.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSearch;
    });
  }, [reviews, searchQuery]);

  // Aggregate metrics
  const pendingCount = useMemo(() => reviews.filter((r) => r.status === 'pending').length, [reviews]);
  const approvedCount = useMemo(() => reviews.filter((r) => r.status === 'approved').length, [reviews]);
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Store Rating</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-bold text-[#26352B] font-serif">{avgRating}</span>
              <div className="flex text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Total Feedback</p>
            <p className="text-2xl font-bold text-[#26352B] mt-1 font-serif">{reviews.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Approved Live</p>
            <p className="text-2xl font-bold text-[#244B37] mt-1 font-serif">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Pending Moderation</p>
            <p className="text-2xl font-bold text-amber-800 mt-1 font-serif">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#778176]" />
            <input
              type="text"
              placeholder="Search product, customer, or review text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF]/40 text-xs text-[#26352B] placeholder:text-[#778176] focus:outline-none focus:ring-2 focus:ring-[#244B37] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#F6F5EF] rounded-xl border border-[#E6E7DD]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all' ? 'bg-white text-[#244B37] shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'approved' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'rejected' ? 'bg-white text-rose-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        <button
          onClick={() => loadReviews(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors self-end md:self-auto"
          title="Refresh Reviews"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
        </button>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <LoadingSpinner text="Reading customer reviews from Cloudflare D1..." />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Reviews Found"
          description={
            searchQuery
              ? `No reviews match "${searchQuery}". Clear your search to view all ratings.`
              : 'Product reviews submitted by verified buyers will appear here for moderation.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E7DD]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center font-bold text-xs">
                    <User className="w-5 h-5 text-[#496B45]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#26352B]">{review.customer_name}</span>
                      {(review.is_verified_buyer || review.verified_purchase) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#778176] mt-0.5">
                      Reviewed on <strong className="text-[#26352B]">{review.product_name || 'Sri Adithya Harvest Product'}</strong> •{' '}
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {review.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved
                    </span>
                  )}
                  {review.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Moderation
                    </span>
                  )}
                  {review.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800">
                      <XCircle className="w-3.5 h-3.5" />
                      Rejected
                    </span>
                  )}

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'fill-amber-500' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Body */}
              <div className="py-3.5">
                {review.title && (
                  <h4 className="text-xs font-bold text-[#26352B] mb-1">{review.title}</h4>
                )}
                <p className="text-xs text-[#26352B]/90 leading-relaxed font-sans">{review.comment}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E6E7DD] flex items-center justify-between">
                <span className="text-[11px] text-[#778176]">Review ID: #{review.id}</span>

                <div className="flex items-center gap-2">
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(review, 'approved')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}

                  {review.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(review, 'rejected')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}

                  <button
                    onClick={() => setReviewToDelete(review)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Review?"
        message={`Are you sure you want to permanently delete the review from "${reviewToDelete?.customer_name}"? This action cannot be undone.`}
        confirmText="Delete Review"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ReviewsPage;
