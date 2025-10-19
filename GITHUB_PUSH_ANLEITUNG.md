# 📤 GitHub Push-Anleitung

## ✅ Diese Dateien MÜSSEN auf GitHub gepusht werden:

### 1. Frontend-Code
```
client/
├── src/
│   ├── components/      # Alle UI-Komponenten
│   ├── pages/          # Dashboard, etc.
│   ├── lib/            # Firebase, Utils
│   └── App.tsx
├── index.html
└── (alle anderen Dateien im client/ Ordner)
```

### 2. Backend-Code (wird nicht für GitHub Pages gebraucht, aber für Vollständigkeit)
```
server/
└── (alle Dateien)
```

### 3. ESP32-Code
```
esp32/
├── main.py
├── INSTALLATION.md
├── WIRING_DIAGRAM.txt
└── (alle anderen .py Dateien)
```

### 4. Gemeinsame Schemas
```
shared/
└── schema.ts
```

### 5. Konfigurationsdateien
```
.github/
└── workflows/
    └── deploy.yml        # ⚠️ WICHTIG für GitHub Pages Deployment!

package.json
package-lock.json
tsconfig.json
vite.config.ts
tailwind.config.ts
postcss.config.js
components.json
drizzle.config.ts
```

### 6. Dokumentation
```
README.md
replit.md
FIREBASE_SETUP.md
FIREBASE_QUICK_FIX.md
GITHUB_PAGES_SETUP.md
DEPLOYMENT.md
GETTING_STARTED.md
design_guidelines.md
```

### 7. Git-Konfiguration
```
.gitignore              # ⚠️ WICHTIG!
```

---

## ❌ Diese Dateien werden NICHT gepusht (automatisch ignoriert):

Die `.gitignore`-Datei verhindert, dass folgende Ordner/Dateien gepusht werden:

```
node_modules/           # NPM-Pakete (werden bei GitHub Actions neu installiert)
dist/                   # Build-Ausgabe (wird bei jedem Deployment neu generiert)
.DS_Store              # macOS-spezifische Datei
server/public/         # Wird von Vite generiert
vite.config.ts.*       # Temporäre Dateien
*.tar.gz               # Komprimierte Archive
```

**WICHTIG**: Pushen Sie **NIEMALS** `node_modules` oder `dist` zu GitHub!

---

## 🔐 GitHub Secrets konfigurieren

**BEVOR** Sie pushen, müssen Sie die Firebase-Secrets in GitHub hinterlegen:

### Schritt 1: GitHub Repository Settings öffnen
1. Gehen Sie zu Ihrem GitHub-Repository
2. Klicken Sie auf **"Settings"** (oben rechts)
3. Navigieren Sie zu **"Secrets and variables"** → **"Actions"**

### Schritt 2: Folgende Secrets hinzufügen
Klicken Sie auf **"New repository secret"** für jeden dieser Werte:

| Secret Name | Wert von Replit Secret |
|------------|------------------------|
| `VITE_FIREBASE_API_KEY` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_AUTH_DOMAIN` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_DATABASE_URL` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_PROJECT_ID` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_STORAGE_BUCKET` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Kopieren Sie aus Replit Secrets |
| `VITE_FIREBASE_APP_ID` | Kopieren Sie aus Replit Secrets |
| `VITE_DEFAULT_PIN` | Ihr Standard-PIN (z.B. "1234") |

**Wie Sie die Replit Secrets finden:**
1. In Replit: Klicken Sie auf "Tools" → "Secrets"
2. Kopieren Sie jeden Wert einzeln

---

## 📝 Git-Befehle zum Pushen

### Erstmaliges Setup (nur einmal nötig)
```bash
git init
git add .
git commit -m "Initial commit: ESP32 Bewässerungssystem"
git branch -M main
git remote add origin https://github.com/IHR-BENUTZERNAME/beetwaesserung.git
git push -u origin main
```

### Bei späteren Änderungen
```bash
git add .
git commit -m "Beschreibung Ihrer Änderungen"
git push
```

---

## ⚙️ Was passiert nach dem Push?

1. **GitHub Actions startet automatisch** (siehe `.github/workflows/deploy.yml`)
2. **Build-Prozess**:
   - Node.js und npm werden installiert
   - `npm ci` installiert alle Abhängigkeiten
   - `vite build --base=/beetwaesserung/` erstellt den optimierten Build
   - Firebase-Secrets werden aus GitHub Secrets geladen
3. **Deployment zu GitHub Pages**:
   - Build-Ausgabe (`dist/public/`) wird hochgeladen
   - Website wird unter `https://IHR-BENUTZERNAME.github.io/beetwaesserung/` verfügbar

---

## ✅ Checkliste vor dem ersten Push

- [ ] Firebase Realtime Database Sicherheitsregeln gesetzt (siehe `FIREBASE_QUICK_FIX.md`)
- [ ] Alle GitHub Secrets konfiguriert
- [ ] `.gitignore` vorhanden (verhindert Push von `node_modules` und `dist`)
- [ ] GitHub Repository erstellt
- [ ] Repository-Name ist **"beetwaesserung"** (wichtig für Base-Path!)

---

## 🐛 Troubleshooting

### "Build failed" auf GitHub Actions
- Überprüfen Sie, ob **alle** GitHub Secrets gesetzt sind
- Klicken Sie auf "Actions" → "Deploy to GitHub Pages" → Details ansehen

### Website zeigt "404 Not Found"
- Gehen Sie zu Repository Settings → Pages
- Stellen Sie sicher, dass "Source" auf **"GitHub Actions"** gesetzt ist

### Firebase-Fehler auf der Website
- Überprüfen Sie die Firebase Realtime Database Sicherheitsregeln
- Öffnen Sie die Browser-Konsole (F12) für Details

---

## 📚 Weitere Dokumentation

- **`GITHUB_PAGES_SETUP.md`** - Detaillierte GitHub Pages Konfiguration
- **`FIREBASE_QUICK_FIX.md`** - Firebase Permission Denied beheben
- **`DEPLOYMENT.md`** - Allgemeine Deployment-Übersicht
