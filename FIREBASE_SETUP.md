# Firebase Realtime Database Setup

## Schritt 1: Firebase-Projekt erstellen

1. Gehen Sie zu https://console.firebase.google.com/
2. Klicken Sie auf "Projekt hinzufügen"
3. Geben Sie einen Projektnamen ein (z.B. "pflanzenbewässerung")
4. Deaktivieren Sie Google Analytics (optional)
5. Klicken Sie auf "Projekt erstellen"

## Schritt 2: Realtime Database aktivieren

1. Wählen Sie Ihr Projekt in der Firebase Console
2. Klicken Sie im Menü links auf "Build" → "Realtime Database"
3. Klicken Sie auf "Datenbank erstellen"
4. Wählen Sie einen Standort (z.B. "europe-west1")
5. **WICHTIG**: Wählen Sie "Im Testmodus starten"
6. Klicken Sie auf "Aktivieren"

## Schritt 3: Sicherheitsregeln konfigurieren

Nach dem Erstellen der Datenbank müssen Sie die Sicherheitsregeln anpassen:

1. Gehen Sie zum Tab "Regeln" in Ihrer Realtime Database
2. Ersetzen Sie die bestehenden Regeln mit folgenden **sicheren Regeln**:

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

3. Klicken Sie auf "Veröffentlichen"

**WICHTIG**: Diese Regeln erlauben öffentlichen Lese- und Schreibzugriff auf die genannten Pfade. Dies ist akzeptabel für ein privates IoT-Projekt, aber beachten Sie:

- Die Datenbank-URL ist nur Ihnen bekannt (nicht öffentlich gelistet)
- Für sensitive Daten sollten Sie Firebase Authentication implementieren
- Alternativ können Sie IP-basierte Einschränkungen verwenden

### Noch sicherere Regeln mit Firebase Authentication (Optional, Fortgeschritten)

Falls Sie maximale Sicherheit benötigen:

```json
{
  "rules": {
    "sensorData": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "settings": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "systemStatus": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "lastTest": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "manualWatering": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "systemErrors": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "historicalData": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Bei Verwendung dieser Regeln müssen Sie:
1. Firebase Authentication aktivieren
2. Anonymous Authentication oder Email/Password aktivieren
3. Im ESP32 und Frontend vor Datenbankzugriff authentifizieren

Dies geht über den Rahmen dieses Projekts hinaus. Die strukturierten Regeln oben sind für die meisten Anwendungsfälle ausreichend sicher.

## Schritt 4: Firebase-Konfiguration abrufen

1. Klicken Sie auf das Zahnrad-Symbol neben "Projektübersicht"
2. Wählen Sie "Projekteinstellungen"
3. Scrollen Sie nach unten zu "Ihre Apps"
4. Klicken Sie auf das Web-Symbol (`</>`)
5. Geben Sie einen App-Namen ein (z.B. "Dashboard")
6. **Aktivieren Sie NICHT** "Firebase Hosting einrichten"
7. Klicken Sie auf "App registrieren"
8. Kopieren Sie die Konfigurationswerte aus dem `firebaseConfig` Objekt

Die Konfiguration sieht etwa so aus:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ihr-projekt.firebaseapp.com",
  databaseURL: "https://ihr-projekt-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ihr-projekt",
  storageBucket: "ihr-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxx"
};
```

## Schritt 5: Environment Variables in Replit setzen

Die Secrets sind bereits in Replit konfiguriert. Falls Sie sie aktualisieren müssen:

1. Gehen Sie zu Ihrem Replit-Projekt
2. Klicken Sie auf "Tools" → "Secrets"
3. Fügen Sie folgende Secrets hinzu/aktualisieren Sie sie:

- `VITE_FIREBASE_API_KEY` → Wert von `apiKey`
- `VITE_FIREBASE_AUTH_DOMAIN` → Wert von `authDomain`
- `VITE_FIREBASE_DATABASE_URL` → Wert von `databaseURL`
- `VITE_FIREBASE_PROJECT_ID` → Wert von `projectId`
- `VITE_FIREBASE_STORAGE_BUCKET` → Wert von `storageBucket`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` → Wert von `messagingSenderId`
- `VITE_FIREBASE_APP_ID` → Wert von `appId`

## Schritt 6: Anwendung testen

1. Starten Sie die Anwendung neu (sie startet automatisch nach Änderungen)
2. Öffnen Sie die Webview
3. Die Datenbank sollte automatisch mit Standardwerten initialisiert werden
4. Verwenden Sie den "Dev Tools" Button rechts unten, um Demo-Daten zu laden

## Fehlerbehebung

### "Permission denied" Fehler

Wenn Sie einen "Permission denied" Fehler sehen:
1. Überprüfen Sie die Sicherheitsregeln in Firebase (siehe Schritt 3)
2. Stellen Sie sicher, dass `.read` und `.write` auf `true` gesetzt sind
3. Klicken Sie auf "Veröffentlichen" nach Änderungen der Regeln

### Keine Verbindung zur Datenbank

1. Überprüfen Sie die Browser-Konsole auf Fehler (F12 → Console)
2. Stellen Sie sicher, dass `VITE_FIREBASE_DATABASE_URL` korrekt gesetzt ist
3. Die URL sollte das Format haben: `https://[PROJECT-ID]-default-rtdb.[REGION].firebasedatabase.app`

### Environment Variables werden nicht geladen

1. Starten Sie die Anwendung neu
2. Überprüfen Sie, ob alle VITE_* Secrets in den Replit Secrets gesetzt sind
3. Environment Variables mit dem Präfix `VITE_` werden automatisch im Frontend verfügbar gemacht

## ESP32 Firebase-Integration

Der ESP32 verwendet die Firebase REST API. Dokumentation folgt im ESP32-Abschnitt.

Die REST API-Endpunkte sind:

- GET/PUT `https://[PROJECT-ID]-default-rtdb.[REGION].firebasedatabase.app/sensorData.json`
- GET/PUT `https://[PROJECT-ID]-default-rtdb.[REGION].firebasedatabase.app/settings.json`
- GET/PUT `https://[PROJECT-ID]-default-rtdb.[REGION].firebasedatabase.app/systemStatus.json`
- GET `https://[PROJECT-ID]-default-rtdb.[REGION].firebasedatabase.app/manualWatering.json`

Ersetzen Sie `[PROJECT-ID]` und `[REGION]` mit Ihren Werten.
