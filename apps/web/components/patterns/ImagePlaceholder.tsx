import { type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ImagePlaceholderProps {
  label?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  labelHidden?: boolean;
}

/**
 * Görsel bulunamadığında veya yüklenmediğinde tutarlı bir boş durum sunar.
 */
export function ImagePlaceholder({
  label = "Görsel yok",
  icon,
  className,
  labelHidden,
}: ImagePlaceholderProps) {
  const IconComponent = icon || ImageOff;
  
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/40 text-xs text-muted-foreground",
        className
      )}
    >
      <IconComponent className="h-8 w-8" />
      {!labelHidden && <span>{label}</span>}
    </div>
  );
}