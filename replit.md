# 🌱 ESP32 Pflanzenbewässerungssystem

Automatisches Bewässerungssystem mit ESP32-S3, Firebase Realtime Database und React-Dashboard.

## ✅ Projektstatus: MVP + Erweiterte Features

MVP (Minimum Viable Product) - Vollständig implementiert:
- ✅ React Web-Dashboard mit Dark/Light Mode und Echtzeit-Updates
- ✅ Firebase Realtime Database Integration mit Fehlertoleranz
- ✅ Vollständiger ESP32-S3 MicroPython Code mit allen Features
- ✅ Umfassende Hardware-Dokumentation und Verkabelungsdiagramm
- ✅ Deployment-Anleitung für GitHub Pages

Erweiterte Features - Vollständig implementiert:
- ✅ Historische Datenspeicherung und Visualisierung (Recharts) - Stündlich, 30 Tage Retention
- ✅ E-Mail-Benachrichtigungen für kritische Ereignisse
- ✅ Saisonale Pflanzenprofile mit automatischer Schwellwert-Anpassung
- ✅ Robuste NTP-Synchronisation (4 Server, Auto-Fallback)
- ✅ Hardware-Fehler auf Website sichtbar (NTP, E-Ink Display)
- ✅ ESP32 WiFi Auto-Reconnect (non-blocking, 30s Intervall)
- ✅ Firebase Retry-Logik (3 Versuche, exponential backoff)
- ✅ Modulare ESP32-Architektur (5 separate Python-Module)
- ✅ Detaillierte Selbsttest-Ergebnisse (Feuchtigkeit vorher/nachher, gemessene Werte)
- ✅ App-Icon für Handy (PWA-ready)
- ✅ Historical Charts: Auto-Zoom Y-Achse, Pflanzennamen, Dual-Axis Temp/Humidity

Features in Entwicklung:
- ⏳ CSV-Datenexport
- ⏳ Progressive Web App (PWA) mit Offline-Funktionalität

## Projektübersicht

Dieses Projekt ist ein IoT-basiertes automatisches Bewässerungssystem für 3-4 Pflanzen mit:
- Echtzeit-Monitoring über eine Web-Oberfläche
- Automatische Bewässerungssteuerung basierend auf Bodenfeuchtigkeit
- Saisonale Bewässerungsprofile (Frühling, Sommer, Herbst, Winter)
- Firebase Realtime Database für bidirektionale Kommunikation
- E-Ink Display am ESP32 für Statusanzeige
- Wöchentliche Systemtests
- Historische Datenvisualisierung mit interaktiven Charts
- E-Mail-Benachrichtigungen bei kritischen Ereignissen

## Technologie-Stack

### Frontend (Statische Website - GitHub Pages kompatibel)
- **Framework**: React 18 mit TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS mit Shadcn/UI Komponenten
- **State Management**: TanStack Query (React Query v5)
- **Datenbank**: Firebase Realtime Database
- **Theme**: Dark/Light Mode Support

### Backend
- **Datenbank**: Firebase Realtime Database (kostenloser Spark Plan)
- **Echtzeit-Updates**: Firebase Realtime Database Listeners

### Hardware (ESP32-S3)
- 3-4 Kapazitative Bodenfeuchtesensoren
- DHT11 (Temperatur & Luftfeuchtigkeit)
- Ultraschallsensor (Wasserstandsmessung)
- 4-Kanal Relais mit 4 Pumpen
- Waveshare 1.54" E-Ink Display (200x200, 3-Farben)

### ESP32 Software-Architektur (Modular)
- **main.py** - Hauptprogramm mit robuster Main-Loop
- **hardware.py** - Hardware Controller (Sensoren, Pumpen)
- **wifi_manager.py** - WiFi Management mit Auto-Reconnect
- **firebase_client.py** - Firebase Client mit Retry-Logik
- **ntp_sync.py** - NTP Synchronization mit Multi-Server Fallback

## Projekt-Struktur

```
/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/    # UI Komponenten
│   │   │   ├── Header.tsx
│   │   │   ├── PlantCard.tsx
│   │   │   ├── SensorCard.tsx
│   │   │   ├── WaterTankCard.tsx
│   │   │   ├── SystemTestCard.tsx
│   │   │   ├── PINDialog.tsx
│   │   │   ├── SettingsDialog.tsx
│   │   │   ├── SeasonalScheduleEditor.tsx
│   │   │   ├── HistoryDialog.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── lib/
│   │   │   ├── firebase.ts    # Firebase Konfiguration
│   │   │   ├── historicalData.ts
│   │   │   └── seasonalUtils.ts
│   │   └── App.tsx
│   └── index.html
├── shared/
│   └── schema.ts          # Gemeinsame TypeScript Schemas
├── esp32/                 # ESP32 MicroPython Code (MODULAR)
│   ├── main.py           # Hauptprogramm
│   ├── hardware.py       # Hardware Controller
│   ├── wifi_manager.py   # WiFi Management
│   ├── firebase_client.py # Firebase Client
│   ├── ntp_sync.py       # NTP Synchronization
│   ├── config.example.py  # Config Template (KEINE SECRETS!)
│   ├── .gitignore        # Verhindert Commit von config.py
│   └── README_MODULES.md # ESP32-Dokumentation
└── design_guidelines.md   # Design System Dokumentation
```

## Datenmodell

### Sensor Data
- `plantMoisture`: Array[4] - Bodenfeuchtigkeit 0-100%
- `temperature`: Number - Temperatur in °C
- `humidity`: Number - Luftfeuchtigkeit 0-100%
- `waterLevel`: Number - Wasserstand 0-100%
- `timestamp`: Number - Unix Timestamp

### System Settings
- `pin`: String - 4-stelliger PIN-Code
- `measurementInterval`: Number - Messintervall in Sekunden
- `numberOfPlants`: Number - 3 oder 4 aktive Pflanzen
- `waterTank`: Object - Durchmesser & Höhe in cm
- `plantProfiles`: Array[4] - Profile mit min/max Schwellwerten

### Plant Profile
- `id`: Number - Pflanzennummer 1-4
- `name`: String - Pflanzenname
- `moistureMin`: Number - Untergrenze für Bewässerung
- `moistureMax`: Number - Obergrenze (Bewässerung stoppen)
- `enabled`: Boolean - Pflanze aktiv

## Features

### Dashboard
- Echtzeit-Anzeige aller Sensordaten
- Individuelle Pflanzenkarten mit Status-Indikatoren
- Wassertank-Visualisierung mit Volumenberechnung
- Systemtest-Ergebnisse
- Responsive Design (Desktop, Tablet, Mobile)
- Dark/Light Mode

### Einstellungen (PIN-geschützt)
- PIN-Code Verwaltung
- Messintervall anpassen
- Anzahl der Pflanzen (3 oder 4)
- Individuelle Pflanzenprofile
- Wassertank-Maße konfigurieren
- Manuelle Bewässerung einzelner Pflanzen

### Automatisierung
- Automatische Bewässerung bei Unterschreitung der Schwellwerte
- Wöchentlicher Selbsttest (Sensoren, Pumpen, Konnektivität)
- Pumpe 4 läuft täglich 10 Sekunden bei 3-Pflanzen-Konfiguration

## Firebase Struktur

```
firebase-realtime-database/
├── sensorData/           # Aktuelle Sensordaten vom ESP32
├── settings/             # Systemeinstellungen
├── systemStatus/         # Online-Status, Display-Status
├── lastTest/            # Letztes Selbsttest-Ergebnis
├── manualWatering/      # Manuelle Bewässerungsbefehle
└── historicalData/      # Historische Daten (stündlich, 30 Tage)
```

## Environment Variables

Die folgenden Environment Variables sind konfiguriert:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**WICHTIG**: Sie müssen die Firebase Realtime Database-Sicherheitsregeln konfigurieren!
Siehe `FIREBASE_SETUP.md` für eine vollständige Anleitung.

## Entwicklung

### Lokaler Start
```bash
npm run dev
```

Die Anwendung läuft auf `http://0.0.0.0:5000`

### Build für GitHub Pages
```bash
npm run build
```

Die statischen Dateien werden in `/dist` generiert.

## Design System

Das Design-System basiert auf Material Design Prinzipien für IoT-Dashboards:
- **Primärfarbe**: Grün (142 71% 45%) für gesunde Pflanzen
- **Warning**: Orange (38 92% 50%) für Warnungen
- **Error**: Rot (0 84% 60%) für kritische Zustände
- **Schriftarten**: Inter (UI), JetBrains Mono (Daten)
- **Icons**: Lucide React

Details siehe `design_guidelines.md`

## ESP32 Setup & Troubleshooting

### Erste Inbetriebnahme:
1. Kopiere `esp32/config.example.py` nach `esp32/config.py`
2. Trage deine WiFi-Credentials und Firebase-URL ein
3. Lade alle Module auf den ESP32 hoch (siehe `esp32/README_MODULES.md`)
4. Starte den ESP32 - System läuft automatisch!

### Robustheit:
- **WiFi-Probleme**: Auto-Reconnect alle 30 Sekunden (non-blocking)
- **Firebase-Timeouts**: Retry-Logik (3 Versuche, exponential backoff)
- **NTP Timeout**: Versucht automatisch 4 Server, Fehler auf Website sichtbar
- **E-Ink Display**: Detaillierte Diagnostik, Fehler auf Website sichtbar
- **Kein Aufhängen**: System läuft weiter auch bei Errors

### Wichtige Sicherheitshinweise:
- ⚠️ **NIEMALS** `config.py` mit echten Credentials committen!
- ⚠️ Nutze nur `config.example.py` als Template (enthält Placeholders)
- ⚠️ `config.py` ist in `.gitignore` und wird nicht versioniert

## Spezielle Features

### Bei 3-Pflanzen-Konfiguration
- Pumpe 4 läuft automatisch täglich für 10 Sekunden (verhindert Verstopfung)

### Wöchentlicher Selbsttest
- Test aller 4 Bodenfeuchtesensoren & Pumpen (3s Wasser → 1min warten → Feuchtigkeit muss steigen)
- Test DHT11 Sensor (Temperatur & Luftfeuchtigkeit > 0)
- Test Ultraschallsensor (Distanz ≤ Tankgröße + 5cm)
- Ergebnisse mit Details auf Website angezeigt (Feuchtigkeit vorher/nachher, gemessene Werte)
- Kein Datenbanktest mehr (nicht benötigt)

### E-Ink Display
- Zeigt System-Status-Icon (OK, Warning, Error)
- Energieeffizient (nur bei Statusänderung aktualisieren)
