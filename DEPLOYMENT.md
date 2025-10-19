# Deployment Anleitung

## GitHub Pages Deployment

### Vorbereitung

1. **Vite Konfiguration für GitHub Pages**

Fügen Sie in `vite.config.ts` die `base` Option hinzu:

```typescript
export default defineConfig({
  base: '/your-repo-name/', // Ersetzen Sie mit Ihrem Repository-Namen
  // ... rest of config
});
```

2. **Build Script**

Bauen Sie die statische Website:

```bash
npm run build
```

Die Dateien werden in `/dist` generiert.

3. **GitHub Repository Setup**

- Erstellen Sie ein neues GitHub Repository
- Pushen Sie Ihren Code
- Gehen Sie zu Settings → Pages
- Wählen Sie Branch: `main` und Ordner: `/dist`
- Oder verwenden Sie GitHub Actions für automatisches Deployment

### Automatisches Deployment mit GitHub Actions

Erstellen Sie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Firebase Secrets in GitHub

Fügen Sie die Firebase-Konfiguration als GitHub Secrets hinzu:

1. Gehen Sie zu Repository → Settings → Secrets and variables → Actions
2. Fügen Sie folgende Secrets hinzu:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

### Wichtige Hinweise

- Die Website ist **vollständig statisch** und kann auf GitHub Pages gehostet werden
- Alle Daten werden über Firebase Realtime Database synchronisiert
- Der ESP32 kommuniziert direkt mit Firebase (keine Server-Komponente erforderlich)
- Firebase Realtime Database ist kostenlos im Spark-Plan (bis zu 100 gleichzeitige Verbindungen)

## Firebase Realtime Database Setup

1. Erstellen Sie ein Firebase-Projekt unter https://console.firebase.google.com/
2. Aktivieren Sie Realtime Database
3. Setzen Sie die Sicherheitsregeln:

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
    }
  }
}
```

**Wichtig**: Für eine produktive Umgebung sollten Sie die Sicherheitsregeln einschränken!

## ESP32 Setup

Der MicroPython-Code für den ESP32 wird im nächsten Schritt bereitgestellt und enthält:

1. WLAN-Verbindung
2. Sensor-Auslesung
3. Firebase REST API Integration
4. Automatische Bewässerungslogik
5. E-Ink Display-Ansteuerung
6. Wöchentlicher Selbsttest

## Verkabelung

Eine detaillierte Verkabelungsanleitung wird mit dem ESP32-Code bereitgestellt.
