import React from 'react';
import { PlusCircle } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface EntityHeaderProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
  addLabel?: string;
  extraActions?: React.ReactNode;
  className?: string;
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  title,
  subtitle,
  onAddClick,
  addLabel = 'Add',
  extraActions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-text-secondary mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto">
        {extraActions}
        {onAddClick && (
          <AnimatedButton 
            onClick={onAddClick}
            className="flex items-center justify-center sm:justify-start w-full sm:w-auto min-w-[120px]"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>{addLabel}</span>
          </AnimatedButton>
        )}
      </div>
    </div>
  );
};