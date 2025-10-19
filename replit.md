# ESP32 Pflanzenbewässerungssystem

Automatisches Bewässerungssystem mit ESP32-S3, Firebase Realtime Database und React-Dashboard.

## Projektübersicht

Dieses Projekt ist ein IoT-basiertes automatisches Bewässerungssystem für 3-4 Pflanzen mit:
- Echtzeit-Monitoring über eine Web-Oberfläche
- Automatische Bewässerungssteuerung basierend auf Bodenfeuchtigkeit
- Firebase Realtime Database für bidirektionale Kommunikation
- E-Ink Display am ESP32 für Statusanzeige
- Wöchentliche Systemtests

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
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── lib/
│   │   │   └── firebase.ts    # Firebase Konfiguration
│   │   └── App.tsx
│   └── index.html
├── shared/
│   └── schema.ts          # Gemeinsame TypeScript Schemas
├── esp32/                 # ESP32 MicroPython Code (wird noch erstellt)
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
└── manualWatering/      # Manuelle Bewässerungsbefehle
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

## Nächste Schritte

1. ✅ Frontend-Komponenten und Schema erstellt
2. ⏳ Backend Integration mit Firebase
3. ⏳ ESP32 MicroPython Code entwickeln
4. ⏳ E-Ink Display Ansteuerung
5. ⏳ GitHub Pages Deployment vorbereiten

## Spezielle Features

### Bei 3-Pflanzen-Konfiguration
- Pumpe 4 läuft automatisch täglich für 10 Sekunden (verhindert Verstopfung)

### Wöchentlicher Selbsttest
- Test aller 4 Bodenfeuchtesensoren
- Test DHT11 Sensor
- Test Ultraschallsensor
- Test aller 4 Pumpen
- Test Datenbankverbindung
- Ergebnisse werden auf Website angezeigt

### E-Ink Display
- Zeigt System-Status-Icon (OK, Warning, Error)
- Energieeffizient (nur bei Statusänderung aktualisieren)
