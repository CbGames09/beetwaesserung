# 🚀 Schnellstart-Anleitung

Willkommen zu Ihrem automatischen Bewässerungssystem! Folgen Sie diesen Schritten, um loszulegen.

## 📋 Checkliste

- [ ] Firebase-Projekt einrichten
- [ ] Firebase-Regeln konfigurieren  
- [ ] Web-Dashboard testen
- [ ] Hardware beschaffen
- [ ] ESP32 verkabeln
- [ ] ESP32-Software flashen
- [ ] System testen
- [ ] (Optional) Auf GitHub Pages deployen

## 1️⃣ Firebase einrichten (15 Minuten)

### Schritt-für-Schritt:

1. **Firebase-Projekt erstellen**
   - Gehen Sie zu https://console.firebase.google.com/
   - Klicken Sie auf "Projekt hinzufügen"
   - Projektname: z.B. "pflanzenbewasserung"
   - Google Analytics können Sie deaktivieren

2. **Realtime Database aktivieren**
   - Im Firebase-Projekt: Build → Realtime Database
   - "Datenbank erstellen" klicken
   - Standort wählen: "europe-west1"
   - "Im Testmodus starten" wählen

3. **Sicherheitsregeln setzen**
   - Tab "Regeln" öffnen
   - Folgende Regeln einfügen:
   
   ```json
   {
     "rules": {
       "sensorData": { ".read": true, ".write": true },
       "settings": { ".read": true, ".write": true },
       "systemStatus": { ".read": true, ".write": true },
       "lastTest": { ".read": true, ".write": true },
       "manualWatering": { ".read": true, ".write": true }
     }
   }
   ```
   
   - "Veröffentlichen" klicken

4. **Konfiguration kopieren**
   - Zahnrad-Symbol → Projekteinstellungen
   - Runterscrollen zu "Ihre Apps"
   - Web-Symbol (`</>`) klicken
   - App-Name: "Dashboard"
   - Konfigurationswerte notieren

5. **In Replit eintragen**
   - Die Secrets sind bereits angelegt
   - Falls Sie sie aktualisieren müssen: Tools → Secrets
   - Werte aus Firebase-Konfiguration übernehmen

📖 **Detaillierte Anleitung**: [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)

## 2️⃣ Web-Dashboard testen (5 Minuten)

### Lokal testen:

Das Dashboard läuft bereits! Öffnen Sie einfach die Webview.

### Demo-Daten laden:

1. Klicken Sie rechts unten auf den "Dev Tools" Button (nur sichtbar in Entwicklung)
2. Klicken Sie auf "Load Demo Data"
3. Die Daten werden zu Firebase hochgeladen
4. Dashboard zeigt nun realistische Werte

### Features testen:

- ✅ **Pflanzenkarten**: Feuchtigkeitswerte, Icons, Status
- ✅ **Sensor-Karte**: Temperatur und Luftfeuchtigkeit
- ✅ **Wassertank**: Visueller Füllstand
- ✅ **Systemtest**: Status-Icons
- ✅ **Dark/Light Mode**: Toggle-Button oben rechts
- ✅ **Einstellungen**: Zahnrad-Symbol → PIN: `1234`
- ✅ **Manuelle Bewässerung**: "Gießen"-Button auf Pflanzenkarten

## 3️⃣ Hardware beschaffen (1-2 Wochen Lieferzeit)

### Einkaufsliste:

| Komponente | Anzahl | Preis ca. | Link-Beispiel |
|------------|--------|-----------|---------------|
| ESP32-S3 Nano (Waveshare) | 1 | 15€ | [Waveshare](https://www.waveshare.com/esp32-s3-nano.htm) |
| Kapazitiver Bodenfeuchtesensor | 4 | 4€/Stk | Amazon, AliExpress |
| DHT11 Sensor | 1 | 3€ | Amazon, AliExpress |
| HC-SR04 Ultraschallsensor | 1 | 3€ | Amazon, AliExpress |
| 4-Kanal Relais-Modul (5V) | 1 | 8€ | Amazon, AliExpress |
| Mini-Wasserpumpe (12V) | 4 | 5€/Stk | Amazon, AliExpress |
| 12V Netzteil (2A min.) | 1 | 10€ | Amazon |
| Schläuche (4mm) | 5m | 5€ | Baumarkt |
| Breadboard Kabel | Set | 5€ | Amazon |
| Widerstände (10kΩ, 2kΩ, 1kΩ) | Set | 3€ | Amazon |
| E-Ink Display 1.54" (optional) | 1 | 20€ | [Waveshare](https://www.waveshare.com/1.54inch-e-paper-module-b.htm) |

**Gesamtkosten**: ca. 80-100€ (ohne E-Ink Display)

### Alternative Bezugsquellen:
- **Amazon**: Schnelle Lieferung (1-2 Tage), höhere Preise
- **AliExpress**: Günstigere Preise (10-30€ gespart), lange Lieferzeit (2-4 Wochen)
- **Reichelt/Conrad**: Lokale Händler in Deutschland

## 4️⃣ Hardware verkabeln (2-3 Stunden)

### Vorbereitung:
1. Drucken Sie [`esp32/WIRING_DIAGRAM.txt`](esp32/WIRING_DIAGRAM.txt) aus
2. Bereiten Sie einen Arbeitsplatz mit guter Beleuchtung vor
3. Testen Sie Komponenten einzeln bevor Sie alles verbinden

### Wichtige Hinweise:

⚠️ **ESP32 verträgt nur 3.3V an GPIO-Pins!**
⚠️ **HC-SR04 ECHO gibt 5V aus** → Spannungsteiler erforderlich!
⚠️ **Relais-Jumper** zwischen VCC und JD-VCC entfernen!
⚠️ **12V und 3.3V niemals direkt verbinden!**

### Verkabelungs-Schritte:

1. **Bodenfeuchtesensoren** (4×)
   - VCC → 3.3V
   - GND → GND  
   - AOUT → GPIO 36, 39, 34, 35

2. **DHT11**
   - VCC → 3.3V
   - DATA → GPIO 4 (mit 10kΩ Pull-up)
   - GND → GND

3. **Ultraschallsensor**
   - VCC → 5V
   - TRIG → GPIO 5
   - ECHO → GPIO 18 (**mit Spannungsteiler!**)
   - GND → GND

4. **Relais + Pumpen**
   - IN1-4 → GPIO 13, 12, 14, 27
   - VCC → 5V
   - GND → GND
   - JD-VCC → 12V Netzteil (+)
   - Pumpen über Relais an 12V

📖 **Detailliertes Diagramm**: [`esp32/WIRING_DIAGRAM.txt`](esp32/WIRING_DIAGRAM.txt)

## 5️⃣ ESP32-Software flashen (30 Minuten)

### MicroPython installieren:

**macOS/Linux:**
```bash
pip3 install esptool
wget https://micropython.org/resources/firmware/ESP32_GENERIC_S3-20240222-v1.22.2.bin
esptool.py --chip esp32s3 --port /dev/ttyUSB0 erase_flash
esptool.py --chip esp32s3 --port /dev/ttyUSB0 write_flash -z 0x0 ESP32_GENERIC_S3-20240222-v1.22.2.bin
```

**Windows:**
```powershell
pip install esptool
# Firmware von https://micropython.org/download/esp32/ herunterladen
esptool.py --chip esp32s3 --port COM3 erase_flash
esptool.py --chip esp32s3 --port COM3 write_flash -z 0x0 ESP32_GENERIC_S3-20240222-v1.22.2.bin
```

### Code hochladen:

**Mit Thonny IDE (Empfohlen für Anfänger):**
1. Thonny installieren: https://thonny.org/
2. Tools → Options → Interpreter → "MicroPython (ESP32)"
3. Port auswählen (COM3 oder /dev/ttyUSB0)
4. Datei `esp32/main.py` öffnen
5. **WICHTIG: Zuerst konfigurieren!** (siehe nächster Schritt)
6. File → Save as → MicroPython device → main.py

**Mit ampy (Für Fortgeschrittene):**
```bash
pip3 install adafruit-ampy
ampy --port /dev/ttyUSB0 put esp32/main.py
```

### Code konfigurieren:

Öffnen Sie `esp32/main.py` und ändern Sie:

```python
# WiFi Configuration
WIFI_SSID = "IhrWiFiName"          # ← Ihr WiFi-Name
WIFI_PASSWORD = "IhrWiFiPasswort"  # ← Ihr WiFi-Passwort

# Firebase Configuration  
FIREBASE_URL = "https://ihr-projekt-default-rtdb.europe-west1.firebasedatabase.app"
# ← Ihre Firebase Database URL aus Schritt 1
```

📖 **Detaillierte Anleitung**: [`esp32/README.md`](esp32/README.md)

## 6️⃣ System testen (1 Stunde)

### Erster Start:

1. **Serial Monitor öffnen**
   ```bash
   # Linux/macOS
   screen /dev/ttyUSB0 115200
   
   # Windows: PuTTY verwenden
   # Serial, COM3, 115200 Baud
   ```

2. **ESP32 neu starten** (RESET-Taste drücken)

3. **Erwartete Ausgabe:**
   ```
   ========================================
   ESP32 PLANT WATERING SYSTEM
   ========================================
   → Connecting to WiFi: IhrWiFiName
   ✓ WiFi connected: 192.168.1.100
   → Loading settings from Firebase
   ✓ Settings loaded: 3 plants, interval: 300s
   → Reading sensors...
   ```

### Sensoren kalibrieren:

**Bodenfeuchtesensoren:**
1. Sensor komplett trocken → Wert notieren (z.B. 4095)
2. Sensor in Wasser → Wert notieren (z.B. 1200)
3. In `esp32/main.py` anpassen:
   ```python
   dry_value = 4095  # Ihr trockener Wert
   wet_value = 1200  # Ihr nasser Wert
   ```

### Funktionstest:

- [ ] WiFi-Verbindung erfolgreich
- [ ] Firebase-Daten werden geladen
- [ ] Sensordaten erscheinen im Web-Dashboard
- [ ] Manuelle Bewässerung funktioniert
- [ ] Automatische Bewässerung bei niedrigem Feuchtigkeitswert
- [ ] Wassertank-Anzeige korrekt

## 7️⃣ Deployment (Optional, 30 Minuten)

### Auf GitHub Pages deployen:

1. **Repository erstellen**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/plant-watering.git
   git push -u origin main
   ```

2. **GitHub Actions Workflow**
   - Wird automatisch bei Push ausgeführt
   - Datei bereits vorhanden: `.github/workflows/deploy.yml`

3. **GitHub Pages aktivieren**
   - Repository Settings → Pages
   - Source: "GitHub Actions"
   - URL wird angezeigt (ca. 2-3 Minuten)

4. **Firebase Secrets in GitHub**
   - Settings → Secrets and variables → Actions
   - Alle `VITE_*` Secrets hinzufügen

📖 **Detaillierte Anleitung**: [`DEPLOYMENT.md`](DEPLOYMENT.md)

## 🆘 Hilfe & Support

### Häufige Probleme:

#### Dashboard lädt nicht
- Browser-Konsole öffnen (F12)
- Firebase-Regeln überprüfen
- Firebase-Secrets in Replit prüfen

#### ESP32 verbindet nicht mit WiFi
- Nur 2.4 GHz WiFi wird unterstützt!
- SSID und Passwort in `main.py` prüfen
- Router-Firewall überprüfen

#### Sensordaten unrealistisch
- Sensoren kalibrieren (siehe oben)
- Verkabelung überprüfen
- Spannungsversorgung prüfen (3.3V)

#### Pumpen aktivieren nicht
- Relais-Verkabelung prüfen
- 12V Netzteil angeschlossen?
- Jumper VCC↔JD-VCC entfernt?

### Weitere Dokumentation:

- [`README.md`](README.md) - Projektübersicht
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) - Firebase-Details
- [`esp32/README.md`](esp32/README.md) - ESP32-Details
- [`esp32/WIRING_DIAGRAM.txt`](esp32/WIRING_DIAGRAM.txt) - Verkabelung
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - GitHub Pages

## 🎉 Geschafft!

Ihr automatisches Bewässerungssystem ist einsatzbereit!

### Nächste Schritte:

1. **PIN ändern**: Einstellungen öffnen → Allgemein → PIN ändern
2. **Pflanzen konfigurieren**: Namen, Typen und Schwellwerte anpassen
3. **Wassertank einrichten**: Dimensionen in Einstellungen eingeben
4. **Langzeittest**: 24h laufen lassen und beobachten
5. **Optimieren**: Schwellwerte basierend auf Pflanzentypen anpassen

### Wartung:

- **Wöchentlich**: Wasserstand prüfen
- **Monatlich**: Pumpenfilter reinigen, Sensoren säubern
- **Bei Problemen**: Wöchentlichen Selbsttest ansehen

---

**Viel Erfolg mit Ihrem Smart Garden! 🌱**

Bei Fragen schauen Sie in die Dokumentation oder kontaktieren Sie den Support.
