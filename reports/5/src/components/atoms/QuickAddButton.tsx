import React from 'react';

interface QuickAddButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
}

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  onClick,
  label,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ${className}`}
      title={`Quick Add ${label}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span>Quick Add</span>
    </button>
  );
}; 