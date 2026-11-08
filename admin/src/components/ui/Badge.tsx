import React from 'react';
import { OrderStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'forest';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
  const variantStyles = {
    default: 'bg-[#F6F5EF] text-[#26352B] border-[#E6E7DD]',
    forest: 'bg-[#E2E8D7] text-[#244B37] border-[#8A9B69]/40',
    success: 'bg-[#EBF3E8] text-[#2E6038] border-[#A8C9A0]',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus | string }> = ({ status }) => {
  const norm = (status || '').toLowerCase();

  switch (norm) {
    case 'pending_whatsapp':
      return <Badge variant="warning">WhatsApp Pending</Badge>;
    case 'pending':
      return <Badge variant="warning">Order Placed</Badge>;
    case 'confirmed':
      return <Badge variant="info">Confirmed</Badge>;
    case 'processing':
      return <Badge variant="forest">Processing</Badge>;
    case 'packed':
      return <Badge variant="forest">Packed</Badge>;
    case 'out_for_delivery':
      return <Badge variant="info">Out for Delivery</Badge>;
    case 'delivered':
      return <Badge variant="success">Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
