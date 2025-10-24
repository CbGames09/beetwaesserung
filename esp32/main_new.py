# ESP32-S3 Automatic Plant Watering System
# MicroPython Implementation - Modular & Robust Version

import time
from machine import Pin, SPI
from epaper1in54b import EPD

# Import our modules
from hardware import HardwareController
from wifi_manager import WiFiManager
from firebase_client import FirebaseClient
from ntp_sync import NTPSync

# =============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# =============================================================================

# WiFi Configuration
WIFI_SSID = ""
WIFI_PASSWORD = ""

# Firebase Configuration
FIREBASE_URL = ""

# Hardware Configuration
CONFIG = {
    # Moisture Sensors (ADC1 pins - WiFi compatible!)
    'MOISTURE_PINS': [13, 2, 3, 4],
    
    # DHT11 Sensor
    'DHT_PIN': 17,
    
    # Ultrasonic Sensor
    'ULTRASONIC_TRIGGER': 9,
    'ULTRASONIC_ECHO': 10,
    
    # Relay Pins (for pumps)
    'RELAY_PINS': [5, 6, 7, 8],
    
    # E-Ink Display Configuration
    'ENABLE_EINK_DISPLAY': True,
    'EINK_MOSI': 38,
    'EINK_CLK': 48,
    'EINK_CS': 21,
    'EINK_DC': 18,
    'EINK_RST': 14,
    'EINK_BUSY': 46,
    
    # System Configuration
    'MEASUREMENT_INTERVAL': 300,  # 5 minutes default
    'WATERING_DURATION': 5,  # seconds
    'HISTORICAL_DATA_INTERVAL': 3600,  # Save every hour (3600 seconds)
}

# =============================================================================
# WATERING SYSTEM CONTROLLER
# =============================================================================

class WateringSystem:
    def __init__(self, hardware, wifi, firebase, ntp, eink_display=None):
        self.hw = hardware
        self.wifi = wifi
        self.fb = firebase
        self.ntp = ntp
        self.eink = eink_display
        
        self.settings = None
        self.last_test_time = 0
        self.test_interval = 7 * 24 * 60 * 60  # 7 days
        self.last_display_status = None
        self.last_historical_save = 0  # Track when we last saved historical data
        
        # Connect modules
        self.hw.system = self
        self.fb.system = self
    
    def get_timestamp(self):
        """Get current UTC timestamp in milliseconds"""
        return self.ntp.get_timestamp()
    
    def get_time(self):
        """Get current UTC time in seconds"""
        return self.ntp.get_time()
    
    def load_settings(self):
        """Load settings from Firebase (with error handling)"""
        try:
            print("→ Loading settings from Firebase")
            settings = self.fb.get_settings()
            if settings:
                self.settings = settings
                print(f"✓ Settings loaded: {settings['numberOfPlants']} plants")
                return True
            else:
                print("⚠ Failed to load settings, using defaults")
                return False
        except Exception as e:
            print(f"✗ Settings load error: {e}")
            return False
    
    def read_all_sensors(self):
        """Read all sensor data with comprehensive error handling"""
        # Read moisture sensors
        moisture = []
        for i in range(4):
            try:
                value = self.hw.read_moisture(i)
                moisture.append(round(value, 1))
            except Exception as e:
                moisture.append(0.0)
                self.fb.log_error("sensor", f"Moisture Sensor {i+1}", str(e), "error")
        
        # Read DHT11
        try:
            temp, humidity = self.hw.read_dht11()
            if temp == 0 and humidity == 0:
                self.fb.log_error("sensor", "DHT11", "Returns zeros", "warning")
        except Exception as e:
            temp, humidity = 0.0, 0.0
            self.fb.log_error("sensor", "DHT11", str(e), "error")
        
        # Read ultrasonic
        try:
            distance_cm = self.hw.read_ultrasonic()
        except Exception as e:
            distance_cm = 0.0
            self.fb.log_error("sensor", "Ultrasonic", str(e), "error")
        
        # Calculate water level percentage
        water_level = 0.0
        if self.settings and 'waterTank' in self.settings:
            tank_height = self.settings['waterTank']['height']
            water_height = tank_height - distance_cm
            water_level = (water_height / tank_height) * 100
            water_level = max(0, min(100, water_level))
        
        return {
            "timestamp": self.get_timestamp(),
            "plantMoisture": moisture,
            "temperature": round(temp, 1),
            "humidity": round(humidity, 1),
            "waterLevel": round(water_level, 1),
            "waterLevelCm": round(distance_cm, 1)
        }
    
    def check_and_water(self, sensor_data):
        """Check moisture and water if needed"""
        if not self.settings:
            return
        
        for i in range(self.settings['numberOfPlants']):
            profile = self.settings['plantProfiles'][i]
            moisture = sensor_data['plantMoisture'][i]
            
            if moisture < profile['moistureMin']:
                print(f"! Plant {i+1} needs water ({moisture}% < {profile['moistureMin']}%)")
                self.hw.activate_pump(i, CONFIG['WATERING_DURATION'])
    
    def check_manual_watering(self):
        """Check for manual watering commands"""
        try:
            command = self.fb.get_manual_watering()
            if command and 'plantId' in command:
                plant_id = command['plantId'] - 1
                duration = command.get('duration', CONFIG['WATERING_DURATION'])
                print(f"! Manual watering: Plant {plant_id + 1}, {duration}s")
                self.hw.activate_pump(plant_id, duration)
                self.fb.clear_manual_watering()
        except Exception as e:
            print(f"✗ Manual watering check error: {e}")
    
    def save_historical_data(self, sensor_data):
        """Save historical data point every hour"""
        current_time = self.get_time()
        
        # Check if it's time to save (every hour)
        if current_time - self.last_historical_save >= CONFIG['HISTORICAL_DATA_INTERVAL']:
            try:
                print("→ Saving historical data point...")
                
                # Prepare historical data
                hist_data = {
                    "timestamp": sensor_data['timestamp'],
                    "plantMoisture": sensor_data['plantMoisture'],
                    "temperature": sensor_data['temperature'],
                    "humidity": sensor_data['humidity'],
                    "waterLevel": sensor_data['waterLevel']
                }
                
                # Save to Firebase
                if self.fb.save_historical_data(hist_data):
                    print("✓ Historical data saved")
                    self.last_historical_save = current_time
                else:
                    print("⚠ Historical data save failed")
            except Exception as e:
                print(f"✗ Historical data save error: {e}")
    
    def update_display(self, sensor_data):
        """Update E-Ink display if status changed"""
        if not self.eink:
            return
        
        # Determine status
        status = "ok"
        if sensor_data['waterLevel'] < 20:
            status = "error"
        elif sensor_data['waterLevel'] < 40:
            status = "warning"
        
        # Check if any plant needs water
        if self.settings:
            for i in range(self.settings['numberOfPlants']):
                profile = self.settings['plantProfiles'][i]
                if sensor_data['plantMoisture'][i] < profile['moistureMin']:
                    status = "warning" if status == "ok" else status
        
        # Only update if changed
        if status != self.last_display_status:
            try:
                print(f"→ Updating E-Ink display: {status}")
                self.draw_status_icon(status)
                self.last_display_status = status
                print("✓ Display updated")
            except Exception as e:
                print(f"✗ Display update error: {e}")
                self.fb.log_error("eink_display", "Display Update", str(e), "warning")
    
    def draw_status_icon(self, status):
        """Draw status icon on E-Ink display"""
        # Create frame buffers
        frame_black = bytearray(5000)
        frame_red = bytearray(5000)
        
        # Fill with white
        for i in range(5000):
            frame_black[i] = 0xFF
            frame_red[i] = 0x00
        
        # Draw circle (center: 100,100, radius: 40)
        if status == "ok":
            self.eink.draw_filled_circle(frame_black, 100, 100, 40, 0)  # Black
        else:
            self.eink.draw_filled_circle(frame_red, 100, 100, 40, 1)  # Red
        
        self.eink.display_frame(frame_black, frame_red)
    
    def run(self):
        """Main system loop - robust and fault-tolerant"""
        print("\n" + "="*50)
        print("STARTING WATERING SYSTEM")
        print("="*50 + "\n")
        
        # Initial setup
        if not self.wifi.connect():
            print("✗ Initial WiFi connection failed - will retry in loop")
        
        if self.wifi.is_connected():
            if self.ntp.sync():
                print("✓ NTP synchronized")
            else:
                self.fb.log_error("ntp", "NTP Sync", "All servers failed", "warning")
        
        self.load_settings()
        
        # Main loop
        loop_count = 0
        while True:
            try:
                loop_count += 1
                print(f"\n{'='*50}")
                print(f"MAIN LOOP #{loop_count}")
                print(f"{'='*50}\n")
                
                # ===== Step 1: Ensure WiFi Connection =====
                if not self.wifi.ensure_connection():
                    print("⚠ WiFi not connected - retrying in 30s...")
                    time.sleep(30)
                    continue  # Skip this loop iteration
                
                # ===== Step 2: Get measurement interval =====
                interval = CONFIG['MEASUREMENT_INTERVAL']
                if self.settings and 'measurementInterval' in self.settings:
                    interval = self.settings['measurementInterval']
                
                # ===== Step 3: Read all sensors =====
                print("→ Reading sensors...")
                sensor_data = self.read_all_sensors()
                print(f"  Moisture: {sensor_data['plantMoisture']}")
                print(f"  Temp: {sensor_data['temperature']}°C, Humidity: {sensor_data['humidity']}%")
                print(f"  Water: {sensor_data['waterLevel']}%")
                
                # ===== Step 4: Upload to Firebase =====
                print("→ Uploading sensor data...")
                if self.fb.update_sensor_data(sensor_data):
                    print("✓ Sensor data uploaded")
                else:
                    print("⚠ Sensor data upload failed")
                
                # ===== Step 5: Save historical data (every hour) =====
                self.save_historical_data(sensor_data)
                
                # ===== Step 6: Update system status =====
                status = {
                    "online": True,
                    "lastUpdate": self.get_timestamp(),
                    "displayStatus": "ok"
                }
                if sensor_data['waterLevel'] < 20:
                    status['displayStatus'] = "error"
                elif sensor_data['waterLevel'] < 40:
                    status['displayStatus'] = "warning"
                
                self.fb.update_system_status(status)
                
                # ===== Step 7: Check manual commands =====
                self.check_manual_watering()
                
                # ===== Step 8: Auto-watering =====
                self.check_and_water(sensor_data)
                
                # ===== Step 9: Update E-Ink display =====
                self.update_display(sensor_data)
                
                # ===== Step 10: Reload settings =====
                self.load_settings()
                
                # ===== Step 11: Sleep =====
                print(f"→ Sleeping for {interval} seconds...")
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n✗ System stopped by user")
                break
            except Exception as e:
                print(f"\n✗ Error in main loop: {e}")
                print("  Continuing in 60 seconds...")
                time.sleep(60)

# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    print("\n" + "="*50)
    print("ESP32-S3 PLANT WATERING SYSTEM")
    print("Modular & Robust Version")
    print("="*50 + "\n")
    
    # Initialize WiFi Manager
    print("→ Initializing WiFi Manager...")
    wifi = WiFiManager(WIFI_SSID, WIFI_PASSWORD)
    print("✓ WiFi Manager ready\n")
    
    # Initialize Hardware
    print("→ Initializing Hardware...")
    hardware = HardwareController(CONFIG)
    print()
    
    # Initialize Firebase Client
    print("→ Initializing Firebase Client...")
    firebase = FirebaseClient(FIREBASE_URL, max_retries=3, timeout=10)
    print("✓ Firebase Client ready\n")
    
    # Initialize NTP Sync
    print("→ Initializing NTP Sync...")
    ntp = NTPSync()
    print("✓ NTP Sync ready\n")
    
    # Initialize E-Ink Display (optional)
    eink = None
    if CONFIG['ENABLE_EINK_DISPLAY']:
        print("→ Initializing E-Ink Display...")
        try:
            spi = SPI(2, baudrate=4000000, polarity=0, phase=0,
                     sck=Pin(CONFIG['EINK_CLK']), mosi=Pin(CONFIG['EINK_MOSI']))
            
            cs_pin = Pin(CONFIG['EINK_CS'])
            dc_pin = Pin(CONFIG['EINK_DC'])
            rst_pin = Pin(CONFIG['EINK_RST'])
            busy_pin = Pin(CONFIG['EINK_BUSY'])
            
            eink = EPD(spi, cs_pin, dc_pin, rst_pin, busy_pin)
            eink.init()
            
            # Clear display
            frame_black = bytearray(5000)
            frame_red = bytearray(5000)
            for i in range(5000):
                frame_black[i] = 0xFF
                frame_red[i] = 0x00
            eink.display_frame(frame_black, frame_red)
            
            print("✓ E-Ink Display ready\n")
        except Exception as e:
            print(f"⚠ E-Ink Display failed: {e}")
            print("  Continuing without display...\n")
            eink = None
            firebase.log_error("eink_display", "Init", str(e), "warning")
    
    # Create and run system
    print("→ Starting Watering System...\n")
    system = WateringSystem(hardware, wifi, firebase, ntp, eink)
    system.run()

if __name__ == "__main__":
    main()
