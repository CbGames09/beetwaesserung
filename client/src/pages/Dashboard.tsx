import { useState, useEffect } from "react";
import { Thermometer, Droplet } from "lucide-react";
import { Header } from "@/components/Header";
import { PlantCard } from "@/components/PlantCard";
import { SensorCard } from "@/components/SensorCard";
import { WaterTankCard } from "@/components/WaterTankCard";
import { SystemTestCard } from "@/components/SystemTestCard";
import { ErrorsCard } from "@/components/ErrorsCard";
import { PINDialog } from "@/components/PINDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { HistoryDialog } from "@/components/HistoryDialog";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { DevPanel } from "@/components/DevPanel";
import { useToast } from "@/hooks/use-toast";
import { database, ref, onValue, set } from "@/lib/firebase";
import { initializeFirebaseData } from "@/lib/firebaseInit";
import type {
  SensorData,
  SystemSettings,
  SystemStatus,
  SystemTestResult,
  ManualWatering,
} from "@shared/schema";
import { defaultSensorData, defaultSystemSettings, defaultSystemStatus } from "@shared/schema";

export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData>(defaultSensorData);
  const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(defaultSystemStatus);
  const [testResult, setTestResult] = useState<SystemTestResult | undefined>();
  const [showPINDialog, setShowPINDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [wateringPlantId, setWateringPlantId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const sensorRef = ref(database, "sensorData");
    const settingsRef = ref(database, "settings");
    const statusRef = ref(database, "systemStatus");
    const testRef = ref(database, "lastTest");

    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        setSensorData(snapshot.val());
      }
    });

    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.val());
      }
    });

    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setSystemStatus(snapshot.val());
      }
    });

    const unsubscribeTest = onValue(testRef, (snapshot) => {
      if (snapshot.exists()) {
        setTestResult(snapshot.val());
      }
    });

    initializeFirebaseData()
      .catch((err) => {
        console.warn("Firebase initialization warning:", err);
      })
      .finally(() => {
        setTimeout(() => setIsInitialized(true), 500);
      });

    return () => {
      unsubscribeSensor();
      unsubscribeSettings();
      unsubscribeStatus();
      unsubscribeTest();
    };
  }, []);

  const handleSettingsClick = () => {
    setShowPINDialog(true);
  };

  const handlePINSuccess = () => {
    setShowPINDialog(false);
    setShowSettings(true);
  };

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      await set(ref(database, "settings"), newSettings);
      setSettings(newSettings);
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Einstellungen wurden erfolgreich übernommen.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Die Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleManualWater = async (plantId: number) => {
    setWateringPlantId(plantId);
    
    const command: ManualWatering = {
      plantId,
      timestamp: Date.now(),
      duration: 10,
    };

    try {
      await set(ref(database, "manualWatering"), command);
      
      toast({
        title: "Bewässerung gestartet",
        description: `Pflanze ${plantId} wird für 10 Sekunden bewässert.`,
      });

      setTimeout(() => {
        setWateringPlantId(null);
      }, 10000);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Die Bewässerung konnte nicht gestartet werden.",
        variant: "destructive",
      });
      setWateringPlantId(null);
    }
  };

  const activePlants = settings.plantProfiles.filter(
    (p) => p.id <= settings.numberOfPlants
  );

  // DEBUG: Log für Entwicklung
  if (import.meta.env.DEV) {
    console.log("🌱 DEBUG Plant Display:", {
      numberOfPlants: settings.numberOfPlants,
      totalProfiles: settings.plantProfiles.length,
      profileIds: settings.plantProfiles.map(p => p.id),
      activePlantIds: activePlants.map(p => p.id),
    });
  }

  const nextTestTime = testResult
    ? testResult.timestamp + 7 * 24 * 60 * 60 * 1000
    : undefined;

  if (!isInitialized) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        systemStatus={systemStatus} 
        onSettingsClick={handleSettingsClick}
        onHistoryClick={() => setShowHistory(true)}
      />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SensorCard
            icon={Thermometer}
            label="Temperatur"
            value={sensorData.temperature.toFixed(1)}
            unit="°C"
            testId="text-temperature"
          />
          <SensorCard
            icon={Droplet}
            label="Luftfeuchtigkeit"
            value={sensorData.humidity.toFixed(0)}
            unit="%"
            testId="text-humidity"
          />
          <WaterTankCard
            waterLevel={sensorData.waterLevel}
            tankConfig={settings.waterTank}
          />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Pflanzenüberwachung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activePlants.map((profile) => (
              <PlantCard
                key={profile.id}
                profile={profile}
                moisture={sensorData.plantMoisture[profile.id - 1]}
                onManualWater={handleManualWater}
                isWatering={wateringPlantId === profile.id}
              />
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-semibold">Systemstatus</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemTestCard testResult={testResult} nextTestTime={nextTestTime} />
            <ErrorsCard />
          </div>
        </div>
      </main>

      <PINDialog
        open={showPINDialog}
        onClose={() => setShowPINDialog(false)}
        onSuccess={handlePINSuccess}
        correctPIN={settings.pin}
      />

      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <HistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <DevPanel />
    </div>
  );
}
