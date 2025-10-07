import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "info"
  | "warning"
  | "success"
  | "muted"
  | "destructive"
  | "default";

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "muted";

const toneMap: Record<StatusTone, { variant: BadgeVariant; textClass?: string }> = {
  info: { variant: "info" },
  warning: { variant: "warning" },
  success: { variant: "success" },
  muted: { variant: "muted" },
  destructive: { variant: "destructive" },
  default: { variant: "default" },
};

export function StatusPill({ label, tone = "default", icon, className }: StatusPillProps) {
  const toneConfig = toneMap[tone];

  return (
    <Badge
      variant={toneConfig.variant}
      className={cn("gap-1 px-2.5 py-1 text-xs font-semibold", toneConfig.textClass, className)}
    >
      {icon}
      <span>{label}</span>
    </Badge>
  );
}

export default StatusPill;
