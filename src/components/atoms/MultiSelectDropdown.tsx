/**
 * MultiSelectDropdown
 * -------------------
 * A clean, modern multi-select dropdown component with chip/tag display.
 * Designed for the FleetOps Jobs page dark theme.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

export interface MultiSelectOption {
  id: string | number;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionId: string | number) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.id))
    .map((opt) => opt.label);

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full min-w-[200px] h-8 px-3 py-1.5 rounded-lg text-xs transition-all',
          'bg-[#1E2937] border border-border-color text-text-main',
          'hover:border-primary/50 focus:ring-1 focus:ring-primary focus:border-transparent',
          'flex items-center justify-between gap-2'
        )}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-text-secondary truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              <span className="text-text-main font-medium whitespace-nowrap">
                {selectedLabels[0]}
              </span>
              {selected.length > 1 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                  +{selected.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-background-dark rounded transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3 h-3 text-text-secondary hover:text-text-main" />
            </button>
          )}
          <ChevronDown
            className={clsx(
              'w-3.5 h-3.5 text-text-secondary transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 w-full min-w-[240px] max-h-[300px] overflow-hidden rounded-lg',
            'bg-[#1E2937] border border-border-color shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <div className="overflow-y-auto max-h-[300px] p-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-secondary">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggleOption(option.id)}
                    className={clsx(
                      'w-full px-3 py-2 rounded-md text-xs transition-all text-left',
                      'flex items-center justify-between gap-2',
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'text-text-main hover:bg-background-dark'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-primary flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
