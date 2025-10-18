// ============================================
// Supabase-Konfiguration (SICHER)
// ============================================
// 
// SETUP-SCHRITTE:
// 
// 1. Gehen Sie zu: https://app.supabase.com/project/_/settings/api
// 2. Kopieren Sie die "Project URL"
// 3. Kopieren Sie den "anon public" API-Schlüssel
// 4. Ersetzen Sie die Werte unten
//
// ✅ SICHERHEIT:
// - Der anon Key ist SICHER für öffentliche Nutzung
// - Row Level Security (RLS) schützt Ihre Daten
// - Nur eingeloggte Benutzer können Einstellungen ändern
// - ESP32 nutzt separaten Service Role Key (nie öffentlich!)

const SUPABASE_CONFIG = {
    // Ihre Supabase Project URL (z.B.: https://xxxxx.supabase.co)
    url: 'YOUR_SUPABASE_URL_HERE',
    
    // Ihr Supabase anon/public Key (kann öffentlich sein)
    anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE',
    
    // Konfiguration mit Auth
    options: {
        db: {
            schema: 'public'
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
};

// Export für Nutzung in anderen Dateien
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
