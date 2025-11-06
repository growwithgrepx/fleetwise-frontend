import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  error?: boolean;
}

export function Select({ className, options, error, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-lg px-3 py-2 text-sm transition-colors appearance-none",
        "bg-background-light border-border-color text-text-main",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        error && "border-red-500 focus:ring-red-500/30 focus:border-red-500",
        className
      )}
      {...props}
    >
      <option value="" className="bg-background-light text-text-main">Select...</option>
      {options.map((option) => (
        <option 
          key={option.value} 
          value={option.value}
          className="bg-background-light text-text-main"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
} 