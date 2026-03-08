# ESP32-S3 Automatic Plant Watering System
# MicroPython Implementation - Modular & Robust Version

import time
from machine import Pin, deepsleep

# Import our modules
from hardware import HardwareController
from wifi_manager import WiFiManager
from firebase_client import FirebaseClient
from ntp_sync import NTPSync

# =============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# =============================================================================

# WiFi Configuration
# ⚠️ WICHTIG: Ersetze diese Platzhalter mit deinen echten Zugangsdaten!
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
    
    # Motion Sensor (PIR)
    'MOTION_SENSOR_PIN': 11,
    
    # LED Ring (24-bit WS2812B / NeoPixel)
    'LED_RING_PIN': 12,
    'LED_RING_COUNT': 24,
    
    # System Configuration
    'MEASUREMENT_INTERVAL': 300,  # 5 minutes default
    'WATERING_DURATION': 5,  # seconds
    'HISTORICAL_DATA_INTERVAL': 3600,  # Save every hour (3600 seconds)
}

# =============================================================================
# WATERING SYSTEM CONTROLLER
# =============================================================================

class WateringSystem:
    def __init__(self, hardware, wifi, firebase, ntp):
        self.hw = hardware
        self.wifi = wifi
        self.fb = firebase
        self.ntp = ntp
        
        self.settings = None
        self.last_test_time = 0
        self.test_interval = 7 * 24 * 60 * 60  # 7 days
        self.last_historical_save = 0  # Track when we last saved historical data
        self.settings_load_time = 0  # Track when settings were last loaded
        self.settings_cache_interval = 3600  # Reload settings only every hour (3600s)
        
        # Connect modules
        self.hw.system = self
        self.fb.system = self
    
    def get_timestamp(self):
        """Get current UTC timestamp in milliseconds"""
        return self.ntp.get_timestamp()
    
    def get_time(self):
        """Get current UTC time in seconds"""
        return self.ntp.get_time()
    
    def load_settings(self, force=False):
        """Load settings from Firebase (with error handling and caching)"""
        current_time = self.get_time()
        
        # Only reload if forced or cache expired
        if not force and self.settings and (current_time - self.settings_load_time) < self.settings_cache_interval:
            return True
        
        try:
            print("→ Loading settings from Firebase")
            settings = self.fb.get_settings()
            if settings:
                self.settings = settings
                self.settings_load_time = current_time
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
    
    def check_manual_test(self):
        """Check for manual test trigger"""
        try:
            trigger = self.fb.get_manual_test_trigger()
            if trigger and trigger.get('trigger') == True:
                print("! Manual test triggered from website")
                self.fb.clear_manual_test_trigger()
                self.run_system_test()
        except Exception as e:
            print(f"✗ Manual test check error: {e}")
    
    def run_system_test(self):
        """Run comprehensive system test with new logic"""
        print("\n" + "="*50)
        print("SYSTEM SELF-TEST")
        print("="*50 + "\n")
        
        test_result = {
            "timestamp": self.get_timestamp(),
            "moistureSensors": [],
            "pumps": [],
            "dht11": {"passed": False, "message": ""},
            "ultrasonic": {"passed": False, "message": ""},
            "overall": False
        }
        
        # Test each plant: Pump 3s, wait 1min, check moisture increase
        print("→ Testing moisture sensors and pumps...")
        for i in range(4):
            try:
                print(f"\n  Plant {i+1}:")
                
                # Read initial moisture
                moisture_before = self.hw.read_moisture(i)
                print(f"    Initial moisture: {moisture_before:.1f}%")
                
                # Run pump for 5 seconds
                print(f"    Running pump for 5 seconds...")
                self.hw.activate_pump(i, 5)
                
                # Wait 1 minute
                print(f"    Waiting 60 seconds...")
                time.sleep(60)
                
                # Read moisture after
                moisture_after = self.hw.read_moisture(i)
                print(f"    Moisture after: {moisture_after:.1f}%")
                
                # Check if moisture increased by at least 1%
                moisture_increase = moisture_after - moisture_before
                moisture_increased = moisture_increase >= 1.0
                
                sensor_result = {
                    "passed": moisture_increased,
                    "moistureBefore": round(moisture_before, 1),
                    "moistureAfter": round(moisture_after, 1),
                    "message": "OK" if moisture_increased else f"Increase too small ({moisture_increase:.1f}%, min. 1%)"
                }
                
                test_result["moistureSensors"].append(sensor_result)
                test_result["pumps"].append(sensor_result)
                
                print(f"    Result: {'✓ PASSED' if moisture_increased else '✗ FAILED'}")
                
            except Exception as e:
                test_result["moistureSensors"].append({"passed": False, "message": str(e)})
                test_result["pumps"].append({"passed": False, "message": str(e)})
                print(f"    ✗ Error: {e}")
        
        # Test DHT11
        print("\n→ Testing DHT11 sensor...")
        try:
            temp, humidity = self.hw.read_dht11()
            passed = temp > 0 and humidity > 0
            test_result["dht11"] = {
                "passed": passed,
                "temperature": round(temp, 1),
                "humidity": round(humidity, 1),
                "message": "OK" if passed else "Returns zeros"
            }
            print(f"  {'✓ PASSED' if passed else '✗ FAILED'}: {temp}°C, {humidity}%")
        except Exception as e:
            test_result["dht11"] = {"passed": False, "message": str(e)}
            print(f"  ✗ FAILED: {e}")
        
        # Test Ultrasonic (must be <= tank_height + 5cm)
        print("\n→ Testing ultrasonic sensor...")
        try:
            distance_cm = self.hw.read_ultrasonic()
            max_distance = 100  # Default
            
            if self.settings and 'waterTank' in self.settings:
                max_distance = self.settings['waterTank']['height'] + 5
            
            passed = distance_cm <= max_distance
            test_result["ultrasonic"] = {
                "passed": passed,
                "distance": round(distance_cm, 1),
                "maxAllowed": max_distance,
                "message": "OK" if passed else f"Too high ({distance_cm:.1f}cm > {max_distance}cm)"
            }
            print(f"  {'✓ PASSED' if passed else '✗ FAILED'}: {distance_cm:.1f}cm (max: {max_distance}cm)")
        except Exception as e:
            test_result["ultrasonic"] = {"passed": False, "message": str(e)}
            print(f"  ✗ FAILED: {e}")
        
        # Overall result (no database test needed)
        all_passed = (
            all(s.get("passed", False) for s in test_result["moistureSensors"]) and
            test_result["dht11"]["passed"] and
            test_result["ultrasonic"]["passed"]
        )
        test_result["overall"] = all_passed
        
        print(f"\n{'='*50}")
        print(f"OVERALL: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
        print(f"{'='*50}\n")
        
        # Upload results to Firebase
        print("→ Uploading test results to Firebase...")
        if self.fb.update_test_result(test_result):
            print("✓ Test results uploaded successfully")
        else:
            print("✗ Failed to upload test results")
        
        self.last_test_time = self.get_time()
        return test_result
    
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
    
    def run(self):
        """Main system loop - robust and fault-tolerant with power optimization"""
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
        
        self.load_settings(force=True)
        
        # Disconnect WiFi to save power before entering main loop
        self.wifi.disconnect()
        
        # Main loop
        loop_count = 0
        while True:
            try:
                loop_count += 1
                print(f"\n{'='*50}")
                print(f"MAIN LOOP #{loop_count}")
                print(f"{'='*50}\n")
                
                # ===== Step 1: Get measurement interval =====
                interval = CONFIG['MEASUREMENT_INTERVAL']
                if self.settings and 'measurementInterval' in self.settings:
                    interval = self.settings['measurementInterval']
                
                # ===== Step 2: Enable WiFi for communication (needed for error logging) =====
                print("→ Enabling WiFi for communication...")
                self.wifi.connect()
                
                if not self.wifi.is_connected():
                    print("⚠ WiFi not connected - will retry next cycle")
                    self.wifi.disconnect()
                    print(f"→ Deep sleeping for {interval} seconds...")
                    deepsleep(int(interval * 1000))
                    continue
                
                # ===== Step 3: Read all sensors (WiFi ON for error logging) =====
                print("→ Reading sensors...")
                sensor_data = self.read_all_sensors()
                print(f"  Moisture: {sensor_data['plantMoisture']}")
                print(f"  Temp: {sensor_data['temperature']}°C, Humidity: {sensor_data['humidity']}%")
                print(f"  Water: {sensor_data['waterLevel']}%")
                
                # ===== Step 4: Upload sensor data to Firebase =====
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
                
                # ===== Step 7: Check manual commands and reload settings =====
                self.check_manual_watering()
                self.check_manual_test()
                self.load_settings()  # Use cached version if recent
                
                # ===== Step 8: Disable WiFi before sleeping =====
                print("→ Disabling WiFi to save power...")
                self.wifi.disconnect()
                
                # ===== Step 9: Auto-watering (WiFi OFF) =====
                print("→ Checking automatic watering...")
                self.check_and_water(sensor_data)
                
                # ===== Step 10: Deep Sleep =====
                print(f"→ Deep sleeping for {interval} seconds...")
                deepsleep(int(interval * 1000))
                
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
    firebase = FirebaseClient(FIREBASE_URL, max_retries=3)
    print("✓ Firebase Client ready\n")
    
    # Initialize NTP Sync
    print("→ Initializing NTP Sync...")
    ntp = NTPSync()
    print("✓ NTP Sync ready\n")
    
    # Create and run system
    print("→ Starting Watering System...\n")
    system = WateringSystem(hardware, wifi, firebase, ntp)
    system.run()

if __name__ == "__main__":
    main()
