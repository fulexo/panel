import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * SectionShell, kart tabanlı içerikler için ortak başlık/açıklama/aksiyon düzeni sağlar.
 */
export function SectionShell({
  title,
  description,
  actions,
  children,
  footer,
  className,
  contentClassName,
}: SectionShellProps) {
  return (
    <Card className={cn("space-y-4 border border-border/70 bg-card/95 p-6", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
      {footer && <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">{footer}</div>}
    </Card>
  );
}

export default SectionShell;
