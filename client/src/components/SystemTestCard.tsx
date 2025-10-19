import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SystemTestResult } from "@shared/schema";

interface SystemTestCardProps {
  testResult?: SystemTestResult;
  nextTestTime?: number;
}

export function SystemTestCard({ testResult, nextTestTime }: SystemTestCardProps) {
  const [isOpen, setIsOpen] = useState(false);

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
    if (testResult.overallStatus === "passed")
      return <ShieldCheck className="h-6 w-6 text-primary" />;
    if (testResult.overallStatus === "warning")
      return <ShieldAlert className="h-6 w-6 text-chart-2" />;
    return <ShieldX className="h-6 w-6 text-destructive" />;
  };

  const getStatusLabel = () => {
    if (!testResult) return "Kein Test durchgeführt";
    if (testResult.overallStatus === "passed") return "Alle Tests bestanden";
    if (testResult.overallStatus === "warning") return "Warnung";
    return "Test fehlgeschlagen";
  };

  const getNextTestInfo = () => {
    if (!nextTestTime) return "Nächster Test: Unbekannt";
    const days = Math.ceil((nextTestTime - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Nächster Test: Bald fällig";
    return `Nächster Test: in ${days} Tag${days > 1 ? "en" : ""}`;
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

        {testResult && (
          <CollapsibleContent className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Sensoren</h4>
                {testResult.sensorTests.moistureSensors.map((passed, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Feuchtigkeitssensor {idx + 1}</span>
                    <Badge variant={passed ? "default" : "destructive"}>
                      {passed ? "OK" : "Fehler"}
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">DHT11</span>
                  <Badge variant={testResult.sensorTests.dht11 ? "default" : "destructive"}>
                    {testResult.sensorTests.dht11 ? "OK" : "Fehler"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ultraschall</span>
                  <Badge variant={testResult.sensorTests.ultrasonic ? "default" : "destructive"}>
                    {testResult.sensorTests.ultrasonic ? "OK" : "Fehler"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pumpen</h4>
                {testResult.pumpTests.map((passed, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pumpe {idx + 1}</span>
                    <Badge variant={passed ? "default" : "destructive"}>
                      {passed ? "OK" : "Fehler"}
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verbindung</span>
                  <Badge variant={testResult.connectivityTest ? "default" : "destructive"}>
                    {testResult.connectivityTest ? "OK" : "Fehler"}
                  </Badge>
                </div>
              </div>
            </div>

            {testResult.details && (
              <div className="mt-3 p-3 bg-muted/30 rounded-md">
                <p className="text-sm text-muted-foreground">{testResult.details}</p>
              </div>
            )}
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}
