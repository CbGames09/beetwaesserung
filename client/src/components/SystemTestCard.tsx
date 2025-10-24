import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, Play } from "lucide-react";
import { useState } from "react";
import type { SystemTestResult } from "@shared/schema";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import { useToast } from "@/hooks/use-toast";

interface SystemTestCardProps {
  testResult?: SystemTestResult;
  nextTestTime?: number;
}

export function SystemTestCard({ testResult, nextTestTime }: SystemTestCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = () => {
    if (!testResult) return <ShieldAlert className="h-6 w-6 text-muted-foreground" />;
    if (testResult.overall)
      return <ShieldCheck className="h-6 w-6 text-primary" />;
    return <ShieldX className="h-6 w-6 text-destructive" />;
  };

  const getStatusLabel = () => {
    if (!testResult) return "Kein Test durchgeführt";
    if (testResult.overall) return "Alle Tests bestanden";
    return "Test fehlgeschlagen";
  };

  const getNextTestInfo = () => {
    if (!nextTestTime) return "Nächster Test: Unbekannt";
    const days = Math.ceil((nextTestTime - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Nächster Test: Bald fällig";
    return `Nächster Test: in ${days} Tag${days > 1 ? "en" : ""}`;
  };

  const handleTriggerTest = async () => {
    setIsTriggering(true);
    try {
      const manualTestRef = ref(database, "manualTest");
      await set(manualTestRef, {
        trigger: true,
        timestamp: Date.now(),
      });
      
      toast({
        title: "Systemtest gestartet",
        description: "Der ESP32 führt jetzt den Systemtest durch. Ergebnisse erscheinen in Kürze.",
      });
    } catch (error) {
      console.error("Failed to trigger manual test:", error);
      toast({
        title: "Fehler",
        description: "Systemtest konnte nicht gestartet werden.",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Card className="p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div data-testid="icon-system-test-status">{getStatusIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold" data-testid="text-test-status">
                {getStatusLabel()}
              </h3>
              {testResult && (
                <p className="text-sm text-muted-foreground">
                  Letzter Test: {formatDate(testResult.timestamp)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{getNextTestInfo()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerTest}
              disabled={isTriggering}
              data-testid="button-trigger-manual-test"
            >
              <Play className="h-4 w-4 mr-2" />
              {isTriggering ? "Starte..." : "Test starten"}
            </Button>
            
            {testResult && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-toggle-test-details">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {testResult && testResult.moistureSensors && testResult.dht11 && testResult.ultrasonic && (
          <CollapsibleContent className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Sensoren & Pumpen</h4>
                {testResult.moistureSensors.map((sensor, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pflanze {idx + 1}</span>
                      <Badge variant={sensor.passed ? "default" : "destructive"} data-testid={`badge-sensor-${idx + 1}`}>
                        {sensor.passed ? "OK" : "Fehler"}
                      </Badge>
                    </div>
                    {sensor.moistureBefore !== undefined && sensor.moistureAfter !== undefined && (
                      <p className="text-xs text-muted-foreground pl-2">
                        {sensor.moistureBefore.toFixed(1)}% → {sensor.moistureAfter.toFixed(1)}%
                      </p>
                    )}
                    {!sensor.passed && (
                      <p className="text-xs text-destructive pl-2">{sensor.message}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Umgebungssensoren</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">DHT11</span>
                    <Badge variant={testResult.dht11.passed ? "default" : "destructive"} data-testid="badge-dht11">
                      {testResult.dht11.passed ? "OK" : "Fehler"}
                    </Badge>
                  </div>
                  {testResult.dht11.temperature !== undefined && testResult.dht11.humidity !== undefined && (
                    <p className="text-xs text-muted-foreground pl-2">
                      {testResult.dht11.temperature.toFixed(1)}°C, {testResult.dht11.humidity.toFixed(1)}%
                    </p>
                  )}
                  {!testResult.dht11.passed && (
                    <p className="text-xs text-destructive pl-2">{testResult.dht11.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ultraschall</span>
                    <Badge variant={testResult.ultrasonic.passed ? "default" : "destructive"} data-testid="badge-ultrasonic">
                      {testResult.ultrasonic.passed ? "OK" : "Fehler"}
                    </Badge>
                  </div>
                  {testResult.ultrasonic.distance !== undefined && (
                    <p className="text-xs text-muted-foreground pl-2">
                      {testResult.ultrasonic.distance.toFixed(1)}cm
                      {testResult.ultrasonic.maxAllowed !== undefined && (
                        <span> (max: {testResult.ultrasonic.maxAllowed}cm)</span>
                      )}
                    </p>
                  )}
                  {!testResult.ultrasonic.passed && (
                    <p className="text-xs text-destructive pl-2">{testResult.ultrasonic.message}</p>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}
