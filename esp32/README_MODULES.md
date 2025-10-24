# ESP32 Modulare Architektur

## ✅ Neue Modulare Struktur

Das ESP32-Programm wurde in mehrere Module aufgeteilt für bessere Wartbarkeit und Robustheit:

### Module:

1. **`main.py`** - Hauptprogramm
   - Koordiniert alle Module
   - Robuste Main-Loop mit WiFi Auto-Reconnect
   - Historical Data-Speicherung (stündlich)

2. **`hardware.py`** - Hardware Controller
   - Alle Sensor-Lesevorgänge
   - Pumpen-Steuerung
   - Fehlertolerante Sensor-Reads

3. **`wifi_manager.py`** - WiFi Management
   - Auto-Reconnect bei Verbindungsabbruch
   - Intelligentes Connection-Monitoring
   - Timeout-Handling

4. **`firebase_client.py`** - Firebase Client
   - HTTP-Requests mit Retry-Logik (3 Versuche)
   - Exponential Backoff
   - 10-Sekunden Timeout pro Request
   - Historical Data Upload-Funktion

5. **`ntp_sync.py`** - NTP Time Synchronization
   - Multi-Server Fallback (4 Server)
   - Automatische MEZ/MESZ Erkennung
   - UTC Timestamp-Management

## 🚀 Installation

1. **Kopiere alle neuen Dateien auf den ESP32:**
   ```
   main.py
   hardware.py
   wifi_manager.py
   firebase_client.py
   ntp_sync.py
   epaper1in54b.py
   ntptime.py
   ```

2. **Konfiguriere main.py:**
   - WiFi SSID & Passwort
   - Firebase URL
   - Pin-Konfiguration
   - E-Ink Display aktivieren/deaktivieren

3. **Starte den ESP32** - Das System läuft automatisch!

## ⚡ Verbesserungen

### Robustheit:
- ✅ WiFi Auto-Reconnect alle 30 Sekunden
- ✅ Firebase Retry-Logik (3 Versuche, exponential backoff)
- ✅ NTP Multi-Server Fallback (4 Server)
- ✅ Kein Aufhängen bei Timeouts/Errors
- ✅ Alle Exceptions werden gefangen

### Features:
- ✅ Historical Data-Speicherung (stündlich)
- ✅ Alle Werte auf 1 Dezimalstelle gerundet
- ✅ Comprehensive Error-Logging zu Firebase
- ✅ E-Ink Display mit robustem Init

### Code-Qualität:
- ✅ Modulare Architektur
- ✅ Klare Verantwortlichkeiten
- ✅ Einfacher zu warten und erweitern
- ✅ Übersichtliche main.py (< 300 Zeilen)

## 🔧 Debugging

Falls Probleme auftreten:

1. **WiFi-Probleme:** 
   - Check Console: `→ Connecting to WiFi`
   - Auto-Reconnect sollte nach 30s erneut versuchen

2. **Firebase-Timeouts:**
   - Retry-Logik versucht 3x automatisch
   - Check Console für `⚠ Firebase ... attempt X/3`

3. **NTP-Fehler:**
   - System versucht 4 verschiedene Server
   - Fallback auf System-Time wenn alle fehlschlagen
   - Fehler wird zu Firebase geloggt

4. **E-Ink Display:**
   - Schalte `ENABLE_EINK_DISPLAY = False` zum Deaktivieren
   - System läuft weiter ohne Display

## 📊 Historical Data

- Daten werden **stündlich** automatisch gespeichert
- Firebase Path: `/historicalData/`
- Website zeigt Charts für 24h, 7d, 30d
- Downsampling für Performance (max 100 Datenpunkte pro Chart)

## ⚠️ Wichtige Hinweise

1. **Alte main.py wird ÜBERSCHRIEBEN** - Backup vorher erstellen!
2. **Alle Module müssen auf ESP32** - System funktioniert nicht ohne Module
3. **WiFi Auto-Reconnect** - System sollte nie mehr "hängen bleiben"
4. **Firebase Retry** - Network-Fehler werden automatisch behandelt
