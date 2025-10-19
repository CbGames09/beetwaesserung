# ESP32 E-Mail-Benachrichtigungen Einrichtung (MicroPython)

## Überblick

Das ESP32-Bewässerungssystem kann E-Mail-Benachrichtigungen für kritische Ereignisse senden:
- **Niedriger Wasserstand** - Wenn der Wasserstand unter den konfigurierten Schwellwert fällt
- **Sensorausfälle** - Wenn Sensoren fehlerhafte oder keine Werte liefern  
- **Testfehler** - Wenn der wöchentliche Systemtest Probleme erkennt

## Voraussetzungen

### Hardware
- ESP32-S3 mit MicroPython firmware
- WiFi-Verbindung konfiguriert
- Alle Sensoren und Komponenten installiert

### MicroPython Module
Die benötigten Module (`urequests`, `network`) sind standardmäßig in MicroPython enthalten.

## Benachrichtigungen über Web-Interface konfigurieren

### Schritt 1: Dashboard öffnen
1. Öffnen Sie das Dashboard im Browser
2. Klicken Sie auf **Einstellungen** (Zahnrad-Symbol)
3. Geben Sie Ihren PIN ein (Standard: 1234)

### Schritt 2: Benachrichtigungen aktivieren
1. Wechseln Sie zum Tab **Benachrichtigungen**
2. Aktivieren Sie **Benachrichtigungen aktivieren**
3. Geben Sie Ihre **E-Mail-Adresse** ein (die Benachrichtigungen empfängt)
4. Konfigurieren Sie Schwellwerte:
   - **Niedriger Wasserstand**: 5-30% (Standard: 10%)
   - **Testfehler melden**: An/Aus
   - **Sensorfehler melden**: An/Aus
5. Klicken Sie auf **Speichern**

Die Einstellungen werden in Firebase gespeichert und der ESP32 lädt sie automatisch.

## SMTP-Dienst einrichten

Da MicroPython keine vollständige SMTP-Bibliothek hat, verwenden wir einen **E-Mail-API-Dienst** anstelle von direktem SMTP.

### Option 1: EmailJS (Empfohlen - Kostenlos)

**EmailJS** bietet einen kostenlosen API-Service für bis zu 200 E-Mails/Monat.

#### Einrichtung:

1. **Konto erstellen**: https://www.emailjs.com/
2. **E-Mail-Service verbinden**:
   - Gehen Sie zu **Email Services**
   - Klicken Sie auf **Add New Service**
   - Wählen Sie Ihren E-Mail-Provider (Gmail, Outlook, etc.)
   - Folgen Sie den Anweisungen zur Authentifizierung
3. **E-Mail-Template erstellen**:
   - Gehen Sie zu **Email Templates**
   - Klicken Sie auf **Create New Template**
   - Template Name: `esp32_alert`
   - Inhalt:
     ```
     Subject: {{subject}}
     
     {{message_html}}
     ```
4. **API-Keys notieren**:
   - **Service ID**: z.B. `service_abc123`
   - **Template ID**: z.B. `template_xyz789`
   - **Public Key**: Findet sich unter **Account → API Keys**

#### ESP32 Code-Anpassung:

Fügen Sie diese Konstanten in `main.py` hinzu:

```python
# EmailJS Configuration
EMAILJS_SERVICE_ID = "service_abc123"
EMAILJS_TEMPLATE_ID = "template_xyz789"
EMAILJS_PUBLIC_KEY = "your_public_key"
EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send"
```

### Option 2: SendGrid (Kostenlos bis 100 E-Mails/Tag)

1. Erstellen Sie ein Konto: https://sendgrid.com/
2. Erstellen Sie einen API Key
3. Notieren Sie den API Key

```python
# SendGrid Configuration  
SENDGRID_API_KEY = "SG.xxxxxxxxxxxxxxxxxxxxxx"
SENDGRID_FROM_EMAIL = "esp32@yourdomain.com"
```

### Option 3: Mailgun (Kostenlos bis 100 E-Mails/Tag)

1. Erstellen Sie ein Konto: https://www.mailgun.com/
2. Verifizieren Sie Ihre Domain oder verwenden Sie Sandbox
3. Notieren Sie API Key und Domain

```python
# Mailgun Configuration
MAILGUN_API_KEY = "key-xxxxxxxxxxxxxxxxxxxxxx"
MAILGUN_DOMAIN = "sandboxXXX.mailgun.org"
```

## ESP32 Code-Implementierung

Fügen Sie diese Klasse zu `main.py` hinzu:

```python
class EmailNotifier:
    def __init__(self, firebase_url):
        self.firebase_url = firebase_url
        self.enabled = False
        self.recipient_email = None
        self.low_water_threshold = 10
        self.notify_on_test_failure = True
        self.notify_on_sensor_error = True
        self.last_notification = {}
        
        # EmailJS Configuration
        self.service_id = EMAILJS_SERVICE_ID
        self.template_id = EMAILJS_TEMPLATE_ID
        self.public_key = EMAILJS_PUBLIC_KEY
        
    def load_settings(self):
        """Load notification settings from Firebase"""
        try:
            url = f"{self.firebase_url}/settings/notifications.json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                settings = response.json()
                if settings:
                    self.enabled = settings.get('enabled', False)
                    self.recipient_email = settings.get('email')
                    self.low_water_threshold = settings.get('lowWaterThreshold', 10)
                    self.notify_on_test_failure = settings.get('notifyOnTestFailure', True)
                    self.notify_on_sensor_error = settings.get('notifyOnSensorError', True)
                    print(f"✓ Notification settings loaded (enabled: {self.enabled})")
            
            response.close()
        except Exception as e:
            print(f"✗ Error loading notification settings: {e}")
    
    def should_notify(self, event_type):
        """Rate limiting: max 1 notification per hour for each event type"""
        current_time = time.time()
        last_sent = self.last_notification.get(event_type, 0)
        
        # Allow notification if more than 1 hour has passed
        if current_time - last_sent > 3600:
            self.last_notification[event_type] = current_time
            return True
        return False
    
    def send_email_emailjs(self, subject, body_html):
        """Send email via EmailJS API"""
        if not self.enabled or not self.recipient_email:
            return False
        
        try:
            # EmailJS API payload
            payload = {
                "service_id": self.service_id,
                "template_id": self.template_id,
                "user_id": self.public_key,
                "template_params": {
                    "to_email": self.recipient_email,
                    "subject": subject,
                    "message_html": body_html
                }
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(
                EMAILJS_API_URL,
                json=payload,
                headers=headers,
                timeout=15
            )
            
            success = response.status_code == 200
            print(f"{'✓' if success else '✗'} Email sent: {subject} (status: {response.status_code})")
            response.close()
            return success
            
        except Exception as e:
            print(f"✗ Error sending email: {e}")
            return False
    
    def notify_low_water(self, water_level):
        """Send notification for low water level"""
        if not self.enabled:
            return
        
        if water_level < self.low_water_threshold and self.should_notify('low_water'):
            subject = "⚠️ Niedriger Wasserstand"
            body = f"""
            <h2 style="color: #f59e0b;">Wasserstand kritisch niedrig!</h2>
            <p>Aktueller Wasserstand: <strong>{water_level:.1f}%</strong></p>
            <p>Schwellwert: {self.low_water_threshold}%</p>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Bitte Wassertank auffüllen.</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">
                Zeitstempel: {time.localtime()}<br>
                ESP32 Pflanzenbewässerungssystem
            </p>
            """
            self.send_email_emailjs(subject, body)
    
    def notify_sensor_error(self, sensor_name, error_msg):
        """Send notification for sensor errors"""
        if not self.enabled or not self.notify_on_sensor_error:
            return
        
        if self.should_notify(f'sensor_{sensor_name}'):
            subject = f"⚠️ Sensorfehler: {sensor_name}"
            body = f"""
            <h2 style="color: #f59e0b;">Sensorproblem erkannt</h2>
            <p>Sensor: <strong>{sensor_name}</strong></p>
            <p>Fehler: {error_msg}</p>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Bitte Sensor überprüfen.</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">
                Zeitstempel: {time.localtime()}<br>
                ESP32 Pflanzenbewässerungssystem
            </p>
            """
            self.send_email_emailjs(subject, body)
    
    def notify_test_failure(self, test_results):
        """Send notification for failed system test"""
        if not self.enabled or not self.notify_on_test_failure:
            return
        
        if test_results['overallStatus'] != 'passed' and self.should_notify('test_failure'):
            subject = "⚠️ Systemtest fehlgeschlagen"
            
            # Build failed tests list
            failed_tests = []
            for i, passed in enumerate(test_results['sensorTests']['moistureSensors']):
                if not passed:
                    failed_tests.append(f"Bodenfeuchtesensor {i+1}")
            
            if not test_results['sensorTests']['dht11']:
                failed_tests.append("DHT11 (Temperatur/Luftfeuchtigkeit)")
            
            if not test_results['sensorTests']['ultrasonic']:
                failed_tests.append("Ultraschallsensor (Wasserstand)")
            
            for i, passed in enumerate(test_results['pumpTests']):
                if not passed:
                    failed_tests.append(f"Pumpe {i+1}")
            
            failed_list = "<br>".join([f"• {test}" for test in failed_tests])
            
            body = f"""
            <h2 style="color: #dc2626;">Wöchentlicher Systemtest fehlgeschlagen</h2>
            <p>Status: <strong>{test_results['overallStatus']}</strong></p>
            <p>Details: {test_results.get('details', 'Keine Details verfügbar')}</p>
            <h3>Fehlgeschlagene Tests:</h3>
            <p>{failed_list if failed_list else 'Keine spezifischen Fehler'}</p>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Bitte System überprüfen.</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">
                Zeitstempel: {time.localtime()}<br>
                ESP32 Pflanzenbewässerungssystem
            </p>
            """
            self.send_email_emailjs(subject, body)

# Initialize in main()
email_notifier = EmailNotifier(FIREBASE_URL)
```

## Integration in den Hauptloop

```python
def main():
    hw = HardwareController()
    email_notifier = EmailNotifier(FIREBASE_URL)
    
    # Connect WiFi
    connect_wifi(hw.wlan, WIFI_SSID, WIFI_PASSWORD)
    
    # Load settings including notifications
    settings = load_settings_from_firebase()
    email_notifier.load_settings()
    
    while True:
        try:
            # Read sensors
            sensor_data = read_all_sensors(hw)
            
            # Check water level and notify if low
            email_notifier.notify_low_water(sensor_data['waterLevel'])
            
            # Check for sensor errors
            if sensor_data['temperature'] < -40 or sensor_data['temperature'] > 80:
                email_notifier.notify_sensor_error(
                    "DHT11 Temperatur",
                    f"Unplausible Temperatur: {sensor_data['temperature']}°C"
                )
            
            # Upload to Firebase
            upload_sensor_data(sensor_data)
            
            # Weekly test (Sunday at 3 AM)
            if should_run_weekly_test():
                test_results = run_weekly_test(hw)
                email_notifier.notify_test_failure(test_results)
            
            # Reload notification settings every 5 minutes
            if time.time() % 300 == 0:
                email_notifier.load_settings()
            
            time.sleep(settings['measurementInterval'])
            
        except Exception as e:
            print(f"✗ Error in main loop: {e}")
            time.sleep(60)
```

## Fehlerbehebung

### E-Mails werden nicht gesendet

**Mögliche Ursachen:**
1. **WiFi-Verbindung**: Überprüfen Sie `wlan.isconnected()`
2. **Benachrichtigungen deaktiviert**: Prüfen Sie Dashboard-Einstellungen
3. **Keine E-Mail-Adresse**: Stellen Sie sicher, dass eine gültige E-Mail in den Einstellungen eingetragen ist
4. **Rate Limiting**: Nur 1 E-Mail pro Stunde pro Ereignistyp
5. **API-Fehler**: Prüfen Sie `response.status_code` im Serial Monitor

**Debugging:**
```python
# In main.py aktivieren
email_notifier.load_settings()
print(f"Enabled: {email_notifier.enabled}")
print(f"Recipient: {email_notifier.recipient_email}")
print(f"Threshold: {email_notifier.low_water_threshold}")
```

### Rate Limiting anpassen

Ändern Sie die 3600 Sekunden (1 Stunde) in `should_notify()`:

```python
def should_notify(self, event_type):
    current_time = time.time()
    last_sent = self.last_notification.get(event_type, 0)
    
    # Beispiel: 30 Minuten
    if current_time - last_sent > 1800:
        self.last_notification[event_type] = current_time
        return True
    return False
```

### E-Mail landet im Spam

**Lösung:**
- Markieren Sie die erste E-Mail als "Kein Spam"
- Verwenden Sie einen verifizierten E-Mail-Dienst
- Achten Sie auf sauberes HTML ohne verdächtige Links

## Kosten & Limits

| Dienst | Kostenlos | Kosten danach |
|--------|-----------|---------------|
| **EmailJS** | 200 E-Mails/Monat | 5€/Monat für 1000 E-Mails |
| **SendGrid** | 100 E-Mails/Tag | Ab 15€/Monat |
| **Mailgun** | 100 E-Mails/Tag | Ab 10€/Monat |

**Typische Nutzung:** Mit 1-2 Benachrichtigungen pro Woche bleiben Sie **kostenlos** innerhalb aller Limits.

## Sicherheit

⚠️ **Wichtig:**
- **Committen Sie niemals API-Keys** in Git
- Fügen Sie eine `.env` oder `config.py` zu `.gitignore` hinzu
- Verwenden Sie dedizierte E-Mail-Adressen für IoT-Geräte
- API-Keys können jederzeit widerrufen/neu generiert werden
- Aktivieren Sie nur benötigte Benachrichtigungen

## Beispiel E-Mail

```
Betreff: ⚠️ Niedriger Wasserstand

Wasserstand kritisch niedrig!
=============================

Aktueller Wasserstand: 8.0%
Schwellwert: 10%

⚠️ Bitte Wassertank auffüllen.

────────────────────────────
Zeitstempel: (2025, 10, 19, 14, 30, 25, 5, 292)
ESP32 Pflanzenbewässerungssystem
```

## Support

Bei Problemen:
1. Aktivieren Sie Serial-Debugging: `print()` Statements hinzufügen
2. Überprüfen Sie Firebase-Einstellungen im Dashboard
3. Testen Sie API-Verbindung mit `requests.get()`
4. Prüfen Sie Rate-Limiting-Zeitstempel

---

**Version:** 2.0 (MicroPython)  
**Letzte Aktualisierung:** Oktober 2025
