# 🔧 ESP32-S3 Installation & Setup

Vollständige Anleitung zur Installation von MicroPython und den benötigten Bibliotheken auf dem ESP32-S3.

---

## 📋 Voraussetzungen

- ESP32-S3 Board
- USB-Kabel (Daten + Strom)
- Computer mit Python installiert
- Alle Hardware-Komponenten (siehe `WIRING_DIAGRAM.txt`)

---

## 1️⃣ MicroPython flashen

### Schritt 1: MicroPython Firmware herunterladen

1. Gehen Sie zu: https://micropython.org/download/ESP32_GENERIC_S3/
2. Laden Sie die **neueste stabile Version** herunter (z.B. `ESP32_GENERIC_S3-20240222-v1.22.2.bin`)

### Schritt 2: esptool.py installieren

```bash
pip install esptool
```

### Schritt 3: ESP32 flashen

**Port herausfinden:**
- **Windows:** Geräte-Manager → Anschlüsse (COM & LPT) → z.B. `COM3`
- **macOS/Linux:** 
  ```bash
  ls /dev/tty.*
  # Suchen Sie nach /dev/tty.usbserial-* oder /dev/ttyUSB*
  ```

**Flash löschen:**
```bash
esptool.py --chip esp32s3 --port COM3 erase_flash
```

**MicroPython flashen:**
```bash
esptool.py --chip esp32s3 --port COM3 --baud 460800 write_flash -z 0x0 ESP32_GENERIC_S3-20240222-v1.22.2.bin
```

⚠️ Ersetzen Sie `COM3` mit Ihrem Port und passen Sie den Dateinamen an!

---

## 2️⃣ Benötigte Bibliotheken

Der ESP32-Code benötigt diese Bibliotheken:

| Bibliothek | Typ | Installation nötig? |
|------------|-----|---------------------|
| `time` | Built-in | ❌ Nein |
| `ujson` | Built-in | ❌ Nein |
| `network` | Built-in | ❌ Nein |
| `machine` | Built-in | ❌ Nein |
| **`urequests`** | **Extern** | **✅ JA!** |
| **`dht`** | **Extern** | **✅ JA!** |

### Bibliotheken installieren

#### Option A: Mit mpremote (Empfohlen)

```bash
# mpremote installieren
pip install mpremote

# urequests installieren
mpremote mip install urequests

# dht installieren (oft schon in MicroPython enthalten, aber sicher ist sicher)
mpremote mip install dht
```

#### Option B: Manuell über Thonny IDE

1. Laden Sie [Thonny IDE](https://thonny.org/) herunter
2. Öffnen Sie Thonny
3. **Tools** → **Options** → **Interpreter**
4. Wählen Sie **"MicroPython (ESP32)"**
5. Wählen Sie Ihren Port
6. **Tools** → **Manage packages**
7. Installieren Sie:
   - `micropython-urequests`
   - `micropython-dht` (falls nicht vorhanden)

---

## 3️⃣ boot.py erstellen (Optional aber empfohlen)

Die `boot.py` läuft **automatisch beim Start** des ESP32, bevor `main.py` ausgeführt wird.

### Wozu brauchen Sie boot.py?

✅ **Empfohlen für:**
- Automatische WiFi-Verbindung beim Booten
- Fehlerbehandlung und Debug-Ausgaben
- Einmalige Initialisierungen

❌ **Nicht zwingend erforderlich** - Sie können alles auch in `main.py` machen

### Erstellen Sie boot.py:

```python
# boot.py - Runs on every boot
import time
import machine
import network

print("=" * 40)
print("ESP32-S3 Plant Watering System")
print("Booting...")
print("=" * 40)

# Optional: LED Feedback (wenn vorhanden)
# led = machine.Pin(2, machine.Pin.OUT)
# led.value(1)  # LED ON während Boot

# WiFi Configuration
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"

def connect_wifi():
    """Connect to WiFi"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print(f"Connecting to WiFi: {WIFI_SSID}")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        
        # Wait for connection (max 20 seconds)
        timeout = 20
        while not wlan.isconnected() and timeout > 0:
            print(".", end="")
            time.sleep(1)
            timeout -= 1
        print()
    
    if wlan.isconnected():
        print(f"✓ WiFi connected")
        print(f"  IP Address: {wlan.ifconfig()[0]}")
        return True
    else:
        print("✗ WiFi connection failed")
        return False

# Connect to WiFi
connect_wifi()

print("Boot complete. Starting main.py...")
print("=" * 40)
```

**Vorteile von boot.py:**
- WiFi ist bereits verbunden, wenn `main.py` startet
- Schnellere Startzeit für Ihr Hauptprogramm
- Klare Trennung von Boot-Logik und Hauptlogik

---

## 4️⃣ Dateien auf ESP32 hochladen

### Mit mpremote (Command Line)

```bash
# boot.py hochladen
mpremote fs cp boot.py :boot.py

# main.py hochladen
mpremote fs cp main.py :main.py

# Dateien auf ESP32 auflisten
mpremote fs ls

# ESP32 neu starten
mpremote reset
```

### Mit Thonny IDE (GUI)

1. Öffnen Sie `boot.py` in Thonny
2. **File** → **Save as...**
3. Wählen Sie **"MicroPython device"**
4. Speichern Sie als `boot.py`
5. Wiederholen Sie für `main.py`

### Mit ampy

```bash
# ampy installieren
pip install adafruit-ampy

# Dateien hochladen
ampy --port COM3 put boot.py
ampy --port COM3 put main.py
```

---

## 5️⃣ Konfiguration anpassen

### In boot.py (falls verwendet):

Ändern Sie:
```python
WIFI_SSID = "IhrWiFiName"
WIFI_PASSWORD = "IhrWiFiPasswort"
```

### In main.py:

Ändern Sie:
```python
# WiFi Configuration (wenn nicht in boot.py gesetzt)
WIFI_SSID = "IhrWiFiName"
WIFI_PASSWORD = "IhrWiFiPasswort"

# Firebase Configuration
FIREBASE_URL = "https://beetwaesserung-default-rtdb.europe-west1.firebasedatabase.app"
```

---

## 6️⃣ ESP32 testen

### Option A: Mit mpremote

```bash
# REPL öffnen (interaktive Python-Shell)
mpremote

# Dann in der REPL:
>>> import main
```

### Option B: Mit Thonny

1. Öffnen Sie `main.py` in Thonny
2. Klicken Sie auf den grünen **"Run"** Button
3. Beobachten Sie die Ausgabe im Shell-Fenster

### Option C: Serial Monitor

```bash
# Mit screen (macOS/Linux)
screen /dev/tty.usbserial-0001 115200

# Mit PuTTY (Windows)
# Öffnen Sie PuTTY, wählen Sie Serial, Port: COM3, Speed: 115200
```

---

## 7️⃣ Automatischer Start

Nach dem Hochladen startet der ESP32 automatisch:

1. ESP32 mit Strom versorgen
2. `boot.py` läuft → Verbindet WiFi
3. `main.py` läuft → Startet Bewässerungssystem
4. System läuft dauerhaft!

**Neustart:**
- Drücken Sie den **Reset-Button** am ESP32
- Oder: Strom aus/ein

---

## 🔍 Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'urequests'"

**Lösung:**
```bash
mpremote mip install urequests
```

### Problem: WiFi verbindet nicht

**Lösung:**
1. Überprüfen Sie SSID und Passwort
2. Stellen Sie sicher, dass WiFi 2.4 GHz ist (5 GHz wird nicht unterstützt!)
3. Überprüfen Sie WiFi-Signal-Stärke

### Problem: "OSError: [Errno 110] ETIMEDOUT" bei Firebase

**Lösung:**
1. Überprüfen Sie `FIREBASE_URL` (muss korrekt sein!)
2. Überprüfen Sie Internet-Verbindung
3. Überprüfen Sie Firebase Realtime Database Regeln (müssen Read/Write erlauben)

### Problem: ESP32 startet nicht automatisch

**Lösung:**
- Stellen Sie sicher, dass `main.py` heißt (nicht `test.py` oder anders)
- MicroPython führt automatisch `boot.py` und dann `main.py` aus

---

## 📁 Finale Dateistruktur auf ESP32

Nach der Installation sollten diese Dateien auf dem ESP32 sein:

```
/ (root)
├── boot.py          (optional, aber empfohlen)
├── main.py          (erforderlich)
└── lib/             (automatisch erstellt von mip)
    ├── urequests.py
    └── dht.py       (falls nicht built-in)
```

---

## ✅ Checkliste

- [ ] MicroPython auf ESP32-S3 geflasht
- [ ] `urequests` Bibliothek installiert
- [ ] `dht` Bibliothek installiert (oder überprüft)
- [ ] `boot.py` erstellt und hochgeladen (optional)
- [ ] `main.py` hochgeladen
- [ ] WiFi-Credentials in Code eingetragen
- [ ] Firebase URL in Code eingetragen
- [ ] Hardware verkabelt (siehe `WIRING_DIAGRAM.txt`)
- [ ] ESP32 gestartet und getestet
- [ ] Daten erscheinen in Firebase

---

## 🔗 Nützliche Links

- [MicroPython Dokumentation](https://docs.micropython.org/)
- [ESP32-S3 Pinout](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/hw-reference/esp32s3/user-guide-devkitc-1.html)
- [urequests Dokumentation](https://github.com/micropython/micropython-lib/tree/master/python-ecosys/urequests)
- [Thonny IDE](https://thonny.org/)
- [mpremote Dokumentation](https://docs.micropython.org/en/latest/reference/mpremote.html)

---

**Viel Erfolg mit Ihrem ESP32 Setup! 🌱💧**
