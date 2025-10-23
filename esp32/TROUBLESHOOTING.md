# 🔧 ESP32 Troubleshooting Guide

## 🌐 NTP Synchronization Issues

### Problem: "NTP: ETTIMEOUT 116"

**Symptom**: ESP32 kann keine Verbindung zum NTP-Server herstellen.

**Das System versucht automatisch 4 verschiedene NTP-Server:**
1. `de.pool.ntp.org` (Deutschland)
2. `europe.pool.ntp.org` (Europa)
3. `pool.ntp.org` (Global)
4. `time.google.com` (Google Fallback)

**Mögliche Ursachen:**

#### 1. Router blockiert NTP (Port 123 UDP)
- **Lösung**: Router-Einstellungen prüfen
- Einige Router blockieren ausgehende NTP-Anfragen
- Suchen Sie in den Router-Einstellungen nach "NTP" oder "Port 123"
- Aktivieren Sie ausgehenden UDP-Port 123

#### 2. Firewall-Problem
- **Lösung**: Firewall-Regeln prüfen
- Stellen Sie sicher, dass UDP Port 123 (NTP) ausgehend erlaubt ist
- Bei Fritzbox: Heimnetz → Netzwerk → Netzwerkeinstellungen → Stateful Packet Inspection deaktivieren (temporär zum Testen)

#### 3. DNS-Probleme
- **Symptom**: ESP32 kann NTP-Server-Namen nicht auflösen
- **Lösung**: Verwenden Sie eine alternative DNS-Konfiguration
- Google DNS: 8.8.8.8 und 8.8.4.4
- Cloudflare DNS: 1.1.1.1 und 1.0.0.1

#### 4. Netzwerk-Timeout (langsames Netzwerk)
- **Status**: Bereits implementiert
- Das System verwendet jetzt 5 Sekunden Timeout pro Server
- Insgesamt bis zu 20 Sekunden für alle 4 Server

### Was passiert wenn NTP fehlschlägt?

✅ **Das System läuft weiter!**
- Verwendet die interne ESP32-Zeit (kann ungenau sein)
- Fehler wird auf der Website angezeigt (Firebase-Error-Log)
- Alle Funktionen bleiben verfügbar
- Timestamps können falsch sein (Datum/Zeit nicht korrekt)

### Temporäre Lösung

Wenn NTP dauerhaft fehlschlägt, können Sie:
1. **ENABLE_NTP_SYNC = False** in der Konfiguration setzen
2. Zeit manuell über Firebase setzen (geplantes Feature)
3. Router/Firewall-Konfiguration anpassen

---

## 📟 E-Ink Display Issues

### Problem: Display Timeout / Keine Reaktion

**Symptom**: Display initialisiert nicht, Timeout nach 10 Sekunden

**Das System zeigt detaillierte Schritte:**
```
==================================================
E-INK DISPLAY INITIALIZATION
==================================================
→ PIN Configuration:
  MOSI=38, CLK=48, CS=21
  DC=18, RST=14, BUSY=1

→ Step 1: Creating SPI bus...
  ✓ SPI bus created

→ Step 2: Creating Pin objects...
  ✓ Pins configured

→ Step 3: Creating EPD instance...
  ✓ EPD instance created

→ Step 4: Initializing display (timeout: 10 seconds)...
  Waiting for BUSY pin to go LOW...
  ✗ TIMEOUT! Display did not respond.
```

**Mögliche Ursachen:**

#### 1. BUSY Pin bleibt HIGH
- **Hardware-Problem**: Display sendet kein BUSY-Signal
- **Überprüfung**: Messen Sie mit Multimeter ob BUSY Pin auf LOW (0V) geht
- **Lösung**: 
  - Kabel zum BUSY Pin überprüfen
  - Display-Modul könnte defekt sein
  - Versuchen Sie ein anderes Display

#### 2. Falsche PIN-Konfiguration
- **Aktuelle Konfiguration**:
  ```python
  EINK_MOSI = 38
  EINK_CLK = 48
  EINK_CS = 21
  EINK_DC = 18
  EINK_RST = 14
  EINK_BUSY = 1
  ```
- **Überprüfung**: 
  - Vergleichen Sie mit Display-Datasheet
  - Prüfen Sie alle Verbindungen mit Multimeter
  - Keine losen Kabel oder kalte Lötstellen

#### 3. SPI-Bus-Probleme
- **MOSI/CLK nicht verbunden**: Daten kommen nicht am Display an
- **Überprüfung**:
  - MOSI (GPIO 38) zum Display DIN verbunden?
  - CLK (GPIO 48) zum Display CLK verbunden?
  - Oszilloskop: Sind Signale auf MOSI/CLK sichtbar?

#### 4. Power-Probleme
- **Display bekommt keine Spannung**
- **Überprüfung**:
  - VCC: 3.3V (NICHT 5V!)
  - GND verbunden?
  - Messen Sie mit Multimeter die Spannung am Display

#### 5. Inkompatible Display-Version
- **Waveshare hat verschiedene Revisionen**
- **Lösung**: 
  - Überprüfen Sie die genaue Display-Modellnummer
  - Version A vs. Version B haben unterschiedliche Initialisierung
  - Möglicherweise benötigen Sie eine andere Library

### Was passiert wenn E-Ink Display fehlschlägt?

✅ **Das System läuft weiter!**
- Display wird deaktiviert (`eink = None`)
- Fehler wird auf der Website angezeigt (Firebase-Error-Log)
- Alle anderen Funktionen bleiben verfügbar
- Kein Status-Icon auf dem Display (nur Website zeigt Status)

### Temporäre Lösung

Wenn Sie das Display nicht benötigen:
```python
# In main.py, Zeile 17:
ENABLE_EINK_DISPLAY = False  # Display komplett deaktivieren
```

### Hardware-Debugging-Checklist

- [ ] **Stromversorgung**: Display bekommt 3.3V (mit Multimeter messen)
- [ ] **GND verbunden**: Gemeinsame Masse ESP32 ↔ Display
- [ ] **MOSI/CLK**: Datenleitungen korrekt verbunden
- [ ] **CS/DC/RST/BUSY**: Alle Steuerleitungen verbunden
- [ ] **Keine Kurzschlüsse**: Multimeter im Durchgangsmodus
- [ ] **Kabel-Qualität**: Kurze Kabel (<20cm), keine Wackelkontakte
- [ ] **Display-Modell**: Waveshare 1.54" 3-Farben (Schwarz/Weiß/Rot)?

---

## 🌍 Fehler auf der Website sichtbar

**Alle ESP32-Hardware-Fehler werden jetzt automatisch auf der Website angezeigt!**

### Wo finden Sie die Fehler?

1. **Dashboard**: Fehler-Karten zeigen NTP/Display-Probleme
2. **Firebase Console**: `errors/` Pfad zeigt alle Fehler
3. **System Status**: `systemStatus.displayStatus` zeigt "warning" bei Problemen

### Fehler-Format in Firebase:

```json
{
  "errors": {
    "error_1729686430000": {
      "category": "ntp",
      "component": "Time Synchronization",
      "message": "All NTP servers failed (tried 4 servers)",
      "severity": "warning",
      "timestamp": 1729686430000
    },
    "error_1729686435000": {
      "category": "eink_display",
      "component": "E-Ink Display Init",
      "message": "OSError: Display timeout\nPINs: MOSI=38, CLK=48, CS=21, DC=18, RST=14, BUSY=1",
      "severity": "warning",
      "timestamp": 1729686435000
    }
  }
}
```

---

## 🚀 Empfohlene Vorgehensweise

### Bei NTP-Problemen:
1. Prüfen Sie zuerst ob der Fehler auf der Website erscheint
2. Überprüfen Sie Router-Einstellungen (NTP Port 123 erlauben)
3. System läuft trotzdem - kein kritischer Fehler
4. Zeit kann manuell korrigiert werden (geplantes Feature)

### Bei E-Ink Display-Problemen:
1. Hardware-Debugging-Checklist abarbeiten
2. Display temporär deaktivieren wenn nicht benötigt
3. System läuft trotzdem - Website zeigt alle Daten
4. Alternative: Anderes Display-Modell verwenden

### Generelle Empfehlung:
- ✅ System ist robust: Läuft auch mit Hardware-Problemen
- ✅ Alle Fehler sind auf der Website sichtbar
- ✅ Keine kritischen Abstürze
- ✅ Debugging-Informationen werden geloggt
