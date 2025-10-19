import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon } from "lucide-react";
import type { SystemSettings, PlantProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { SeasonalScheduleEditor } from "@/components/SeasonalScheduleEditor";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => void;
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [editedSettings, setEditedSettings] = useState<SystemSettings>(settings);
  const { toast } = useToast();

  const handleSave = () => {
    if (editedSettings.pin.length !== 4 || !/^\d{4}$/.test(editedSettings.pin)) {
      toast({
        title: "Ungültige PIN",
        description: "Die PIN muss genau 4 Ziffern enthalten.",
        variant: "destructive",
      });
      return;
    }

    if (editedSettings.measurementInterval < 60) {
      toast({
        title: "Ungültiges Intervall",
        description: "Das Messintervall muss mindestens 60 Sekunden betragen.",
        variant: "destructive",
      });
      return;
    }

    // Validate notification settings
    if (editedSettings.notifications.enabled) {
      if (!editedSettings.notifications.email || editedSettings.notifications.email.trim() === "") {
        toast({
          title: "E-Mail erforderlich",
          description: "Bitte geben Sie eine E-Mail-Adresse für Benachrichtigungen ein.",
          variant: "destructive",
        });
        return;
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedSettings.notifications.email)) {
        toast({
          title: "Ungültige E-Mail",
          description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
          variant: "destructive",
        });
        return;
      }
    }

    onSave(editedSettings);
    toast({
      title: "Einstellungen gespeichert",
      description: "Ihre Änderungen wurden erfolgreich gespeichert.",
    });
    onClose();
  };

  const handlePlantProfileChange = (
    id: number,
    field: keyof PlantProfile,
    value: any
  ) => {
    setEditedSettings({
      ...editedSettings,
      plantProfiles: editedSettings.plantProfiles.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>Systemeinstellungen</span>
          </DialogTitle>
          <DialogDescription>
            Konfigurieren Sie Ihr Bewässerungssystem nach Ihren Bedürfnissen.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" data-testid="tab-general">Allgemein</TabsTrigger>
            <TabsTrigger value="plants" data-testid="tab-plants">Pflanzen</TabsTrigger>
            <TabsTrigger value="tank" data-testid="tab-tank">Wassertank</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Benachrichtigungen</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN-Code (4 Ziffern)</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                pattern="\d{4}"
                value={editedSettings.pin}
                onChange={(e) =>
                  setEditedSettings({ ...editedSettings, pin: e.target.value })
                }
                data-testid="input-pin"
                placeholder="••••"
              />
              <p className="text-sm text-muted-foreground">
                Die PIN wird nicht angezeigt und ist sicher gespeichert.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Messintervall (Sekunden)</Label>
              <Input
                id="interval"
                type="number"
                min={60}
                max={86400}
                value={editedSettings.measurementInterval}
                onChange={(e) =>
                  setEditedSettings({
                    ...editedSettings,
                    measurementInterval: parseInt(e.target.value),
                  })
                }
                data-testid="input-interval"
              />
              <p className="text-sm text-muted-foreground">
                Aktuell:{" "}
                {Math.floor(editedSettings.measurementInterval / 60)} Minuten
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="plant-count">Anzahl der Pflanzen</Label>
                <p className="text-sm text-muted-foreground">
                  Wählen Sie 3 oder 4 aktive Pflanzen
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant={editedSettings.numberOfPlants === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setEditedSettings({ ...editedSettings, numberOfPlants: 3 })
                  }
                  data-testid="button-plants-3"
                >
                  3
                </Button>
                <Button
                  variant={editedSettings.numberOfPlants === 4 ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setEditedSettings({ ...editedSettings, numberOfPlants: 4 })
                  }
                  data-testid="button-plants-4"
                >
                  4
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plants" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Konfigurieren Sie individuelle Profile für jede Pflanze.
            </p>
            <Accordion type="single" collapsible className="w-full">
              {editedSettings.plantProfiles.map((profile) => (
                <AccordionItem key={profile.id} value={`plant-${profile.id}`}>
                  <AccordionTrigger data-testid={`accordion-plant-${profile.id}`}>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">{profile.name}</span>
                      {profile.id <= editedSettings.numberOfPlants && (
                        <span className="text-xs text-primary">Aktiv</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${profile.id}`}>Pflanzenname</Label>
                        <Input
                          id={`name-${profile.id}`}
                          value={profile.name}
                          onChange={(e) =>
                            handlePlantProfileChange(profile.id, "name", e.target.value)
                          }
                          data-testid={`input-plant-name-${profile.id}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`min-${profile.id}`}>
                            Untergrenze (%)
                          </Label>
                          <Input
                            id={`min-${profile.id}`}
                            type="number"
                            min={0}
                            max={100}
                            value={profile.moistureMin}
                            onChange={(e) =>
                              handlePlantProfileChange(
                                profile.id,
                                "moistureMin",
                                parseInt(e.target.value)
                              )
                            }
                            data-testid={`input-plant-min-${profile.id}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`max-${profile.id}`}>
                            Obergrenze (%)
                          </Label>
                          <Input
                            id={`max-${profile.id}`}
                            type="number"
                            min={0}
                            max={100}
                            value={profile.moistureMax}
                            onChange={(e) =>
                              handlePlantProfileChange(
                                profile.id,
                                "moistureMax",
                                parseInt(e.target.value)
                              )
                            }
                            data-testid={`input-plant-max-${profile.id}`}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Bewässerung startet bei {profile.moistureMin}% und stoppt bei{" "}
                        {profile.moistureMax}%.
                      </p>

                      <Separator className="my-4" />

                      <SeasonalScheduleEditor
                        profile={profile}
                        onChange={(updatedProfile) => {
                          setEditedSettings({
                            ...editedSettings,
                            plantProfiles: editedSettings.plantProfiles.map((p) =>
                              p.id === updatedProfile.id ? updatedProfile : p
                            ),
                          });
                        }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="tank" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Geben Sie die Maße Ihres Wassertanks ein, um das Volumen zu berechnen.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="diameter">Durchmesser (cm)</Label>
                <Input
                  id="diameter"
                  type="number"
                  min={1}
                  value={editedSettings.waterTank.diameter}
                  onChange={(e) =>
                    setEditedSettings({
                      ...editedSettings,
                      waterTank: {
                        ...editedSettings.waterTank,
                        diameter: parseFloat(e.target.value),
                      },
                    })
                  }
                  data-testid="input-tank-diameter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Höhe (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min={1}
                  value={editedSettings.waterTank.height}
                  onChange={(e) =>
                    setEditedSettings({
                      ...editedSettings,
                      waterTank: {
                        ...editedSettings.waterTank,
                        height: parseFloat(e.target.value),
                      },
                    })
                  }
                  data-testid="input-tank-height"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-2">Berechnetes Volumen</h4>
              <p className="text-2xl font-mono">
                {(
                  (Math.PI *
                    Math.pow(editedSettings.waterTank.diameter / 2, 2) *
                    editedSettings.waterTank.height) /
                  1000
                ).toFixed(2)}{" "}
                Liter
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Formel: V = π × r² × h
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Konfigurieren Sie E-Mail-Benachrichtigungen für kritische Ereignisse. Diese Einstellungen werden vom ESP32 verwendet.
            </p>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="notif-enabled" className="font-semibold">
                  Benachrichtigungen aktivieren
                </Label>
                <p className="text-sm text-muted-foreground">
                  E-Mail-Benachrichtigungen für kritische Ereignisse
                </p>
              </div>
              <Switch
                id="notif-enabled"
                checked={editedSettings.notifications.enabled}
                onCheckedChange={(checked) =>
                  setEditedSettings({
                    ...editedSettings,
                    notifications: {
                      ...editedSettings.notifications,
                      enabled: checked,
                    },
                  })
                }
                data-testid="switch-notifications-enabled"
              />
            </div>

            {editedSettings.notifications.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="notif-email">E-Mail-Adresse</Label>
                  <Input
                    id="notif-email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={editedSettings.notifications.email || ""}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        notifications: {
                          ...editedSettings.notifications,
                          email: e.target.value,
                        },
                      })
                    }
                    data-testid="input-notification-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Diese E-Mail-Adresse empfängt alle Systembenachrichtigungen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="low-water">
                    Niedriger Wasserstand ({editedSettings.notifications.lowWaterThreshold}%)
                  </Label>
                  <Input
                    id="low-water"
                    type="range"
                    min={5}
                    max={30}
                    value={editedSettings.notifications.lowWaterThreshold}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        notifications: {
                          ...editedSettings.notifications,
                          lowWaterThreshold: parseInt(e.target.value),
                        },
                      })
                    }
                    data-testid="input-low-water-threshold"
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Benachrichtigung senden, wenn Wasserstand unter {editedSettings.notifications.lowWaterThreshold}% fällt
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-test-failure" className="font-medium">
                      Testfehler melden
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigung bei wöchentlichen Testfehlern
                    </p>
                  </div>
                  <Switch
                    id="notif-test-failure"
                    checked={editedSettings.notifications.notifyOnTestFailure}
                    onCheckedChange={(checked) =>
                      setEditedSettings({
                        ...editedSettings,
                        notifications: {
                          ...editedSettings.notifications,
                          notifyOnTestFailure: checked,
                        },
                      })
                    }
                    data-testid="switch-notify-test-failure"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-sensor-error" className="font-medium">
                      Sensorfehler melden
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigung bei Sensorfehlfunktionen
                    </p>
                  </div>
                  <Switch
                    id="notif-sensor-error"
                    checked={editedSettings.notifications.notifyOnSensorError}
                    onCheckedChange={(checked) =>
                      setEditedSettings({
                        ...editedSettings,
                        notifications: {
                          ...editedSettings.notifications,
                          notifyOnSensorError: checked,
                        },
                      })
                    }
                    data-testid="switch-notify-sensor-error"
                  />
                </div>

                <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                    ⚠️ ESP32-Konfiguration erforderlich
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Um E-Mail-Benachrichtigungen zu erhalten, müssen Sie den ESP32 mit SMTP-Zugangsdaten konfigurieren. 
                    Siehe <code className="bg-amber-900/20 px-1 rounded">esp32/EMAIL_SETUP.md</code> für Anweisungen.
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-settings-cancel">
            Abbrechen
          </Button>
          <Button onClick={handleSave} data-testid="button-settings-save">
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
