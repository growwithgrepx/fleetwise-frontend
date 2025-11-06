import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, required, ...props }, ref) => {
    const inputId = props.id || `date-picker-${Math.random().toString(36).substring(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type="date"
          className={cn(
            'block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
            error ? 'border-red-500' : 'border-gray-600',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export { DatePicker };
