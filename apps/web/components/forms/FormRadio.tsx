import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FormRadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  name: string;
}

export const FormRadio = forwardRef<HTMLInputElement, FormRadioProps>(
  ({ label, error, helperText, required, options, name, className, ...props }, ref) => {
    return (
      <div className="space-y-3">
        {label && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              {label}
              {required && <span className="text-foreground ml-1">*</span>}
            </label>
          </div>
        )}
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer">
              <input
                ref={ref}
                type="radio"
                name={name}
                value={option.value}
                className={cn(
                  'w-4 h-4 text-foreground bg-input border-border focus:ring-ring focus:ring-2',
                  error && 'border-border focus:border-border',
                  className
                )}
                {...props}
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </div>
        {error && (
          <p className="text-sm text-foreground">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormRadio.displayName = 'FormRadio';
