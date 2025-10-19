import type { PlantProfile } from "@shared/schema";

export type Season = "spring" | "summer" | "fall" | "winter";

/**
 * Determine the current season based on the date (Northern Hemisphere)
 * Spring: March (3), April (4), May (5)
 * Summer: June (6), July (7), August (8)
 * Fall: September (9), October (10), November (11)
 * Winter: December (12), January (1), February (2)
 */
export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
  
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter"; // December (12), January (1), February (2)
}

/**
 * Get the season name in German
 */
export function getSeasonNameDE(season: Season): string {
  const names: Record<Season, string> = {
    spring: "Frühling",
    summer: "Sommer",
    fall: "Herbst",
    winter: "Winter",
  };
  return names[season];
}

/**
 * Get the active moisture thresholds for a plant profile based on current season
 * Returns seasonal thresholds if enabled and configured, otherwise returns default thresholds
 */
export function getActiveThresholds(profile: PlantProfile, date: Date = new Date()): {
  moistureMin: number;
  moistureMax: number;
  season?: Season;
  isSeasonallyAdjusted: boolean;
} {
  // If seasonal schedule is not enabled, use default thresholds
  if (!profile.useSeasonalSchedule || !profile.seasonalThresholds) {
    return {
      moistureMin: profile.moistureMin,
      moistureMax: profile.moistureMax,
      isSeasonallyAdjusted: false,
    };
  }

  const currentSeason = getCurrentSeason(date);
  const seasonalConfig = profile.seasonalThresholds[currentSeason];

  // If seasonal thresholds are configured for this season, use them
  if (seasonalConfig) {
    return {
      moistureMin: seasonalConfig.moistureMin,
      moistureMax: seasonalConfig.moistureMax,
      season: currentSeason,
      isSeasonallyAdjusted: true,
    };
  }

  // Fall back to default thresholds if seasonal config is missing for this season
  return {
    moistureMin: profile.moistureMin,
    moistureMax: profile.moistureMax,
    season: currentSeason,
    isSeasonallyAdjusted: false,
  };
}

