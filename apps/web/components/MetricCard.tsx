import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel, 
  className 
}: MetricCardProps) {
  const getTrendColor = (trend?: number) => {
    if (!trend) return 'text-muted-foreground';
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getTrendIcon = (trend?: number) => {
    if (!trend) return null;
    if (trend > 0) return '↗';
    if (trend < 0) return '↘';
    return '→';
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend !== undefined && trendLabel && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
                {getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className="ml-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
