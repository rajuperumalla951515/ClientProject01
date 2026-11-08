import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: 'forest' | 'sage' | 'amber' | 'rose' | 'earth' | 'green' | 'blue' | 'emerald' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'forest',
  onClick,
}) => {
  const colorMap: Record<string, { bg: string; iconBg: string }> = {
    forest: {
      bg: 'bg-[#F1F4EC] text-[#244B37] border-[#8A9B69]/30',
      iconBg: 'bg-[#244B37] text-white',
    },
    sage: {
      bg: 'bg-[#F1F4EC] text-[#496B45] border-[#8A9B69]/30',
      iconBg: 'bg-[#496B45] text-white',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-600 text-white',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-600 text-white',
    },
    earth: {
      bg: 'bg-[#FAF9F5] text-[#26352B] border-[#E6E7DD]',
      iconBg: 'bg-[#8A9B69] text-white',
    },
    green: {
      bg: 'bg-[#F1F4EC] text-[#244B37] border-[#8A9B69]/30',
      iconBg: 'bg-[#244B37] text-white',
    },
    blue: {
      bg: 'bg-[#F1F4EC] text-[#496B45] border-[#8A9B69]/30',
      iconBg: 'bg-[#496B45] text-white',
    },
    emerald: {
      bg: 'bg-[#F1F4EC] text-[#244B37] border-[#8A9B69]/30',
      iconBg: 'bg-[#244B37] text-white',
    },
    purple: {
      bg: 'bg-[#F1F4EC] text-[#244B37] border-[#8A9B69]/30',
      iconBg: 'bg-[#244B37] text-white',
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.forest;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-[#E6E7DD] shadow-card hover:shadow-card-hover transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#8A9B69]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#778176] uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${scheme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#26352B] tracking-tight">{value}</span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'text-[#244B37] bg-[#E2E8D7]' : 'text-rose-700 bg-rose-100'
            }`}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="text-[11px] text-[#778176] mt-1 font-medium">{subtitle}</p>}
    </div>
  );
};
