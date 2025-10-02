"use client";

import { ComponentProps, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type PageHeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  disabled?: boolean;
};

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
  actions?: PageHeaderAction[] | ReactNode;
  align?: "start" | "center";
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  className,
  children,
  actions,
  align = "start",
}: PageHeaderProps) {
  const renderActions = () => {
    if (!actions) return null;

    if (Array.isArray(actions)) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action, index) => {
            const content = (
              <>
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={`${action.label}-${index}`}
                  asChild
                  variant={action.variant ?? "default"}
                  size={action.size ?? "sm"}
                  disabled={action.disabled}
                >
                  <a href={action.href}>{content}</a>
                </Button>
              );
            }

            return (
              <Button
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                variant={action.variant ?? "default"}
                size={action.size ?? "sm"}
                disabled={action.disabled}
              >
                {content}
              </Button>
            );
          })}
        </div>
      );
    }

    return actions;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-center lg:justify-between",
        align === "center" && "items-center text-center lg:text-left",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3", align === "center" && "items-center lg:items-start") }>
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && (
              <p className="text-base text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {children && <div className="max-w-2xl text-sm text-muted-foreground">{children}</div>}
      </div>
      {renderActions()}
    </div>
  );
}

export type { PageHeaderAction };
