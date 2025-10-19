import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Leaf, Droplets, Flower2, Sun, Wind, Snowflake } from "lucide-react";
import type { PlantProfile } from "@shared/schema";
import { getSeasonNameDE, type Season } from "@/lib/seasonalUtils";

interface SeasonalScheduleEditorProps {
  profile: PlantProfile;
  onChange: (profile: PlantProfile) => void;
}

const seasons: Season[] = ["spring", "summer", "fall", "winter"];

export function SeasonalScheduleEditor({ profile, onChange }: SeasonalScheduleEditorProps) {
  const [useSchedule, setUseSchedule] = useState(profile.useSeasonalSchedule ?? false);

  // Sync local state with props when profile changes (e.g., when dialog reopens)
  useEffect(() => {
    setUseSchedule(profile.useSeasonalSchedule ?? false);
  }, [profile.id, profile.useSeasonalSchedule]);

  const handleToggle = (enabled: boolean) => {
    setUseSchedule(enabled);
    onChange({
      ...profile,
      useSeasonalSchedule: enabled,
      seasonalThresholds: enabled ? (profile.seasonalThresholds || {}) : undefined,
    });
  };

  const handleSeasonalThresholdChange = (
    season: Season,
    field: "moistureMin" | "moistureMax",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));

    const currentSeasonalThresholds = profile.seasonalThresholds || {};
    const currentSeasonConfig = currentSeasonalThresholds[season] || {
      moistureMin: profile.moistureMin,
      moistureMax: profile.moistureMax,
    };

    onChange({
      ...profile,
      seasonalThresholds: {
        ...currentSeasonalThresholds,
        [season]: {
          ...currentSeasonConfig,
          [field]: clampedValue,
        },
      },
    });
  };

  const handleClearSeason = (season: Season) => {
    const currentSeasonalThresholds = profile.seasonalThresholds || {};
    const { [season]: removed, ...rest } = currentSeasonalThresholds;
    
    onChange({
      ...profile,
      seasonalThresholds: rest,
    });
  };

  const getSeasonIcon = (season: Season) => {
    const icons: Record<Season, typeof Flower2> = {
      spring: Flower2,
      summer: Sun,
      fall: Wind,
      winter: Snowflake,
    };
    return icons[season];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor={`seasonal-${profile.id}`} className="text-base font-medium">
            Saisonale Bewässerung
          </Label>
          <p className="text-sm text-muted-foreground">
            Passe Bewässerungsschwellwerte für jede Jahreszeit an
          </p>
        </div>
        <Switch
          id={`seasonal-${profile.id}`}
          checked={useSchedule}
          onCheckedChange={handleToggle}
          data-testid={`switch-seasonal-${profile.id}`}
        />
      </div>

      {useSchedule && (
        <div className="space-y-3">
          {seasons.map((season) => {
            const seasonConfig = profile.seasonalThresholds?.[season];
            const isConfigured = !!seasonConfig;
            const SeasonIcon = getSeasonIcon(season);

            return (
              <Card key={season} className="bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle 
                      className="text-sm font-medium flex items-center gap-2"
                      data-testid={`season-title-${season}-${profile.id}`}
                    >
                      <SeasonIcon className="w-4 h-4" />
                      {getSeasonNameDE(season)}
                    </CardTitle>
                    {isConfigured && (
                      <button
                        onClick={() => handleClearSeason(season)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-clear-${season}-${profile.id}`}
                      >
                        Standard verwenden
                      </button>
                    )}
                  </div>
                  <CardDescription 
                    className="text-xs"
                    data-testid={`season-status-${season}-${profile.id}`}
                  >
                    {isConfigured
                      ? "Benutzerdefinierte Schwellwerte aktiv"
                      : "Standard-Schwellwerte werden verwendet"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${season}-min-${profile.id}`}
                        className="text-xs flex items-center gap-1 text-muted-foreground"
                      >
                        <Droplets className="w-3 h-3" />
                        Minimum (%)
                      </Label>
                      <Input
                        id={`${season}-min-${profile.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={seasonConfig?.moistureMin ?? profile.moistureMin}
                        onChange={(e) =>
                          handleSeasonalThresholdChange(season, "moistureMin", e.target.value)
                        }
                        className="h-8 text-sm"
                        data-testid={`input-${season}-min-${profile.id}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${season}-max-${profile.id}`}
                        className="text-xs flex items-center gap-1 text-muted-foreground"
                      >
                        <Leaf className="w-3 h-3" />
                        Maximum (%)
                      </Label>
                      <Input
                        id={`${season}-max-${profile.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={seasonConfig?.moistureMax ?? profile.moistureMax}
                        onChange={(e) =>
                          handleSeasonalThresholdChange(season, "moistureMax", e.target.value)
                        }
                        className="h-8 text-sm"
                        data-testid={`input-${season}-max-${profile.id}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
