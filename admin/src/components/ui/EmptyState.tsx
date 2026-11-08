import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-[#E6E7DD]">
      <div className="w-14 h-14 rounded-2xl bg-[#F1F4EC] border border-[#8A9B69]/30 flex items-center justify-center text-[#244B37] mb-4 shadow-xs">
        <Icon className="w-7 h-7 text-[#496B45]" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[#26352B]">{title}</h3>
      <p className="text-xs text-[#778176] mt-1 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1C3C2C] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
