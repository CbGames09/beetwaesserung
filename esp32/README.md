# ESP32-S3 Setup und Installation

## Überblick

Dieses MicroPython-Programm steuert ein automatisches Bewässerungssystem mit dem ESP32-S3 Nano von Waveshare.

## Hardware-Anforderungen

- **Microcontroller**: Waveshare ESP32-S3 Nano
- **Sensoren**:
  - 3-4 kapazitative Bodenfeuchtesensoren
  - DHT11 Temperatur- und Luftfeuchtigkeitssensor
  - HC-SR04 Ultraschallsensor (Wasserstandsmessung)
- **Aktoren**:
  - 4-Kanal Relais-Modul
  - 4 Wasserpumpen (12V empfohlen)
- **Display**:
  - Waveshare 1.54" E-Ink Display (200x200, 3-Farben)
- **Stromversorgung**:
  - 5V USB-C für ESP32
  - 12V Netzteil für Pumpen/Relais

## Verkabelung

### Bodenfeuchtesensoren (Analog)

| Sensor | ESP32 Pin | Beschreibung |
|--------|-----------|--------------|
| Sensor 1 | GPIO 36 | ADC1_CH0 |
| Sensor 2 | GPIO 39 | ADC1_CH3 |
| Sensor 3 | GPIO 34 | ADC1_CH6 |
| Sensor 4 | GPIO 35 | ADC1_CH7 |

**Anschluss pro Sensor:**
- VCC → 3.3V
- GND → GND
- AOUT → GPIO Pin (siehe Tabelle)

### DHT11 Sensor

| DHT11 Pin | ESP32 Pin |
|-----------|-----------|
| VCC | 3.3V |
| DATA | GPIO 4 |
| GND | GND |

**Hinweis**: Verwenden Sie einen 10kΩ Pull-up-Widerstand zwischen DATA und VCC.

### Ultraschallsensor (HC-SR04)

| HC-SR04 Pin | ESP32 Pin |
|-------------|-----------|
| VCC | 5V |
| TRIG | GPIO 5 |
| ECHO | GPIO 18 |
| GND | GND |

**Wichtig**: ECHO-Pin liefert 5V Signal. Verwenden Sie einen Spannungsteiler (2kΩ und 1kΩ) für ESP32!

### 4-Kanal Relais-Modul

| Relais | ESP32 Pin | Pumpe |
|--------|-----------|-------|
| IN1 | GPIO 13 | Pumpe 1 |
| IN2 | GPIO 12 | Pumpe 2 |
| IN3 | GPIO 14 | Pumpe 3 |
| IN4 | GPIO 27 | Pumpe 4 |
| VCC | 5V | - |
| GND | GND | - |

**Relais-Anschluss:**
- JD-VCC → 12V Netzteil (+)
- COM → 12V Netzteil (+)
- NO (Normally Open) → Pumpe (+)
- Pumpe (-) → 12V Netzteil (-)

### E-Ink Display (SPI)

| Display Pin | ESP32 Pin |
|-------------|-----------|
| VCC | 3.3V |
| GND | GND |
| DIN (MOSI) | GPIO 23 |
| CLK (SCK) | GPIO 18 |
| CS | GPIO 15 |
| DC | GPIO 2 |
| RST | GPIO 0 |
| BUSY | GPIO 16 |

## Software-Installation

### 1. MicroPython flashen

#### macOS/Linux:
```bash
# esptool installieren
pip3 install esptool

# Firmware herunterladen (ESP32-S3)
wget https://micropython.org/resources/firmware/ESP32_GENERIC_S3-20240222-v1.22.2.bin

# Flash löschen
esptool.py --chip esp32s3 --port /dev/ttyUSB0 erase_flash

# MicroPython flashen
esptool.py --chip esp32s3 --port /dev/ttyUSB0 write_flash -z 0x0 ESP32_GENERIC_S3-20240222-v1.22.2.bin
```

#### Windows:
```powershell
# esptool installieren
pip install esptool

# Firmware herunterladen von: https://micropython.org/download/esp32/

# Flash löschen
esptool.py --chip esp32s3 --port COM3 erase_flash

# MicroPython flashen
esptool.py --chip esp32s3 --port COM3 write_flash -z 0x0 ESP32_GENERIC_S3-20240222-v1.22.2.bin
```

### 2. Code auf ESP32 hochladen

#### Methode 1: ampy (empfohlen)

```bash
# ampy installieren
pip3 install adafruit-ampy

# main.py hochladen
ampy --port /dev/ttyUSB0 put main.py
```

#### Methode 2: Thonny IDE (für Anfänger)

1. Thonny IDE herunterladen: https://thonny.org/
2. In Thonny: Tools → Options → Interpreter
3. Interpreter auswählen: "MicroPython (ESP32)"
4. Port auswählen
5. Datei öffnen: `main.py`
6. Speichern auf ESP32: File → Save as → MicroPython device → main.py

### 3. Konfiguration anpassen

Öffnen Sie `main.py` und passen Sie folgende Werte an:

```python
# WiFi Configuration
WIFI_SSID = "IhrWiFiName"
WIFI_PASSWORD = "IhrWiFiPasswort"

# Firebase Configuration
FIREBASE_URL = "https://ihr-projekt-default-rtdb.europe-west1.firebasedatabase.app"

# Optional: Pin-Nummern anpassen falls nötig
```

### 4. Sensor-Kalibrierung

Die Bodenfeuchtesensoren müssen kalibriert werden:

1. Sensor komplett trocken: Lesen Sie den Wert ab (z.B. 4095)
2. Sensor in Wasser: Lesen Sie den Wert ab (z.B. 1200)
3. Passen Sie in `main.py` an:

```python
def read_moisture(self, sensor_id):
    # ... existing code ...
    dry_value = 4095  # Ihr Wert bei trockenem Sensor
    wet_value = 1200  # Ihr Wert bei nassem Sensor
    # ...
```

## Betrieb

### Erstes Starten

1. ESP32 mit USB-C verbinden
2. Öffnen Sie einen Serial Monitor (z.B. in Thonny oder screen):
   ```bash
   screen /dev/ttyUSB0 115200
   ```
3. Drücken Sie die RESET-Taste am ESP32
4. Sie sollten die Ausgaben sehen:
   ```
   ========================================
   ESP32 PLANT WATERING SYSTEM
   ========================================
   → Connecting to WiFi: IhrWiFiName
   ✓ WiFi connected: 192.168.1.100
   → Loading settings from Firebase
   ✓ Settings loaded: 3 plants, interval: 300s
   ```

### Logs überwachen

```bash
# Linux/macOS
screen /dev/ttyUSB0 115200

# Windows mit PuTTY
# Serial, COM3, 115200 Baud

# Beenden: Ctrl+A, dann K (screen)
```

### Troubleshooting

#### WiFi verbindet nicht
- Überprüfen Sie SSID und Passwort
- ESP32 unterstützt nur 2.4 GHz WiFi (nicht 5 GHz!)
- Reduzieren Sie die Entfernung zum Router

#### Firebase-Fehler "Permission denied"
- Siehe FIREBASE_SETUP.md
- Sicherheitsregeln müssen auf `.read: true` und `.write: true` gesetzt sein

#### Sensor-Werte unrealistisch
- Überprüfen Sie die Verkabelung
- Kalibrieren Sie die Sensoren neu
- Bei Bodenfeuchtesensoren: Warten Sie 1-2 Minuten nach dem Einstecken

#### Pumpen aktivieren nicht
- Überprüfen Sie die Relais-Verkabelung
- Messen Sie die Spannung am Relais (sollte 0V sein bei Aktivierung für active-LOW)
- Prüfen Sie die 12V-Stromversorgung
- Jumper zwischen VCC und JD-VCC entfernen und extern mit 12V versorgen

#### E-Ink Display zeigt nichts
- Display-Code ist derzeit ein Stub (TODO)
- Waveshare E-Ink Bibliothek muss noch integriert werden
- Status wird vorerst nur im Serial Monitor angezeigt

## Features

✅ Automatische Bewässerung basierend auf Feuchtigkeitsschwellwerten
✅ Echtzeit-Datenübertragung an Firebase
✅ Manuelle Bewässerung über Website
✅ Wöchentlicher Systemtest
✅ Täglicher Pump-4-Betrieb bei 3-Pflanzen-Konfiguration
✅ WiFi-Verbindungsüberwachung
⏳ E-Ink Display-Ansteuerung (TODO)

## Energieverwaltung

Für Batteriebetrieb (optional):

```python
# Deep Sleep aktivieren (am Ende der Hauptschleife)
import esp32
esp32.wake_on_ext0(pin=Pin(0), level=esp32.WAKEUP_ALL_LOW)
machine.deepsleep(interval * 1000)  # milliseconds
```

**Hinweis**: Deep Sleep deaktiviert WiFi zwischen Messungen. Geeignet nur für sehr lange Intervalle (>1 Stunde).

## Wartung

- **Wöchentlich**: Überprüfen Sie den Wasserstand im Tank
- **Monatlich**: Reinigen Sie die Pumpenfilter
- **Monatlich**: Reinigen Sie die Bodenfeuchtesensoren (destilliertes Wasser)
- **Vierteljährlich**: Überprüfen Sie alle Kabelverbindungen
- **Jährlich**: Ersetzen Sie Verschleißteile (Pumpenschläuche)

## Sicherheitshinweise

⚠️ **WICHTIG**:
- Verwenden Sie 12V DC für Pumpen (keine 230V AC!)
- Halten Sie Elektronik von Wasser fern
- Verwenden Sie wasserdichte Gehäuse für Outdoor-Einsatz
- Trennen Sie die Stromversorgung vor Wartungsarbeiten
- Pumpen nicht trocken laufen lassen (min. 5cm Wasserstand)
- Überprüfen Sie regelmäßig auf Wasserlecks

## Lizenz

Dieses Projekt ist Open Source. Verwenden Sie es frei für private und kommerzielle Zwecke.
