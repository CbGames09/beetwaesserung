# ESP32 Configuration File - Example Template
# ⚠️ WICHTIG: Diese Datei enthält NUR Platzhalter!
# 
# So verwendest du diese Datei:
# 1. Kopiere diese Datei: cp config.example.py config.py
# 2. Bearbeite config.py und ersetze ALLE Platzhalter mit deinen echten Werten
# 3. Lade config.py auf deinen ESP32 hoch
# 4. config.py wird NICHT committed (steht in .gitignore)

# WiFi Configuration
# Ersetze mit deinem WiFi-Namen und Passwort
WIFI_SSID = "YOUR_WIFI_NETWORK_NAME"  # z.B. "FRITZ!Box 6660" oder "MeinWLAN"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"  # z.B. "mein_geheimes_passwort_123"

# Firebase Configuration
# Ersetze mit deiner Firebase Realtime Database URL
# Du findest diese URL in deinem Firebase Console unter "Realtime Database" -> "Daten"
FIREBASE_URL = "https://your-project-id-default-rtdb.REGION.firebasedatabase.app"
# Beispiel: "https://mein-projekt-abc123-default-rtdb.europe-west1.firebasedatabase.app"

# SICHERHEITSHINWEIS:
# - Committe NIEMALS deine config.py mit echten Credentials!
# - Die config.py ist in .gitignore und wird nicht versioniert
# - Teile diese Datei NICHT öffentlich
