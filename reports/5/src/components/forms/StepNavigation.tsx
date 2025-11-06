import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Step {
  id: 'details' | 'service' | 'pricing';  // Specific step IDs
  name: string;
}

interface StepNavigationProps {
  steps: Step[];
  currentStep: Step['id'];
  onStepChange: (stepId: Step['id']) => void;
}

export function StepNavigation({ steps, currentStep, onStepChange }: StepNavigationProps) {
  return (
    <div className="border-b border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className={cn(
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
              currentStep === step.id
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-300'
            )}
          >
            {step.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
