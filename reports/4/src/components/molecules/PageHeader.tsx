import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-color">
      <h1 className="text-3xl font-bold text-text-main">{title}</h1>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
} 