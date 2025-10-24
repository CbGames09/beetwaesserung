# 🔧 Troubleshooting: ESP32 Selbsttest PUT 401/400 Fehler

## Problem

Der ESP32 bekommt beim Selbsttest **PUT 401 (Unauthorized)** oder **PUT 400 (Bad Request)** Fehler bei Firebase, obwohl normale Sensordaten (Bodenfeuchtigkeit, Temperatur, Luftfeuchtigkeit) erfolgreich hochgeladen werden.

**Symptome:**
- ✅ Normale Messdaten erscheinen auf der Website
- ❌ Selbsttest-Ergebnisse fehlen auf der Website
- ❌ ESP32 Logs zeigen PUT 401/400 Fehler beim Test

## Ursache

Die Firebase-Sicherheitsregeln fehlen für zwei wichtige Pfade, die der ESP32 beim Selbsttest benötigt:

1. **`manualTest`** - Für manuelle Test-Trigger von der Website
2. **`testConnection`** - Für den Datenbank-Verbindungstest

Ohne diese Regeln blockiert Firebase die Schreibzugriffe mit **401 (Unauthorized)** oder **400 (Bad Request)**.

## Lösung

### Schritt 1: Firebase Console öffnen

1. Gehen Sie zu https://console.firebase.google.com/
2. Wählen Sie Ihr Projekt aus
3. Klicken Sie auf **"Realtime Database"** im linken Menü
4. Wechseln Sie zum Tab **"Regeln"**

### Schritt 2: Sicherheitsregeln aktualisieren

Ersetzen Sie Ihre bestehenden Regeln mit den **vollständigen Regeln** aus `FIREBASE_SETUP.md`:

```json
{
  "rules": {
    "sensorData": {
      ".read": true,
      ".write": true
    },
    "settings": {
      ".read": true,
      ".write": true
    },
    "systemStatus": {
      ".read": true,
      ".write": true
    },
    "lastTest": {
      ".read": true,
      ".write": true
    },
    "manualWatering": {
      ".read": true,
      ".write": true
    },
    "manualTest": {
      ".read": true,
      ".write": true
    },
    "testConnection": {
      ".read": true,
      ".write": true
    },
    "systemErrors": {
      ".read": true,
      ".write": true
    },
    "historicalData": {
      ".read": true,
      ".write": true
    }
  }
}
```

### Schritt 3: Regeln veröffentlichen

1. Klicken Sie auf **"Veröffentlichen"**
2. Warten Sie auf die Bestätigung

### Schritt 4: ESP32 neu starten

1. Starten Sie Ihren ESP32 neu
2. Der Selbsttest läuft automatisch beim Start
3. Prüfen Sie die Website - die Testergebnisse sollten jetzt erscheinen!

## Verifikation

Nach dem Update sollten Sie sehen:

### Auf der Website
- ✅ Systemtest-Karte zeigt Ergebnisse
- ✅ Alle 4 Tests (Sensoren, DHT11, Ultraschall, Datenbank) haben Status
- ✅ Timestamp des letzten Tests ist aktuell

### Im ESP32 Serial Monitor
```
→ Testing database connection...
  ✓ PASSED

==================================================
OVERALL: ✓ ALL TESTS PASSED
==================================================
```

## Zusätzliche Hinweise

### Warum funktionieren normale Sensordaten trotzdem?

Der ESP32 schreibt normale Messdaten an den Pfad `sensorData`, der bereits in Ihren Regeln definiert war. Der Selbsttest verwendet aber zusätzlich:
- `lastTest` - für Testergebnisse
- `testConnection` - für Verbindungstest
- `manualTest` - für manuelle Trigger

### Sicherheit

Diese Regeln erlauben öffentlichen Zugriff. Das ist akzeptabel, weil:
- Die Firebase-URL ist nur Ihnen bekannt
- Es sind keine sensiblen Daten
- Es ist ein privates IoT-Projekt

Für maximale Sicherheit siehe "Noch sicherere Regeln" in `FIREBASE_SETUP.md`.

## Häufige Fehler

### Fehler: "Permission denied"
→ Regeln wurden nicht veröffentlicht oder nicht korrekt kopiert

### Fehler: "Invalid JSON"
→ Syntax-Fehler in den Regeln (fehlendes Komma, Klammer)

### Fehler: Immer noch 401/400
→ Browser-Cache leeren oder 5 Minuten warten, bis Firebase-Regeln aktiv sind
