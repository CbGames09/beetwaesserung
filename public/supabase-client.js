// ============================================
// Supabase Client für ESP32 Pflanzenbewässerung
// ============================================

let supabase;

// Initialisiere Supabase Client
function initSupabase() {
    if (!window.SUPABASE_CONFIG || 
        window.SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL_HERE' || 
        window.SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.error('❌ Supabase nicht konfiguriert! Bitte config.js bearbeiten.');
        return false;
    }
    
    supabase = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey,
        window.SUPABASE_CONFIG.options
    );
    
    console.log('✅ Supabase Client initialisiert');
    return true;
}

// API-Funktionen für Sensordaten
const SensorDataAPI = {
    // Letzte Sensordaten abrufen
    async getLatest() {
        const { data, error } = await supabase
            .from('sensor_data')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
        
        if (error) {
            console.error('Fehler beim Abrufen der letzten Daten:', error);
            return null;
        }
        return data;
    },
    
    // Historische Daten abrufen (letzte X Stunden)
    async getHistory(hours = 24) {
        const { data, error } = await supabase
            .rpc('get_recent_sensor_data', { hours_back: hours });
        
        if (error) {
            console.error('Fehler beim Abrufen der Historie:', error);
            return [];
        }
        return data || [];
    },
    
    // Neue Sensordaten einfügen (für ESP32)
    async insert(sensorData) {
        const { data, error } = await supabase
            .from('sensor_data')
            .insert([{
                moisture: sensorData.moisture,
                air_temp: sensorData.air_temp,
                air_humidity: sensorData.air_humidity,
                water_distance_cm: sensorData.water_distance_cm,
                self_test: sensorData.self_test || { status: 'ok', message: '' }
            }])
            .select()
            .single();
        
        if (error) {
            console.error('Fehler beim Einfügen der Daten:', error);
            return null;
        }
        return data;
    },
    
    // Realtime-Subscription für Live-Updates
    subscribe(callback) {
        return supabase
            .channel('sensor_data_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sensor_data'
            }, callback)
            .subscribe();
    }
};

// API-Funktionen für Konfiguration
const ConfigAPI = {
    // Konfiguration abrufen
    async get() {
        const { data, error } = await supabase
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) {
            console.error('Fehler beim Abrufen der Config:', error);
            return null;
        }
        return data;
    },
    
    // Konfiguration aktualisieren
    async update(newConfig) {
        const { data, error } = await supabase
            .from('config')
            .update({
                plant_count: newConfig.plant_count,
                plants: newConfig.plants,
                pump: newConfig.pump,
                water_tank: newConfig.water_tank,
                measurement_interval: newConfig.measurement_interval,
                alerts: newConfig.alerts || { water_tank_threshold: 20 },
                updated_at: new Date().toISOString()
            })
            .eq('id', 1)
            .select()
            .single();
        
        if (error) {
            console.error('Fehler beim Aktualisieren der Config:', error);
            return null;
        }
        return data;
    },
    
    // Realtime-Subscription für Config-Änderungen
    subscribe(callback) {
        return supabase
            .channel('config_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'config'
            }, callback)
            .subscribe();
    }
};

// Kombinierte API für einfachen Zugriff
const API = {
    sensor: SensorDataAPI,
    config: ConfigAPI,
    
    // Compatibility-Funktion für alte `/api/sensor-data` Endpunkt
    async getSensorData(timeRange = '24h') {
        const hours = timeRange === '24h' ? 24 : timeRange === '3d' ? 72 : 168;
        
        const [latest, history, config] = await Promise.all([
            SensorDataAPI.getLatest(),
            SensorDataAPI.getHistory(hours),
            ConfigAPI.get()
        ]);
        
        // Alerts berechnen
        const alerts = this.calculateAlerts(latest, config);
        
        return {
            current: latest,
            history: history,
            config: config,
            alerts: alerts
        };
    },
    
    // Alert-Berechnung (aus app.py übernommen)
    calculateAlerts(currentData, config) {
        const alerts = [];
        
        if (!currentData || !config) return alerts;
        
        const plantCount = config.plant_count || 3;
        const moistureData = currentData.moisture || [];
        
        // Pflanzen-Alarme
        for (let i = 0; i < Math.min(plantCount, moistureData.length); i++) {
            const plant = config.plants[i];
            const moisture = moistureData[i];
            
            if (moisture < plant.lower_limit) {
                alerts.push({
                    type: 'moisture_low',
                    severity: 'warning',
                    plant_id: plant.id,
                    plant_name: plant.name,
                    message: `${plant.name}: Zu trocken (${moisture}%)`,
                    icon: 'water_drop'
                });
            } else if (moisture > plant.upper_limit) {
                alerts.push({
                    type: 'moisture_high',
                    severity: 'warning',
                    plant_id: plant.id,
                    plant_name: plant.name,
                    message: `${plant.name}: Zu feucht (${moisture}%)`,
                    icon: 'warning'
                });
            }
        }
        
        // Wassertank-Alarm
        const waterTank = config.water_tank || { radius_cm: 10, height_cm: 50 };
        const waterDistance = currentData.water_distance_cm || 0;
        const waterHeight = waterTank.height_cm - waterDistance;
        const waterLiters = (waterHeight * Math.pow(waterTank.radius_cm, 2) * Math.PI) / 1000;
        const waterThreshold = config.alerts?.water_tank_threshold || 20;
        
        const maxCapacity = (waterTank.height_cm * Math.pow(waterTank.radius_cm, 2) * Math.PI) / 1000;
        const waterPercentage = maxCapacity > 0 ? (waterLiters / maxCapacity * 100) : 0;
        
        if (waterPercentage < waterThreshold && waterLiters >= 0) {
            alerts.push({
                type: 'water_low',
                severity: 'critical',
                message: `Wassertank niedrig (${waterLiters.toFixed(1)}L / ${waterPercentage.toFixed(0)}%)`,
                icon: 'water'
            });
        }
        
        // Selbsttest-Alarm
        const selfTest = currentData.self_test || { status: 'ok', message: '' };
        if (selfTest.status === 'error') {
            alerts.push({
                type: 'self_test_error',
                severity: 'critical',
                message: `Systemfehler: ${selfTest.message || 'Unbekannter Fehler'}`,
                icon: 'error'
            });
        }
        
        return alerts;
    }
};

// Initialisiere bei Seitenload
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

// Export für globale Nutzung
window.API = API;
window.supabaseClient = supabase;
