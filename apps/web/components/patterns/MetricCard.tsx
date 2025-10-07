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
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200",
  green:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200",
  purple:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200",
  emerald:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200",
  warning:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200",
  destructive:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200",
};

export interface MetricCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
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
  label,
  value,
  context,
  tone = "default",
  isLoading,
  subtle,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md",
        subtle && "bg-card/80 dark:bg-card/60"
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-muted/60" aria-hidden>
                &nbsp;
              </span>
            ) : (
              <div className="text-2xl font-semibold text-foreground">{value}</div>
            )}
          </div>
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-base",
                toneStyles[tone]
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
        {context && (
          <p className="text-xs font-medium text-muted-foreground/90 dark:text-muted-foreground">
            {context}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default MetricCard;
