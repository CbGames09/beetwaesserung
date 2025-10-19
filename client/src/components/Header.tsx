import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Wifi, WifiOff } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { SystemStatus } from "@shared/schema";

interface HeaderProps {
  systemStatus: SystemStatus;
  onSettingsClick: () => void;
}

export function Header({ systemStatus, onSettingsClick }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = () => {
    if (!systemStatus.online) return "bg-muted-foreground";
    if (systemStatus.displayStatus === "ok") return "bg-primary";
    if (systemStatus.displayStatus === "warning") return "bg-chart-2";
    return "bg-destructive";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}
              data-testid="status-system-online"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Pflanzenbewässerung</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-3">
            <span className="text-2xl font-mono font-semibold" data-testid="text-current-time">
              {formatTime(currentTime)}
            </span>
            {systemStatus.online ? (
              <Badge variant="default" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            data-testid="button-open-settings"
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Einstellungen</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
