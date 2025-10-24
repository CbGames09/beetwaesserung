import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Droplet, Thermometer, Wind, Clock } from "lucide-react";
import { fetchHistoricalData, downsampleData, type TimeRangeKey, TIME_RANGES } from "@/lib/historicalData";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemSettings } from "@shared/schema";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings?: SystemSettings;
}

export function HistoryDialog({ open, onOpenChange, settings }: HistoryDialogProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [activeTab, setActiveTab] = useState<string>("moisture");

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["historicalData", timeRange],
    queryFn: () => fetchHistoricalData(timeRange),
    enabled: open,
    staleTime: 60000,
  });

  const data = rawData ? downsampleData(rawData, 100) : [];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === "24h") {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    } else if (timeRange === "7d") {
      return date.toLocaleDateString("de-DE", { month: "short", day: "numeric", hour: "2-digit" });
    } else {
      return date.toLocaleDateString("de-DE", { month: "short", day: "numeric" });
    }
  };

  // Get plant names from settings
  const plantNames = settings?.plantProfiles.map(p => p.name) || ['Pflanze 1', 'Pflanze 2', 'Pflanze 3', 'Pflanze 4'];

  const chartData = data.map(item => ({
    timestamp: item.timestamp,
    time: formatDate(item.timestamp),
    plant1: item.plantMoisture[0],
    plant2: item.plantMoisture[1],
    plant3: item.plantMoisture[2],
    plant4: item.plantMoisture[3],
    temperature: item.temperature,
    humidity: item.humidity,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-history-title">
            <Clock className="h-5 w-5" />
            Historische Daten
          </DialogTitle>
          <DialogDescription data-testid="text-history-description">
            Visualisierung der Sensordaten über Zeit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((key) => (
              <Button
                key={key}
                variant={timeRange === key ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(key)}
                data-testid={`button-timerange-${key}`}
              >
                {TIME_RANGES[key].label}
              </Button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" data-testid="skeleton-chart" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-error">
              Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-data">
              Keine historischen Daten für diesen Zeitraum vorhanden.
            </div>
          )}

          {/* Charts */}
          {!isLoading && !error && data.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2" data-testid="tabs-history">
                <TabsTrigger value="moisture" data-testid="tab-moisture">
                  <Droplet className="h-4 w-4 mr-2" />
                  Bodenfeuchtigkeit
                </TabsTrigger>
                <TabsTrigger value="temperature" data-testid="tab-temperature">
                  <Thermometer className="h-4 w-4 mr-2" />
                  Temperatur & Luftfeuchtigkeit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="moisture" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="time" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      label={{ value: '%', position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="plant1" 
                      stroke="hsl(var(--chart-1))" 
                      name={plantNames[0]}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="plant2" 
                      stroke="hsl(var(--chart-2))" 
                      name={plantNames[1]}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="plant3" 
                      stroke="hsl(var(--chart-3))" 
                      name={plantNames[2]}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="plant4" 
                      stroke="hsl(var(--chart-4))" 
                      name={plantNames[3]}
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>


              <TabsContent value="temperature" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="time" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      yAxisId="temp"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      label={{ value: '°C', position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="humidity"
                      orientation="right"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      label={{ value: '%', position: 'insideRight' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="hsl(var(--chart-5))" 
                      name="Temperatur (°C)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="humidity"
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="hsl(var(--chart-1))" 
                      name="Luftfeuchtigkeit (%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}

          {/* Data Info */}
          {!isLoading && data.length > 0 && (
            <div className="text-sm text-muted-foreground text-center" data-testid="text-data-info">
              {data.length} Datenpunkte ({TIME_RANGES[timeRange].label})
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
