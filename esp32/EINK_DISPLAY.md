# E-Ink Display Setup - Waveshare 1.54" 3-Color

## Hardware-Spezifikation

**Display**: Waveshare 1.54inch e-Paper Module (B) - 3-Farben
- Auflösung: 200x200 Pixel
- Farben: Schwarz, Weiß, Rot
- Interface: SPI
- Stromverbrauch: Sehr niedrig (nur beim Update)

## Pin-Belegung (8 Pins)

### Stromversorgung
| Pin | Funktion | ESP32-S3 |
|-----|----------|----------|
| VCC | 3.3V     | 3.3V     |
| GND | Ground   | GND      |

### SPI-Datenbus (Hardware SPI2)
| Pin  | Funktion      | ESP32-S3 | GPIO |
|------|---------------|----------|------|
| DIN  | MOSI (Data)   | MOSI2    | 35   |
| CLK  | Clock         | SCK2     | 36   |

### Steuerungs-Pins (frei wählbar)
| Pin  | Funktion       | ESP32-S3 | GPIO | Beschreibung |
|------|----------------|----------|------|--------------|
| CS   | Chip Select    | GPIO37   | 37   | Low = aktiv  |
| DC   | Data/Command   | GPIO38   | 38   | Low = Command, High = Data |
| RST  | Reset          | GPIO39   | 39   | Low = Reset  |
| BUSY | Busy Signal    | GPIO40   | 40   | High = Beschäftigt |

## Verkabelung

```
Waveshare 1.54"        ESP32-S3
┌─────────────┐        ┌──────────┐
│ VCC    ●────┼───────►│ 3.3V     │
│ GND    ●────┼───────►│ GND      │
│ DIN    ●────┼───────►│ GPIO35   │
│ CLK    ●────┼───────►│ GPIO36   │
│ CS     ●────┼───────►│ GPIO37   │
│ DC     ●────┼───────►│ GPIO38   │
│ RST    ●────┼───────►│ GPIO39   │
│ BUSY   ●────┼───────►│ GPIO40   │
└─────────────┘        └──────────┘
```

## Konfiguration in main.py

Die Pins sind bereits in `esp32/main.py` konfiguriert:

```python
# E-Ink Display (SPI) - Waveshare 1.54" 3-Color (8 Pins)
EINK_MOSI = 35   # DIN (Data In)
EINK_CLK = 36    # CLK (Clock)
EINK_CS = 37     # CS (Chip Select)
EINK_DC = 38     # DC (Data/Command)
EINK_RST = 39    # RST (Reset)
EINK_BUSY = 40   # BUSY (Busy Signal)
```

## Verwendung

Das Display wird automatisch initialisiert und zeigt den System-Status an:

- **Schwarzer Kreis** = System OK ✅
- **Gelber Kreis** (Schwarz + Rot) = Warnung ⚠️
- **Roter Kreis** = Fehler ❌

### Status-Updates

Das Display wird nur aktualisiert wenn sich der Status ändert (um Energie zu sparen):

1. **OK**: Alle Sensoren funktionieren, Wassertank > 20%
2. **Warning**: 
   - Wasserstand < 20%
   - Pflanze benötigt Wasser (unter Schwellwert)
3. **Error**: Systemfehler (nicht implementiert)

## Treiber-Dateien

- `esp32/waveshare_epd.py` - Waveshare E-Ink Display-Treiber
- `esp32/main.py` - Hauptprogramm mit Display-Integration

## Display deaktivieren

Falls Sie das Display nicht anschließen möchten:

**Option 1**: Kommentieren Sie die Display-Initialisierung aus:

```python
# In main.py, Zeile ~744:
# eink = WaveshareEPD(...)  # <-- Auskommentieren
eink = None  # Display deaktiviert
```

**Option 2**: Das System erkennt automatisch wenn das Display nicht funktioniert und arbeitet weiter ohne Display.

## Technische Details

### Energieverbrauch
- **Standby**: < 0.01mA
- **Refresh**: ~26.4mA für ~5 Sekunden
- **Jährlicher Verbrauch**: ~0.1 kWh (bei 10 Updates/Tag)

### Lebensdauer
- **Refresh-Zyklen**: > 1.000.000 Full-Refreshs
- **Datenpersistenz**: Bild bleibt ohne Strom erhalten

### Update-Geschwindigkeit
- **Full Refresh**: ~5 Sekunden
- **Partial Update**: Nicht unterstützt bei 3-Farben-Display

## Fehlerbehebung

### Display zeigt nichts an
1. Prüfen Sie alle 8 Pin-Verbindungen
2. Prüfen Sie 3.3V Stromversorgung (NICHT 5V!)
3. Prüfen Sie serielle Konsole auf Fehlermeldungen

### Display bleibt auf "Busy"
1. RST-Pin prüfen (muss High sein im Normalbetrieb)
2. Hardware-Reset durchführen (ESP32 neu starten)

### Falsches Bild/Artefakte
1. Full Refresh durchführen: `eink.clear()`
2. Display-Stromversorgung prüfen (stabil 3.3V)

## Ressourcen

- [Waveshare Wiki](https://www.waveshare.com/wiki/1.54inch_e-Paper_Module_(B))
- [MicroPython SPI Dokumentation](https://docs.micropython.org/en/latest/library/machine.SPI.html)
