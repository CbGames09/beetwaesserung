# 🌱 Automatisches Bewässerungssystem

Ein intelligentes IoT-Bewässerungssystem mit ESP32-S3, Echtzeit-Webmonitor und Firebase-Integration.

## 📋 Funktionen

### Web-Dashboard
- ✅ **Echtzeit-Überwachung**: Live-Daten von 3-4 Pflanzen
- ✅ **Bodenfeuchtigkeit**: Kapazitive Sensoren für genaue Messungen
- ✅ **Umgebungsdaten**: Temperatur und Luftfeuchtigkeit (DHT11)
- ✅ **Wassertank-Monitor**: Ultraschallsensor für Füllstand
- ✅ **Manuelle Bewässerung**: Sofort-Bewässerung per Knopfdruck
- ✅ **PIN-geschützte Einstellungen**: Sichere Konfiguration
- ✅ **Dark/Light Mode**: Automatische Theme-Umschaltung
- ✅ **Responsive Design**: Optimiert für Mobile, Tablet und Desktop
- ✅ **Selbsttest-Anzeige**: Wöchentlicher Systemcheck mit Status-Icons

### ESP32-Steuerung
- ✅ **Automatische Bewässerung**: Basierend auf konfigurierbaren Schwellwerten
- ✅ **Multi-Sensor-Support**: Bis zu 4 Pflanzen gleichzeitig
- ✅ **WiFi-Konnektivität**: Echtzeit-Kommunikation mit Firebase
- ✅ **Pump4-Wartung**: Täglicher 10s-Betrieb bei 3-Pflanzen-Modus
- ✅ **Wöchentlicher Selbsttest**: Alle Sensoren und Pumpen
- ✅ **E-Ink Display**: Systemstatus-Anzeige (Ready für Integration)
- ✅ **Fehlertoleranz**: Robuste Fehlerbehandlung und Reconnects

## 🚀 Schnellstart

### 1. Firebase Setup

Folgen Sie der Anleitung in [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md):
1. Firebase-Projekt erstellen
2. Realtime Database aktivieren
3. Sicherheitsregeln konfigurieren
4. Konfigurationswerte in Replit Secrets eintragen

### 2. Web-Dashboard lokal testen

```bash
npm install
npm run dev
```

Öffnen Sie die Webview - das Dashboard sollte automatisch mit Demo-Daten laden.

**Tipp**: Verwenden Sie den "Dev Tools" Button (rechts unten) um Demo-Daten zu Firebase hochzuladen.

### 3. ESP32 einrichten

Folgen Sie der Anleitung in [`esp32/README.md`](esp32/README.md):
1. MicroPython auf ESP32-S3 flashen
2. Hardware nach [`esp32/WIRING_DIAGRAM.txt`](esp32/WIRING_DIAGRAM.txt) verkabeln
3. `main.py` auf ESP32 hochladen
4. WiFi und Firebase-URL konfigurieren
5. Sensoren kalibrieren

### 4. Auf GitHub Pages deployen

Folgen Sie der Anleitung in [`DEPLOYMENT.md`](DEPLOYMENT.md):
1. Repository auf GitHub pushen
2. GitHub Actions Workflow wird automatisch ausgelöst
3. Website ist verfügbar unter `https://[username].github.io/[repo-name]`

## 📱 Screenshots & UI-Features

### Dashboard-Ansicht
- **Pflanzenkarten**: Zeigen Feuchtigkeit, Name, Typ und Bewässerungsstatus
- **Sensor-Karte**: Temperatur und Luftfeuchtigkeit
- **Wassertank-Karte**: Visueller Füllstand mit Prozentanzeige
- **Systemtest-Karte**: Status-Icons für letzten Selbsttest

### Einstellungen (PIN: 1234)
- **Allgemein**: Anzahl Pflanzen (3-4), Messintervall
- **Pflanzen**: Individuell konfigurierbar (Name, Typ, Schwellwerte)
- **Wassertank**: Dimensionen und Kalibrierung

### Icons & Status
- 🌱 Pflanze gesund (grün)
- 💧 Bewässerung aktiv (blau, animiert)
- ⚠️ Niedriger Wasserstand (gelb)
- ❌ Fehler (rot)
- ✅ Test bestanden
- 🔧 Test mit Warnung

## 🛠 Technologie-Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **State Management**: React Hooks
- **Echtzeit-Daten**: Firebase Realtime Database
- **Icons**: Lucide React
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod

### Backend / IoT
- **Platform**: ESP32-S3 (Waveshare Nano)
- **Language**: MicroPython 1.22
- **Database**: Firebase Realtime Database
- **Communication**: WiFi + REST API

### Hardware
- 3-4× Kapazitive Bodenfeuchtesensoren
- 1× DHT11 (Temperatur/Luftfeuchtigkeit)
- 1× HC-SR04 Ultraschallsensor
- 4× Relais-Modul
- 4× 12V Wasserpumpen
- 1× Waveshare 1.54" E-Ink Display (optional)

## 📁 Projekt-Struktur

```
├── client/               # React Frontend
│   ├── src/
│   │   ├── components/  # UI-Komponenten
│   │   ├── lib/         # Firebase, Utils
│   │   └── pages/       # Dashboard
├── shared/              # Shared TypeScript Types
│   └── schema.ts        # Datenmodelle
├── esp32/               # ESP32 MicroPython Code
│   ├── main.py          # Hauptprogramm
│   ├── README.md        # Hardware-Anleitung
│   └── WIRING_DIAGRAM.txt
├── FIREBASE_SETUP.md    # Firebase-Konfiguration
├── DEPLOYMENT.md        # GitHub Pages Deployment
└── design_guidelines.md # UI/UX Design-System
```

## 🔒 Sicherheit

- **PIN-Schutz**: Einstellungen sind durch 4-stelligen PIN geschützt (Standard: 1234)
- **Firebase Rules**: Strukturierte Zugriffsregeln (siehe FIREBASE_SETUP.md)
- **Secrets Management**: Replit Secrets für API-Keys
- **Keine Hardcoded Credentials**: Alle sensiblen Daten in Environment Variables

**Standard-PIN**: `1234` - Bitte nach erstem Setup ändern!

## 📊 Datenstruktur (Firebase)

```
{
  "sensorData": {
    "timestamp": number,
    "plantMoisture": [number, number, number, number],
    "temperature": number,
    "humidity": number,
    "waterLevel": number
  },
  "settings": {
    "numberOfPlants": 3 | 4,
    "measurementInterval": number,
    "plantProfiles": [...],
    "waterTankDimensions": {...}
  },
  "systemStatus": {
    "online": boolean,
    "lastUpdate": number,
    "displayStatus": "ok" | "warning" | "error"
  },
  "lastTest": {
    "timestamp": number,
    "overallStatus": "passed" | "warning" | "failed",
    "sensorTests": {...},
    "pumpTests": [...],
    "connectivityTest": boolean
  },
  "manualWatering": {
    "plantId": number,
    "duration": number
  }
}
```

## 🐛 Fehlerbehebung

### Dashboard lädt nicht
- Öffnen Sie Browser-Konsole (F12)
- Prüfen Sie Firebase-Konfiguration in Replit Secrets
- Stellen Sie sicher, dass Firebase-Regeln korrekt gesetzt sind

### ESP32 verbindet nicht
- Nur 2.4 GHz WiFi wird unterstützt (nicht 5 GHz!)
- Überprüfen Sie SSID und Passwort in `main.py`
- Serial Monitor öffnen (115200 Baud) für Debug-Ausgaben

### Sensordaten unrealistisch
- Bodenfeuchtesensoren müssen kalibriert werden
- Warten Sie 1-2 Minuten nach dem Einstecken
- Siehe Kalibrierungs-Anleitung in `esp32/README.md`

### "Permission denied" in Firebase
- Firebase-Sicherheitsregeln müssen gesetzt sein
- Siehe detaillierte Anleitung in `FIREBASE_SETUP.md`
- Prüfen Sie, ob Regeln veröffentlicht wurden

## 📝 Entwicklung

### Lokaler Start
```bash
npm run dev
```

### Type-Checking
```bash
npm run typecheck
```

### Deployment Build
```bash
npm run build
```

## 🤝 Beitragen

Dieses Projekt ist Open Source. Verbesserungsvorschläge und Pull Requests sind willkommen!

### Geplante Features
- [ ] Push-Benachrichtigungen bei niedrigem Wasserstand
- [ ] E-Ink Display-Integration (Waveshare 1.54")
- [ ] Historische Daten-Visualisierung (Diagramme)
- [ ] Mobile App (React Native)
- [ ] Multi-Benutzer-Support mit Firebase Auth
- [ ] Automatische Pumpen-Kalibrierung
- [ ] Wettervorhersage-Integration

## 📄 Lizenz

MIT License - Frei für private und kommerzielle Nutzung.

## 💡 Inspiration

Dieses Projekt kombiniert IoT, Web-Technologien und Smart Home Automation für ein praktisches Bewässerungssystem. Perfekt für:
- Hobby-Gärtner
- IoT-Enthusiasten
- Smart Home Projekte
- Lehrzwecke (ESP32, React, Firebase)

---

**Entwickelt mit ❤️ für automatisierte Pflanzenpflege**

🌱 Happy Gardening! 🌱
