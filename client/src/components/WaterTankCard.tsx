import { Card } from "@/components/ui/card";
import { Beaker } from "lucide-react";
import type { WaterTank } from "@shared/schema";

interface WaterTankCardProps {
  waterLevel: number;
  tankConfig: WaterTank;
}

export function WaterTankCard({ waterLevel, tankConfig }: WaterTankCardProps) {
  const calculateVolume = (level: number) => {
    const radius = tankConfig.diameter / 2;
    const height = (level / 100) * tankConfig.height;
    const volumeCm3 = Math.PI * radius * radius * height;
    const liters = volumeCm3 / 1000;
    return liters.toFixed(1);
  };

  const maxVolume = calculateVolume(100);
  const currentVolume = calculateVolume(waterLevel);

  const getStatusColor = () => {
    if (waterLevel < 20) return "bg-destructive";
    if (waterLevel < 40) return "bg-chart-2";
    return "bg-primary";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4">
        <div className="relative w-16 h-32 bg-muted/30 rounded-lg border-2 border-border overflow-hidden">
          <div
            className={`absolute bottom-0 left-0 right-0 ${getStatusColor()} transition-all duration-500`}
            style={{ height: `${waterLevel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Beaker className="h-12 w-12 text-foreground/30" strokeWidth={1.5} />
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Wasserstand
          </p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-mono font-semibold" data-testid="text-water-level">
              {waterLevel}%
            </span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            <span data-testid="text-water-volume">{currentVolume} L</span> von {maxVolume} L
          </div>
          {waterLevel < 20 && (
            <div className="mt-2 text-sm text-destructive font-medium">
              Wasserstand kritisch!
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
