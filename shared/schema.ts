import { z } from "zod";

// ===== Sensor Data Schemas =====

export const sensorDataSchema = z.object({
  timestamp: z.number(),
  plantMoisture: z.array(z.number().min(0).max(100)).length(4), // 4 moisture sensors (0-100%)
  temperature: z.number(), // DHT11 temperature in Celsius
  humidity: z.number().min(0).max(100), // DHT11 humidity (0-100%)
  waterLevel: z.number().min(0).max(100), // Water tank level (0-100%)
  waterLevelCm: z.number(), // Actual distance in cm from ultrasonic sensor
});

export type SensorData = z.infer<typeof sensorDataSchema>;

// ===== Plant Profile Schema =====

export const seasonalThresholdsSchema = z.object({
  moistureMin: z.number().min(0).max(100),
  moistureMax: z.number().min(0).max(100),
});

export type SeasonalThresholds = z.infer<typeof seasonalThresholdsSchema>;

export const plantProfileSchema = z.object({
  id: z.number().min(1).max(4),
  name: z.string().min(1).max(50),
  moistureMin: z.number().min(0).max(100), // Default/year-round lower threshold
  moistureMax: z.number().min(0).max(100), // Default/year-round upper threshold
  enabled: z.boolean(),
  useSeasonalSchedule: z.boolean().default(false),
  seasonalThresholds: z.object({
    spring: seasonalThresholdsSchema.optional(), // March - May
    summer: seasonalThresholdsSchema.optional(), // June - August
    fall: seasonalThresholdsSchema.optional(),   // September - November
    winter: seasonalThresholdsSchema.optional(), // December - February
  }).optional(),
});

export type PlantProfile = z.infer<typeof plantProfileSchema>;

// ===== System Settings Schema =====

export const waterTankSchema = z.object({
  diameter: z.number().positive(), // in cm
  height: z.number().positive(), // in cm
});

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  email: z.string().email().optional(),
  lowWaterThreshold: z.number().min(0).max(100).default(10), // Notify when water below this %
  notifyOnTestFailure: z.boolean().default(true),
  notifyOnSensorError: z.boolean().default(true),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const systemSettingsSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/), // 4-digit PIN
  measurementInterval: z.number().min(60).max(86400), // seconds (1 min to 24 hours)
  numberOfPlants: z.number().int().min(3).max(4),
  waterTank: waterTankSchema,
  plantProfiles: z.array(plantProfileSchema).length(4),
  notifications: notificationSettingsSchema.default({
    enabled: false,
    lowWaterThreshold: 10,
    notifyOnTestFailure: true,
    notifyOnSensorError: true,
  }),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type WaterTank = z.infer<typeof waterTankSchema>;

// ===== System Test Result Schema =====

// ESP32 sends detailed test results
export const systemTestResultSchema = z.object({
  timestamp: z.number(),
  overall: z.boolean(),
  moistureSensors: z.array(z.object({
    passed: z.boolean(),
    moistureBefore: z.number().optional(),
    moistureAfter: z.number().optional(),
    message: z.string(),
  })),
  pumps: z.array(z.object({
    passed: z.boolean(),
    moistureBefore: z.number().optional(),
    moistureAfter: z.number().optional(),
    message: z.string(),
  })),
  dht11: z.object({
    passed: z.boolean(),
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    message: z.string(),
  }),
  ultrasonic: z.object({
    passed: z.boolean(),
    distance: z.number().optional(),
    maxAllowed: z.number().optional(),
    message: z.string(),
  }),
});

export type SystemTestResult = z.infer<typeof systemTestResultSchema>;

// ===== Manual Watering Command Schema =====

export const manualWateringSchema = z.object({
  plantId: z.number().min(1).max(4),
  timestamp: z.number(),
  duration: z.number().positive().default(10), // seconds
});

export type ManualWatering = z.infer<typeof manualWateringSchema>;

// ===== Manual Test Trigger Schema =====

export const manualTestTriggerSchema = z.object({
  trigger: z.boolean().default(false),
  timestamp: z.number().default(0),
});

export type ManualTestTrigger = z.infer<typeof manualTestTriggerSchema>;

// ===== System Status Schema =====

export const systemStatusSchema = z.object({
  online: z.boolean(),
  lastUpdate: z.number(),
  displayStatus: z.enum(["ok", "warning", "error"]), // For E-Ink display icon
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

// ===== System Error Schema =====

export const systemErrorSchema = z.object({
  timestamp: z.number(),
  errorType: z.enum(["sensor", "pump", "connectivity", "general"]),
  component: z.string(), // e.g., "DHT11", "Moisture Sensor 1", "Pump 2", "Firebase"
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  resolved: z.boolean().default(false),
});

export type SystemError = z.infer<typeof systemErrorSchema>;

// ===== Default Values =====

export const defaultPlantProfiles: PlantProfile[] = [
  { id: 1, name: "Pflanze 1", moistureMin: 30, moistureMax: 70, enabled: true, useSeasonalSchedule: false },
  { id: 2, name: "Pflanze 2", moistureMin: 30, moistureMax: 70, enabled: true, useSeasonalSchedule: false },
  { id: 3, name: "Pflanze 3", moistureMin: 30, moistureMax: 70, enabled: true, useSeasonalSchedule: false },
  { id: 4, name: "Pflanze 4", moistureMin: 30, moistureMax: 70, enabled: true, useSeasonalSchedule: false },
];

export const defaultNotificationSettings: NotificationSettings = {
  enabled: false,
  lowWaterThreshold: 10,
  notifyOnTestFailure: true,
  notifyOnSensorError: true,
};

export const defaultSystemSettings: SystemSettings = {
  pin: import.meta.env.VITE_DEFAULT_PIN || "0000", // Fallback nur für Dev-Umgebung
  measurementInterval: 300, // 5 minutes
  numberOfPlants: 3,
  waterTank: {
    diameter: 20, // 20cm
    height: 30, // 30cm
  },
  plantProfiles: defaultPlantProfiles,
  notifications: {
    enabled: false,
    lowWaterThreshold: 10,
    notifyOnTestFailure: true,
    notifyOnSensorError: true,
  },
};

export const defaultSensorData: SensorData = {
  timestamp: Date.now(),
  plantMoisture: [0, 0, 0, 0],
  temperature: 0,
  humidity: 0,
  waterLevel: 0,
  waterLevelCm: 0,
};

export const defaultSystemStatus: SystemStatus = {
  online: false,
  lastUpdate: 0,
  displayStatus: "error",
};

// ===== Historical Data Schema =====

export const historicalSensorDataSchema = z.object({
  timestamp: z.number(),
  plantMoisture: z.array(z.number().min(0).max(100)).length(4),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  waterLevel: z.number().min(0).max(100),
});

export type HistoricalSensorData = z.infer<typeof historicalSensorDataSchema>;

