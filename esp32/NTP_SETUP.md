# 🕐 NTP Zeitsynchronisierung für ESP32-S3

## Übersicht

Der ESP32 hat keine eingebaute Echtzeituhr (RTC) mit Batterie. Das bedeutet:
- ❌ Bei jedem Neustart startet die Zeit bei 0
- ❌ Ohne Internet ist die Zeit falsch
- ✅ **Mit NTP wird die Zeit automatisch über WLAN synchronisiert**

## Was wurde implementiert

Der ESP32-Code synchronisiert automatisch die Zeit über **NTP (Network Time Protocol)** beim Start:

```python
import ntptime
from machine import RTC

def sync_time(self):
    """Synchronize time with NTP server"""
    ntptime.settime()  # Holt Zeit vom NTP-Server
    # Wendet Timezone-Offset an (UTC+1 für Deutschland)
    # Speichert Zeit in der internen RTC
```

## Konfiguration

### ✅ Automatische Sommerzeit/Winterzeit-Erkennung

**Keine manuelle Konfiguration nötig!** Der ESP32 erkennt automatisch:

- **MEZ (Winterzeit)**: UTC+1 (Oktober - März)
- **MESZ (Sommerzeit)**: UTC+2 (März - Oktober)

Die Umstellung erfolgt nach EU-Regeln:
- **Sommerzeit beginnt**: Letzter Sonntag im März, 02:00 Uhr
- **Winterzeit beginnt**: Letzter Sonntag im Oktober, 03:00 Uhr

```python
# In esp32/main.py:
def get_timezone_offset(self):
    """Automatische Erkennung von MEZ oder MESZ"""
    # Berechnet automatisch ob Sommer- oder Winterzeit!
    if self.is_dst(year, month, day, hour):
        return 2  # MESZ (Sommerzeit)
    else:
        return 1  # MEZ (Winterzeit)
```

### NTP-Server ändern

Sie können auch einen anderen NTP-Server verwenden:

```python
# Schneller für Deutschland:
NTP_HOST = "de.pool.ntp.org"

# PTB (Physikalisch-Technische Bundesanstalt):
NTP_HOST = "ptbtime1.ptb.de"
```

## Wie es funktioniert

### 1. Nach WiFi-Verbindung

```
→ Connecting to WiFi: MeinWLAN
✓ WiFi connected: 192.168.1.100
→ Synchronizing time with NTP server...
✓ Time synchronized: 2025-10-19 14:30:45 MEZ (Winterzeit)
  Unix Timestamp: 1729349445000 ms
```

**Im Sommer:**
```
✓ Time synchronized: 2025-07-15 14:30:45 MESZ (Sommerzeit)
```

### 2. Verwendung in Timestamps

Alle Timestamps verwenden jetzt die korrekte Zeit:

```python
# Sensor-Daten
"timestamp": self.get_timestamp()  # Millisekunden mit Timezone
# → 1729349445000 (korrekte Zeit!)

# Statt vorher:
"timestamp": int(time.time() * 1000)
# → 123000 (Zeit seit ESP32-Start)
```

### 3. Automatische Updates

- ✅ Sensor-Daten (`sensorData`)
- ✅ System-Status (`systemStatus.lastUpdate`)
- ✅ Test-Ergebnisse (`lastTest.timestamp`)
- ✅ Zeitberechnungen (Pump 4 Daily Run, Weekly Test)

## Vorteile

### Vorher (ohne NTP)
```
ESP32 Neustart um 14:00 Uhr
timestamp: 0       → Website zeigt: 1970-01-01 01:00:00
timestamp: 300000  → Website zeigt: 1970-01-01 01:05:00
```

### Nachher (mit NTP)
```
ESP32 Neustart um 14:00 Uhr
→ NTP sync
timestamp: 1729349400000 → Website zeigt: 2025-10-19 14:30:00 ✓
timestamp: 1729349700000 → Website zeigt: 2025-10-19 14:35:00 ✓
```

## Fehlerbehebung

### NTP-Synchronisierung schlägt fehl

```
✗ Time sync failed: ETIMEDOUT
  Using system time (may be incorrect)
```

**Lösungen:**
1. **WiFi-Verbindung prüfen**: NTP benötigt Internet
2. **NTP-Server ändern**: `NTP_HOST = "de.pool.ntp.org"`
3. **Firewall prüfen**: Port 123 (UDP) muss offen sein
4. **Später erneut versuchen**: NTP wird bei jedem WiFi-Connect versucht

### Zeit ist 1 Stunde falsch

**Problem**: Automatische Zeitzone-Erkennung funktioniert nicht korrekt

**Lösung**: 
1. **Prüfen Sie die Ausgabe beim Start**: Steht dort "MEZ" oder "MESZ"?
2. **Datum prüfen**: Ist das aktuelle Datum korrekt? (NTP-Sync erfolgreich?)
3. **Manuelle Prüfung**: 
   - Januar - Februar: Sollte MEZ (UTC+1) sein
   - Juni - August: Sollte MESZ (UTC+2) sein

### Timestamps sind immer noch falsch

**Prüfen Sie die Ausgabe beim Start:**

```python
# Sollte beim Start erscheinen:
✓ Time synchronized: 2025-10-19 14:30:45
  Unix Timestamp: 1729349445000 ms
```

Wenn diese Zeile **NICHT** erscheint:
- NTP-Sync hat nicht funktioniert
- ESP32 verwendet System-Zeit (startet bei 0)

## Technische Details

### NTP-Funktionsweise

1. ESP32 sendet UDP-Anfrage an NTP-Server (Port 123)
2. NTP-Server antwortet mit aktueller UTC-Zeit
3. ESP32 speichert Zeit in interner RTC
4. `time.time()` gibt jetzt korrekte Unix-Timestamps zurück

### Timezone-Offset

```python
# UTC Zeit vom NTP-Server
utc_time = time.time()  # z.B. 1729345800 (14:30 UTC)

# Deutscher Offset (UTC+1)
offset_seconds = 1 * 3600  # 3600 Sekunden = 1 Stunde
local_time = utc_time + offset_seconds  # 1729349400 (15:30 MEZ)

# In Millisekunden für Firebase
timestamp_ms = int(local_time * 1000)  # 1729349400000
```

### Genauigkeit

- **NTP-Genauigkeit**: ±50ms über Internet
- **RTC-Drift**: ~1 Sekunde pro Tag
- **Empfehlung**: Sync alle 24h (wird bei jedem Neustart gemacht)

## Zusammenfassung

✅ **Automatische Zeit-Synchronisierung** über NTP beim WiFi-Connect  
✅ **Korrekte Timestamps** in Firebase (mit Datum & Uhrzeit)  
✅ **Automatische Sommer-/Winterzeit-Erkennung** für Deutschland (MEZ/MESZ)  
✅ **Fehlerbehandlung** wenn NTP nicht erreichbar ist  
✅ **Alle Zeitberechnungen** verwenden korrekte Zeit  

**Keine manuelle Konfiguration nötig** - funktioniert automatisch! 🎉

### 🌍 Für andere Länder

Wenn Sie in einem anderen Land sind, müssen Sie die Sommerzeit-Regeln in der `is_dst()` Funktion anpassen. Die aktuelle Implementierung folgt den **EU-Regeln** (Deutschland, Österreich, Schweiz, etc.).
