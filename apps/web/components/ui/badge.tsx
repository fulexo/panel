import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info'
    | 'muted';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-destructive text-destructive-foreground': variant === 'destructive',
          'border border-border text-foreground': variant === 'outline',
          'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]':
            variant === 'success',
          'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]':
            variant === 'warning',
          'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]': variant === 'info',
          'bg-muted text-muted-foreground': variant === 'muted',
        },
        className
      )}
      {...props}
    />
  );
}