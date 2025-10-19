import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { database, ref, onValue, remove } from "@/lib/firebase";
import { useEffect, useState } from "react";
import type { SystemError } from "@shared/schema";

export function ErrorsCard() {
  const [errors, setErrors] = useState<Record<string, SystemError>>({});

  useEffect(() => {
    const errorsRef = ref(database, "systemErrors");
    const unsubscribe = onValue(errorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, SystemError>;
        // Filter out resolved errors and keep only recent 10
        const activeErrors = Object.entries(data)
          .filter(([_, error]) => !error.resolved)
          .sort(([_, a], [__, b]) => b.timestamp - a.timestamp)
          .slice(0, 10)
          .reduce((acc, [key, error]) => ({ ...acc, [key]: error }), {});
        setErrors(activeErrors);
      } else {
        setErrors({});
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = async (errorKey: string) => {
    try {
      await remove(ref(database, `systemErrors/${errorKey}`));
    } catch (error) {
      console.error("Failed to dismiss error:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await remove(ref(database, "systemErrors"));
    } catch (error) {
      console.error("Failed to clear errors:", error);
    }
  };

  const errorCount = Object.keys(errors).length;
  const criticalCount = Object.values(errors).filter(e => e.severity === "error").length;
  const warningCount = Object.values(errors).filter(e => e.severity === "warning").length;

  const getSeverityIcon = (severity: string) => {
    if (severity === "error") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-muted-foreground" />;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === "error") return <Badge variant="destructive">Fehler</Badge>;
    if (severity === "warning") return <Badge variant="outline" className="border-warning text-warning">Warnung</Badge>;
    return <Badge variant="outline">Info</Badge>;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Gerade eben";
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)} Std`;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card data-testid="card-errors">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Systemfehler
          {errorCount > 0 && (
            <Badge variant="destructive" className="ml-2" data-testid="badge-error-count">
              {errorCount}
            </Badge>
          )}
        </CardTitle>
        {errorCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            data-testid="button-clear-all-errors"
          >
            <X className="w-4 h-4 mr-1" />
            Alle löschen
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {errorCount === 0 ? (
          <div className="text-center py-6 text-muted-foreground" data-testid="text-no-errors">
            ✓ Keine Systemfehler
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex gap-4 text-sm pb-2 border-b">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">{criticalCount} kritisch</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">{warningCount} Warnungen</span>
                </div>
              )}
            </div>

            {/* Error List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(errors).map(([key, error]) => (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-md bg-card border hover-elevate"
                  data-testid={`error-item-${key}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(error.severity)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSeverityBadge(error.severity)}
                      <span className="font-medium text-sm" data-testid={`text-component-${key}`}>
                        {error.component}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(error.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-message-${key}`}>
                      {error.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDismiss(key)}
                    className="flex-shrink-0"
                    data-testid={`button-dismiss-${key}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
