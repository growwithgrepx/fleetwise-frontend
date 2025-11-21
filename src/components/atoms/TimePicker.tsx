import { forwardRef, InputHTMLAttributes } from 'react';
import TimePicker24Hour from '@/components/atoms/TimePicker24Hour';
import { cn } from '@/lib/utils';

export interface TimePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({ className, label, error, required, value, onChange, ...props }, ref) => {
    // Handle the onChange event properly to match the expected signature
    const handleChange = (newValue: string) => {
      // Create a synthetic event to match the expected ChangeEvent<HTMLInputElement> signature
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-200">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <TimePicker24Hour
          value={value as string || ''}
          onChange={handleChange}
          className={cn(
            error
              ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
              : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600',
            className
          )}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
TimePicker.displayName = "TimePicker";
