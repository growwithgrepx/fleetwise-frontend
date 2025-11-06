import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const baseClasses = 'rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center';

const variantClasses = {
  primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary disabled:bg-primary/50 disabled:text-text-secondary',
  secondary: 'bg-background-light text-text-main hover:bg-primary/20 focus:ring-primary disabled:bg-background-light/50 disabled:text-text-secondary',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-800/50 disabled:text-text-secondary',
  ghost: 'bg-transparent text-text-secondary hover:bg-background-light/50 focus:ring-primary disabled:text-text-secondary',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export function Button({ 
  variant = 'primary', 
  size = 'md',
  isLoading,
  className = '', 
  children,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  );
}