import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, required, className, ...props }, ref) => {
    const fieldError = error;
    
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-foreground ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground',
            fieldError && 'border-border focus:border-border',
            className
          )}
          {...props}
        />
        {fieldError && (
          <p className="text-sm text-foreground">{fieldError}</p>
        )}
        {helperText && !fieldError && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';