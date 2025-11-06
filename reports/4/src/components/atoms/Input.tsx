import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg px-3 py-2 text-sm transition-colors",
        "bg-background-light border-border-color text-text-main",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        error && "border-red-500 focus:ring-red-500/30 focus:border-red-500",
        className
      )}
      {...props}
    />
  );
} 