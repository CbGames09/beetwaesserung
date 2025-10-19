import { database, ref, set, get, push } from "./firebase";
import {
  defaultSystemSettings,
  defaultSensorData,
  defaultSystemStatus,
  type SystemSettings,
  type SensorData,
  type SystemStatus,
  type SystemTestResult,
  type HistoricalSensorData,
} from "@shared/schema";

/**
 * Initialize Firebase database with default values if they don't exist
 */
export async function initializeFirebaseData() {
  try {
    console.log("Starting Firebase initialization...");
    
    const settingsRef = ref(database, "settings");
    const settingsSnapshot = await get(settingsRef);

    if (!settingsSnapshot.exists()) {
      await set(settingsRef, defaultSystemSettings);
      console.log("✓ Firebase: Default settings initialized");
    } else {
      console.log("✓ Firebase: Settings already exist");
    }

    const sensorRef = ref(database, "sensorData");
    const sensorSnapshot = await get(sensorRef);

    if (!sensorSnapshot.exists()) {
      await set(sensorRef, defaultSensorData);
      console.log("✓ Firebase: Default sensor data initialized");
    } else {
      console.log("✓ Firebase: Sensor data already exists");
    }

    const statusRef = ref(database, "systemStatus");
    const statusSnapshot = await get(statusRef);

    if (!statusSnapshot.exists()) {
      await set(statusRef, defaultSystemStatus);
      console.log("✓ Firebase: Default system status initialized");
    } else {
      console.log("✓ Firebase: System status already exists");
    }

    console.log("✓ Firebase initialization complete");
    return true;
  } catch (error) {
    console.error("✗ Firebase initialization failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

/**
 * Seed database with demo data for testing
 */
export async function seedDemoData() {
  try {
    const demoSensorData: SensorData = {
      timestamp: Date.now(),
      plantMoisture: [45, 62, 28, 71],
      temperature: 22.5,
      humidity: 58,
      waterLevel: 75,
      waterLevelCm: 7.5,
    };

    const demoTestResult: SystemTestResult = {
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      overallStatus: "passed",
      sensorTests: {
        moistureSensors: [true, true, true, true],
        dht11: true,
        ultrasonic: true,
      },
      pumpTests: [true, true, true, true],
      connectivityTest: true,
      details: "Alle Tests erfolgreich abgeschlossen",
    };

    const demoSystemStatus: SystemStatus = {
      online: true,
      lastUpdate: Date.now(),
      displayStatus: "ok",
    };

    await set(ref(database, "sensorData"), demoSensorData);
    await set(ref(database, "lastTest"), demoTestResult);
    await set(ref(database, "systemStatus"), demoSystemStatus);

    // Seed 7 days of historical data (one reading every 2 hours)
    await seedHistoricalData();

    console.log("✓ Demo data seeded successfully");
    return true;
  } catch (error) {
    console.error("✗ Failed to seed demo data:", error);
    return false;
  }
}

/**
 * Generate realistic historical data for the last 7 days
 */
export async function seedHistoricalData() {
  try {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoHours = 2 * 60 * 60 * 1000;

    const historicalRef = ref(database, "historicalData");

    // Generate data points every 2 hours for 7 days
    for (let timestamp = sevenDaysAgo; timestamp < now; timestamp += twoHours) {
      // Create realistic varying data
      const timeOfDay = new Date(timestamp).getHours();
      const dayVariation = Math.sin((timestamp - sevenDaysAgo) / (24 * 60 * 60 * 1000) * Math.PI * 2);

      // Temperature varies by time of day (cooler at night, warmer during day)
      const baseTemp = 20 + (timeOfDay / 24) * 6;
      const temperature = baseTemp + dayVariation * 2 + (Math.random() * 2 - 1);

      // Humidity inversely correlates with temperature
      const humidity = 70 - (temperature - 20) * 2 + (Math.random() * 10 - 5);

      // Moisture decreases over time, with occasional watering events
      const daysSince = (timestamp - sevenDaysAgo) / (24 * 60 * 60 * 1000);
      const wasWatered = Math.random() > 0.85; // 15% chance of watering
      
      const plant1Base = 70 - daysSince * 5 + (wasWatered ? 20 : 0);
      const plant2Base = 65 - daysSince * 4 + (wasWatered ? 20 : 0);
      const plant3Base = 60 - daysSince * 6 + (wasWatered ? 20 : 0);
      const plant4Base = 75 - daysSince * 3 + (wasWatered ? 20 : 0);

      // Water level decreases over time, occasional refills
      const waterLevel = Math.max(10, 100 - daysSince * 8 + (Math.random() > 0.9 ? 50 : 0));

      const dataPoint: HistoricalSensorData = {
        timestamp,
        plantMoisture: [
          Math.max(20, Math.min(100, plant1Base + Math.random() * 5 - 2.5)),
          Math.max(20, Math.min(100, plant2Base + Math.random() * 5 - 2.5)),
          Math.max(20, Math.min(100, plant3Base + Math.random() * 5 - 2.5)),
          Math.max(20, Math.min(100, plant4Base + Math.random() * 5 - 2.5)),
        ],
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.max(30, Math.min(90, Math.round(humidity))),
        waterLevel: Math.round(waterLevel),
      };

      await push(historicalRef, dataPoint);
    }

    console.log("✓ Historical data seeded successfully");
    return true;
  } catch (error) {
    console.error("✗ Failed to seed historical data:", error);
    return false;
  }
}

/**
 * Clear all manual watering commands
 */
export async function clearManualWatering() {
  try {
    await set(ref(database, "manualWatering"), null);
    return true;
  } catch (error) {
    console.error("✗ Failed to clear manual watering:", error);
    return false;
  }
}

/**
 * Get current settings from Firebase
 */
export async function getSettings(): Promise<SystemSettings | null> {
  try {
    const snapshot = await get(ref(database, "settings"));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("✗ Failed to get settings:", error);
    return null;
  }
}

/**
 * Update settings in Firebase
 */
export async function updateSettings(settings: SystemSettings): Promise<boolean> {
  try {
    await set(ref(database, "settings"), settings);
    return true;
  } catch (error) {
    console.error("✗ Failed to update settings:", error);
    return false;
  }
}

/**
 * Update sensor data (called by ESP32)
 */
export async function updateSensorData(data: SensorData): Promise<boolean> {
  try {
    await set(ref(database, "sensorData"), data);
    return true;
  } catch (error) {
    console.error("✗ Failed to update sensor data:", error);
    return false;
  }
}

/**
 * Update system status (called by ESP32)
 */
export async function updateSystemStatus(status: SystemStatus): Promise<boolean> {
  try {
    await set(ref(database, "systemStatus"), status);
    return true;
  } catch (error) {
    console.error("✗ Failed to update system status:", error);
    return false;
  }
}

/**
 * Update test results (called by ESP32 after weekly test)
 */
export async function updateTestResult(result: SystemTestResult): Promise<boolean> {
  try {
    await set(ref(database, "lastTest"), result);
    return true;
  } catch (error) {
    console.error("✗ Failed to update test result:", error);
    return false;
  }
}
