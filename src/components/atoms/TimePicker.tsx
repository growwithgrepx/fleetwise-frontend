import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TimePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({ className, label, error, required, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-200">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          type="time"
          className={cn(
            'w-full rounded-lg border bg-transparent px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            error
              ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
              : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
TimePicker.displayName = "TimePicker";
