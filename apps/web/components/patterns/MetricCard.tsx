import { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type MetricTone =
  | "default"
  | "blue"
  | "green"
  | "purple"
  | "emerald"
  | "warning"
  | "destructive";

const toneStyles: Record<MetricTone, string> = {
  default:
    "bg-accent/40 text-foreground border-border/60 dark:bg-accent/20 dark:text-foreground",
  blue: "bg-accent/10 text-foreground border-border",
  green: "bg-accent/10 text-foreground border-border",
  purple: "bg-accent/10 text-foreground border-border",
  emerald: "bg-accent/10 text-foreground border-border",
  warning: "bg-accent/10 text-foreground border-border",
  destructive: "bg-accent/10 text-foreground border-border",
};

export interface MetricCardProps {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  label?: string;
  value: ReactNode;
  description?: string;
  context?: ReactNode;
  tone?: MetricTone;
  isLoading?: boolean;
  subtle?: boolean;
}

/**
 * MetricCard, dashboard benzeri ekranlarda tekrar eden metrik görünümlerini
 * standartlaştırarak tema ve erişilebilirlik tutarlılığı sağlar.
 */
export function MetricCard({
  icon: Icon,
  title,
  label,
  value,
  description,
  context,
  tone = "default",
  isLoading,
  subtle,
}: MetricCardProps) {
  const displayLabel = title || label;
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md h-24 sm:h-32",
        subtle && "bg-card/80 dark:bg-card/60"
      )}
    >
      <CardContent className="p-3 sm:p-6 h-full flex flex-col">
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">{displayLabel}</p>
              {isLoading ? (
                <div className="h-6 sm:h-8 w-16 sm:w-24 animate-pulse rounded-md bg-muted/60" aria-hidden />
              ) : (
                <div className="text-xl sm:text-3xl font-bold text-foreground leading-none">{value}</div>
              )}
            </div>
            {(description || context) && (
              <div className="mt-auto">
                <p className="text-xs font-medium text-muted-foreground/90 dark:text-muted-foreground">
                  {description || context}
                </p>
              </div>
            )}
          </div>
          {Icon && (
            <div
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl border flex-shrink-0 ml-2 sm:ml-4",
                toneStyles[tone]
              )}
            >
              <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
