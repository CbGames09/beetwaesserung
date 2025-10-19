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

export const plantProfileSchema = z.object({
  id: z.number().min(1).max(4),
  name: z.string().min(1).max(50),
  moistureMin: z.number().min(0).max(100), // Lower threshold for watering
  moistureMax: z.number().min(0).max(100), // Upper threshold (stop watering)
  enabled: z.boolean(),
});

export type PlantProfile = z.infer<typeof plantProfileSchema>;

// ===== System Settings Schema =====

export const waterTankSchema = z.object({
  diameter: z.number().positive(), // in cm
  height: z.number().positive(), // in cm
});

export const systemSettingsSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/), // 4-digit PIN
  measurementInterval: z.number().min(60).max(86400), // seconds (1 min to 24 hours)
  numberOfPlants: z.number().int().min(3).max(4),
  waterTank: waterTankSchema,
  plantProfiles: z.array(plantProfileSchema).length(4),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type WaterTank = z.infer<typeof waterTankSchema>;

// ===== System Test Result Schema =====

export const systemTestResultSchema = z.object({
  timestamp: z.number(),
  overallStatus: z.enum(["passed", "warning", "failed"]),
  sensorTests: z.object({
    moistureSensors: z.array(z.boolean()).length(4),
    dht11: z.boolean(),
    ultrasonic: z.boolean(),
  }),
  pumpTests: z.array(z.boolean()).length(4),
  connectivityTest: z.boolean(),
  details: z.string().optional(),
});

export type SystemTestResult = z.infer<typeof systemTestResultSchema>;

// ===== Manual Watering Command Schema =====

export const manualWateringSchema = z.object({
  plantId: z.number().min(1).max(4),
  timestamp: z.number(),
  duration: z.number().positive().default(10), // seconds
});

export type ManualWatering = z.infer<typeof manualWateringSchema>;

// ===== System Status Schema =====

export const systemStatusSchema = z.object({
  online: z.boolean(),
  lastUpdate: z.number(),
  displayStatus: z.enum(["ok", "warning", "error"]), // For E-Ink display icon
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

// ===== Default Values =====

export const defaultPlantProfiles: PlantProfile[] = [
  { id: 1, name: "Pflanze 1", moistureMin: 30, moistureMax: 70, enabled: true },
  { id: 2, name: "Pflanze 2", moistureMin: 30, moistureMax: 70, enabled: true },
  { id: 3, name: "Pflanze 3", moistureMin: 30, moistureMax: 70, enabled: true },
  { id: 4, name: "Pflanze 4", moistureMin: 30, moistureMax: 70, enabled: false },
];

export const defaultSystemSettings: SystemSettings = {
  pin: "1234",
  measurementInterval: 300, // 5 minutes
  numberOfPlants: 3,
  waterTank: {
    diameter: 20, // 20cm
    height: 30, // 30cm
  },
  plantProfiles: defaultPlantProfiles,
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
