import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { seedDemoData } from "@/lib/firebaseInit";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Beaker } from "lucide-react";
import type { SystemSettings } from "@shared/schema";

interface DevPanelProps {
  settings?: SystemSettings;
}

export function DevPanel({ settings }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const handleSeedData = async () => {
    setIsSeeding(true);
    const success = await seedDemoData();
    
    if (success) {
      toast({
        title: "Demo-Daten geladen",
        description: "Die Datenbank wurde mit Beispieldaten gefüllt.",
      });
    } else {
      toast({
        title: "Fehler",
        description: "Demo-Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    }
    
    setIsSeeding(false);
  };

  const handleShowSettings = () => {
    if (settings) {
      console.log("📊 AKTUELLE SETTINGS AUS FIREBASE:", settings);
      alert(`Settings aus Firebase:\n\nAnzahl Pflanzen: ${settings.numberOfPlants}\nPIN: ${settings.pin}\nMessintervall: ${settings.measurementInterval}s\n\nSiehe Console (F12) für Details`);
    }
  };

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="shadow-lg"
        >
          <Beaker className="mr-2 h-4 w-4" />
          Dev Tools
          <ChevronUp className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Card className="p-4 shadow-xl w-64">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Beaker className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Dev Tools</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSeedData}
              disabled={isSeeding}
            >
              {isSeeding ? "Lädt..." : "Demo-Daten laden"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleShowSettings}
            >
              Settings anzeigen
            </Button>
            
            {settings && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                <strong>numberOfPlants:</strong> {settings.numberOfPlants}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              Füllt die Firebase-Datenbank mit Beispieldaten für Tests.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
