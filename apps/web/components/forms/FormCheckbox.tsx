import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, helperText, required, className, ...props }, ref) => {
    const fieldError = error;
    
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-3">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary',
              fieldError && 'border-destructive focus:border-destructive',
              className
            )}
            {...props}
          />
          {label && (
            <span className="text-sm font-medium text-foreground">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </span>
          )}
        </label>
        {fieldError && (
          <p className="text-sm text-destructive">{fieldError}</p>
        )}
        {helperText && !fieldError && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';