import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SensorCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  testId?: string;
  className?: string;
}

export function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  testId,
  className = "",
}: SensorCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-mono font-semibold" data-testid={testId}>
              {value}
            </span>
            <span className="text-sm text-muted-foreground uppercase">
              {unit}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
