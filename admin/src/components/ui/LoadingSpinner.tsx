import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#778176]">
      <div
        className={`${sizeMap[size]} border-[#D9E2CE] border-t-[#244B37] rounded-full animate-spin`}
      />
      {text && <p className="text-xs font-semibold text-[#778176]">{text}</p>}
    </div>
  );
};
