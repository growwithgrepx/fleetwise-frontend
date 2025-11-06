import { ReactNode } from 'react';

interface FormSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && <h4 className="text-sm font-medium text-gray-300">{title}</h4>}
      {children}
    </div>
  );
}
