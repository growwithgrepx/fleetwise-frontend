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
    <div className={`flex justify-between items-center ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-text-secondary mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2 items-center">
        {extraActions}
        {onAddClick && (
          <AnimatedButton 
            onClick={onAddClick}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>{addLabel}</span>
          </AnimatedButton>
        )}
      </div>
    </div>
  );
};