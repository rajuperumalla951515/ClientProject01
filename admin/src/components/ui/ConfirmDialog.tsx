import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success';
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant,
  isDestructive = false,
  isLoading = false,
}) => {
  const effectiveVariant = variant || (isDestructive ? 'danger' : 'warning');
  const effectiveConfirmLabel = confirmText || confirmLabel || 'Confirm';
  const effectiveCancelLabel = cancelText || cancelLabel || 'Cancel';

  const variantMap = {
    danger: {
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
      icon: Trash2,
    },
    warning: {
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
      icon: AlertTriangle,
    },
    success: {
      btn: 'bg-[#244B37] hover:bg-[#1C3C2C] text-white',
      iconBg: 'bg-[#F1F4EC] text-[#244B37] border border-[#8A9B69]/30',
      icon: CheckCircle2,
    },
  };

  const currentVariant = variantMap[effectiveVariant];
  const Icon = currentVariant.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${currentVariant.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-sm text-[#778176] mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF] transition-colors"
          >
            {effectiveCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${currentVariant.btn}`}
          >
            {isLoading ? 'Processing...' : effectiveConfirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
export default ConfirmDialog;
