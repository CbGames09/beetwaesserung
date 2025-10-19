# 🚀 GitHub Pages Deployment Anleitung

Vollständige Anleitung zum Deployment Ihrer ESP32 Pflanzenbewässerungs-Website auf GitHub Pages mit automatischen Builds via GitHub Actions.

## ✅ Voraussetzungen

- GitHub Account
- Git installiert (bereits in Replit verfügbar)
- Firebase Projekt erstellt mit Realtime Database

## 📋 Schritt-für-Schritt Anleitung

### 1️⃣ GitHub Repository erstellen

1. Gehen Sie zu [GitHub](https://github.com) und loggen Sie sich ein
2. Klicken Sie auf **"New repository"** (grüner Button)
3. Repository-Name: z.B. `pflanzenbewasserung` (wird Teil Ihrer URL)
4. Sichtbarkeit: **Public** (für kostenlose GitHub Pages)
5. **Klicken Sie auf "Create repository"**

📌 **Wichtig:** Notieren Sie sich den Repository-Namen für später!

---

### 2️⃣ Code zu GitHub hochladen

Führen Sie diese Befehle im **Replit Terminal** aus:

```bash
# Git Repository initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: ESP32 Pflanzenbewässerungssystem"

# Branch umbenennen auf 'main'
git branch -M main

# GitHub Repository als Remote hinzufügen
# ⚠️ Ersetzen Sie 'IHR_USERNAME' und 'IHR_REPO_NAME' mit Ihren Werten!
git remote add origin https://github.com/IHR_USERNAME/IHR_REPO_NAME.git

# Code hochladen
git push -u origin main
```

**Beispiel:**
```bash
git remote add origin https://github.com/max-mustermann/pflanzenbewasserung.git
```

---

### 3️⃣ Firebase Secrets in GitHub konfigurieren

Die Firebase-Zugangsdaten müssen als GitHub Secrets hinterlegt werden:

1. Gehen Sie zu Ihrem GitHub Repository
2. Klicken Sie auf **Settings** (Zahnrad-Symbol)
3. In der linken Sidebar: **Secrets and variables** → **Actions**
4. Klicken Sie auf **"New repository secret"**

Fügen Sie **alle** folgenden Secrets einzeln hinzu:

| Secret Name | Wert finden in |
|-------------|----------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_DATABASE_URL` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Projekteinstellungen → Web-App Config |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Projekteinstellungen → Web-App Config |

**So finden Sie die Firebase-Werte:**
1. [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt aus
3. Klicken Sie auf das **Zahnrad-Symbol** → **Projekteinstellungen**
4. Scrollen Sie zu **"Ihre Apps"**
5. Wählen Sie Ihre **Web-App** aus
6. Kopieren Sie die Werte aus dem **SDK snippet (Config)**

**Beispiel Config:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",              // ← VITE_FIREBASE_API_KEY
  authDomain: "projekt.firebaseapp.com",  // ← VITE_FIREBASE_AUTH_DOMAIN
  databaseURL: "https://projekt-db.firebaseio.com",  // ← VITE_FIREBASE_DATABASE_URL
  projectId: "projekt-id",           // ← VITE_FIREBASE_PROJECT_ID
  storageBucket: "projekt.appspot.com",  // ← VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",    // ← VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123"    // ← VITE_FIREBASE_APP_ID
};
```

---

### 4️⃣ GitHub Pages aktivieren

1. Gehen Sie zu Ihrem GitHub Repository
2. **Settings** → **Pages** (in der linken Sidebar)
3. Unter **"Source"**: Wählen Sie **"GitHub Actions"**
4. Klicken Sie auf **Save**

✅ **Fertig!** GitHub Actions ist nun aktiviert.

---

### 5️⃣ Deployment starten

Der erste Deployment-Prozess startet automatisch, sobald Sie Code pushen:

```bash
git add .
git commit -m "Update: Konfiguration für GitHub Pages"
git push
```

**Deployment-Status überwachen:**
1. Gehen Sie zu Ihrem Repository auf GitHub
2. Klicken Sie auf den Tab **"Actions"**
3. Sie sehen den Workflow **"Deploy to GitHub Pages"** laufen
4. Warten Sie, bis der grüne Haken ✅ erscheint (ca. 2-5 Minuten)

---

### 6️⃣ Ihre Website ist live! 🎉

Ihre Website ist nun verfügbar unter:

```
https://IHR_USERNAME.github.io/IHR_REPO_NAME/
```

**Beispiel:**
```
https://max-mustermann.github.io/pflanzenbewasserung/
```

---

## 🔐 Firebase Realtime Database Sicherheitsregeln

**Wichtig:** Konfigurieren Sie die Sicherheitsregeln in Firebase:

1. [Firebase Console](https://console.firebase.google.com/)
2. **Realtime Database** → **Rules**
3. Fügen Sie folgende Regeln ein:

```json
{
  "rules": {
    ".read": "true",
    ".write": "true"
  }
}
```

⚠️ **Achtung:** Diese Regeln erlauben öffentlichen Zugriff. Für Produktionsumgebungen sollten Sie strengere Regeln verwenden (siehe `FIREBASE_SETUP.md`).

---

## 🔄 Updates deployen

Jedes Mal, wenn Sie Änderungen pushen, wird automatisch ein neuer Build erstellt:

```bash
# Änderungen vornehmen
# ...

# Änderungen committen und pushen
git add .
git commit -m "Beschreibung Ihrer Änderungen"
git push
```

Der Deployment-Prozess läuft automatisch in GitHub Actions!

---

## 🛠️ Troubleshooting

### Problem: Build schlägt fehl

**Lösung:** Überprüfen Sie die GitHub Actions Logs:
1. Repository → **Actions** Tab
2. Klicken Sie auf den fehlgeschlagenen Workflow
3. Lesen Sie die Fehlermeldungen

**Häufige Fehler:**
- **Fehlende Secrets:** Stellen Sie sicher, dass alle 7 Firebase-Secrets konfiguriert sind
- **Falsche Secret-Namen:** Secret-Namen müssen **exakt** übereinstimmen (Groß-/Kleinschreibung beachten!)

### Problem: Website zeigt "Permission denied" Fehler

**Lösung:** Firebase Realtime Database Regeln überprüfen (siehe oben)

### Problem: Website lädt nicht

**Lösung:**
1. Überprüfen Sie, ob GitHub Pages in den Settings aktiviert ist
2. Warten Sie 5-10 Minuten nach dem ersten Deployment
3. Löschen Sie Browser-Cache und laden Sie neu

### Problem: Firebase-Verbindung funktioniert nicht

**Lösung:**
1. Überprüfen Sie alle GitHub Secrets (Rechtschreibung, Vollständigkeit)
2. Stellen Sie sicher, dass die Firebase Database URL korrekt ist
3. Prüfen Sie Firebase-Sicherheitsregeln

---

## 📝 Custom Domain (Optional)

Sie können eine eigene Domain verwenden:

1. **GitHub:** Repository → Settings → Pages → Custom domain
2. Geben Sie Ihre Domain ein (z.B. `pflanzenbewasserung.example.com`)
3. **DNS-Provider:** Fügen Sie einen CNAME-Record hinzu:
   ```
   CNAME: pflanzenbewasserung → IHR_USERNAME.github.io
   ```

---

## 🔗 Nützliche Links

- [GitHub Pages Dokumentation](https://docs.github.com/en/pages)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [Firebase Console](https://console.firebase.google.com/)
- [Vite Build Dokumentation](https://vitejs.dev/guide/build.html)

---

## 📊 Workflow-Datei Erklärung

Die Datei `.github/workflows/deploy.yml` enthält die Deployment-Konfiguration:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main          # Deployment bei jedem Push auf 'main'
  workflow_dispatch:  # Ermöglicht manuellen Start

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    steps:
      - Checkout Code
      - Node.js installieren
      - Dependencies installieren (npm ci)
      - Build mit Firebase Secrets als ENV vars
      - Upload Build-Artefakte

  deploy:
    steps:
      - Deploy zu GitHub Pages
```

---

## ✅ Checkliste

- [ ] GitHub Repository erstellt
- [ ] Code zu GitHub gepusht
- [ ] Alle 7 Firebase Secrets in GitHub konfiguriert
- [ ] GitHub Pages aktiviert (Source: GitHub Actions)
- [ ] Firebase Realtime Database Regeln konfiguriert
- [ ] Erster Workflow erfolgreich durchgelaufen
- [ ] Website unter `https://IHR_USERNAME.github.io/IHR_REPO_NAME/` erreichbar

---

**Viel Erfolg mit Ihrem Deployment! 🌱💧**

Bei Fragen oder Problemen, überprüfen Sie zuerst die Troubleshooting-Sektion oben.
