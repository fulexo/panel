import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, className, actions }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center shadow-inner",
        className
      )}
    >
      {Icon && (
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-foreground">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
