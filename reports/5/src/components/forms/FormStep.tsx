import { ReactNode } from 'react';

interface FormStepProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormStep({ title, children, className = '' }: FormStepProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-200">{title}</h3>
      {children}
    </div>
  );
}
