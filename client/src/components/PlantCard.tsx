import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Power, Leaf } from "lucide-react";
import type { PlantProfile } from "@shared/schema";
import { getActiveThresholds, getSeasonNameDE } from "@/lib/seasonalUtils";

interface PlantCardProps {
  profile: PlantProfile;
  moisture: number;
  lastWatered?: number;
  onManualWater: (plantId: number) => void;
  isWatering?: boolean;
}

export function PlantCard({
  profile,
  moisture,
  lastWatered,
  onManualWater,
  isWatering = false,
}: PlantCardProps) {
  // Get active thresholds (seasonal or default)
  const activeThresholds = getActiveThresholds(profile);
  const { moistureMin, moistureMax } = activeThresholds;

  const getStatus = () => {
    if (moisture < moistureMin) return "critical";
    if (moisture < moistureMin + 10) return "warning";
    if (moisture > moistureMax) return "overwatered";
    return "healthy";
  };

  const status = getStatus();

  const statusColors = {
    healthy: "bg-primary",
    warning: "bg-chart-2",
    critical: "bg-destructive",
    overwatered: "bg-chart-3",
  };

  const statusLabels = {
    healthy: "Optimal",
    warning: "Niedrig",
    critical: "Kritisch",
    overwatered: "Zu feucht",
  };

  const getProgressColor = () => {
    if (status === "critical") return "bg-destructive";
    if (status === "warning") return "bg-chart-2";
    if (status === "overwatered") return "bg-chart-3";
    return "bg-primary";
  };

  const formatLastWatered = (timestamp?: number) => {
    if (!timestamp) return "Nie";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `vor ${days}d`;
    if (hours > 0) return `vor ${hours}h`;
    if (minutes > 0) return `vor ${minutes}m`;
    return "Gerade eben";
  };

  if (!profile.enabled) {
    return null;
  }

  return (
    <Card className="p-6 hover-elevate transition-all duration-300" data-testid={`card-plant-${profile.id}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Droplets className="h-24 w-24 text-primary" strokeWidth={1.5} />
          <div
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${statusColors[status]} ring-4 ring-card`}
            data-testid={`status-plant-${profile.id}`}
          />
        </div>

        <div className="text-center w-full">
          <h3 className="text-xl font-semibold mb-1" data-testid={`text-plant-name-${profile.id}`}>
            {profile.name}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {statusLabels[status]}
          </Badge>
        </div>

        <div className="w-full space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Feuchtigkeit</span>
            <span className="text-2xl font-mono font-semibold" data-testid={`text-moisture-${profile.id}`}>
              {moisture}%
            </span>
          </div>
          <Progress 
            value={moisture} 
            className="h-3"
            indicatorClassName={getProgressColor()}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{moistureMin}%</span>
            <span>{moistureMax}%</span>
          </div>
          {activeThresholds.isSeasonallyAdjusted && activeThresholds.season && (
            <div 
              className="flex items-center justify-center gap-1 text-xs text-primary"
              data-testid={`seasonal-indicator-${profile.id}`}
            >
              <Leaf className="w-3 h-3" />
              <span>{getSeasonNameDE(activeThresholds.season)} Modus</span>
            </div>
          )}
        </div>

        <div className="w-full pt-2 border-t space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Zuletzt gegossen</span>
            <span className="font-medium" data-testid={`text-last-watered-${profile.id}`}>
              {formatLastWatered(lastWatered)}
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onManualWater(profile.id)}
            disabled={isWatering}
            data-testid={`button-water-${profile.id}`}
          >
            <Power className="mr-2 h-4 w-4" />
            {isWatering ? "Bewässert..." : "Jetzt gießen"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
