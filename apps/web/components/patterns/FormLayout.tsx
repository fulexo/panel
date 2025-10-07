import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormLayoutProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface FormSectionProps {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function FormLayout({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: FormLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="space-y-6">
        {children}
      </div>

      {footer && (
        <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  columns = 1,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "md:grid-cols-2"
        )}
      >
        {children}
      </div>
    </div>
  );
}

FormLayout.Section = FormSection;

export default FormLayout;
