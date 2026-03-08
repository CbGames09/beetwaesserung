# ESP32-S3 Plant Watering System - Energieeffizienz Analyse

## Stromverbrauch nach Betriebsmodus

### 1. Deep Sleep Mode (Standby)
- **Stromverbrauch**: ~10-20 µA
- **Zustand**: Das System ist zwischen den Messintervallen inaktiv
- **Problem aktuell**: ⚠️ Das Programm nutzt `time.sleep()` statt Deep Sleep
  - `time.sleep()` verbraucht ~80-100 mA ständig
  - Der Unterschied: Deep Sleep: 10µA vs. Sleep: 80-100 mA = **8000x Unterschied!**

### 2. Sensor-Messungsphase (~3-5 Sekunden)
- **Moisture Sensors (ADC)**: ~5 mA (4x parallel)
- **DHT11 (1-wire)**: ~2 mA
- **Ultrasonic**: ~15 mA (kurz, nur Messung)
- **Motion Sensor (PIR)**: ~10 µA (passiv)
- **LED Ring**: 0 mA (wenn aus)
- **Gesamt**: ~25 mA für ~5 Sekunden = 0.035 mAh pro Messung

### 3. WiFi-Verbindung
- **WiFi aktiv**: ~100-150 mA (Senden/Empfangen)
- **WiFi idle**: ~50 mA
- **Durchschnitt**: 120 mA für ~2-3 Sekunden pro Upload
- **Pro Messintervall**: 120 mA × 2.5 s ÷ 3600 s = 0.083 mAh

### 4. Mit LED Ring (wenn aktiv)
- **WS2812B pro LED**: ~20 mA bei voller Weiß
- **24 LEDs @ 50% Helligkeit**: ~240 mA
- **Dauerbetrieb würde Batterie schnell leeren**
- **Empfehlung**: Nur bei Bedarf aktivieren (Motion-Sensor Trigger)

---

## Aktuelle Energiebilanz (bei 5-Minuten-Intervall)

### Pro Messintervall (300 Sekunden):
- Sensoren: 0.035 mAh (3 Sekunden @ 25 mA)
- WiFi Upload: 0.083 mAh (2.5 Sekunden @ 120 mA)
- Sleep/Idle: **24 mAh** (295 Sekunden @ 80 mA) ← **HAUPTPROBLEM**

**Gesamt pro 5 Min**: ~24.1 mAh

### Täglicher Verbrauch (24h = 288 Zyklen):
- **Mit Sleep()**: 24.1 × 288 = **6,949 mAh/Tag** (~ 7 Ah)
- **Mit Deep Sleep**: 0.02 mAh × 288 = **0.006 mAh/Day** (praktisch vernachlässigbar)

---

## Mit DeepSleep optimiert:
- **Pro Messintervall**: 0.035 + 0.083 + 0.00009 = **0.12 mAh**
- **Pro Tag**: 0.12 × 288 = **35 mAh/Tag**
- **Mit 2000 mAh Batterie**: **57 Tage Laufzeit** 🔋

---

## Optimierungsempfehlungen (Priorität)

### 🔴 KRITISCH (Sofort implementieren):
1. **Deep Sleep statt time.sleep()**
   - Änderung: `machine.deepsleep()` statt `time.sleep()`
   - Einsparung: **~57x weniger Stromverbrauch**
   - Implementation: RTC-Wecktimer setzen

### 🟡 WICHTIG:
2. **LED Ring intelligent nutzen**
   - Nur bei Motion-Sensor aktivieren
   - Auto-Timeout nach 5 Sekunden
   - Einsparung: ~240 mA wenn nicht aktiv

3. **WiFi-Verbindung optimieren**
   - WiFi nur bei Uploads aktivieren (derzeit möglicherweise immer an)
   - Power-Saving-Mode nutzen
   - Einsparung: ~50 mA kontinuierlich

### 🟢 OPTIONAL:
4. **Sensor-Lesefrequenz reduzieren**
   - Messung alle 10 Minuten statt 5
   - Einsparung: 50% weniger Zyklen

---

## Batterie-Szenarien

### 2000 mAh Batterie:
| Modus | Laufzeit |
|-------|----------|
| Aktuell (Sleep) | 10 Tage |
| Optimiert (DeepSleep) | 57 Tage |
| Mit LED + WiFi Opt. | 70+ Tage |

### 5000 mAh Batterie:
| Modus | Laufzeit |
|-------|----------|
| Aktuell | 25 Tage |
| Optimiert | 140 Tage |
| Mit LED + WiFi Opt. | 175+ Tage |

---

## Hardware-spezifische Tipps für ESP32-S3:

1. **GPIO Pull-Downs für ungenutzte Pins** → 10-100 µA Einsparung
2. **ADC Calibration deaktivieren** wenn nicht gebraucht → 1 mA
3. **Brown-out Detector (BoD) bei Low-Battery** → Verhindert Datenverlust
4. **RTC Memory für Daten** → Schneller als Firebase bei Offline-Modus

---

## Heutige Hinzufügungen:
- **Motion Sensor (PIR)**: ~10 µA passiv (vernachlässigbar)
- **LED Ring (WS2812B)**: ~0 mA wenn aus, ~240 mA wenn aktiv @ 50%

**Fazit**: Die neuen Komponenten erhöhen den Idle-Verbrauch nicht signifikant!
