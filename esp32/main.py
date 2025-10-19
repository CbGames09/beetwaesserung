# ESP32-S3 Automatic Plant Watering System
# MicroPython Implementation

import time
import ujson as json
import urequests as requests
import network
import machine
from machine import Pin, ADC, I2C
import dht

# =============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# =============================================================================

# WiFi Configuration
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"

# Firebase Configuration
FIREBASE_URL = "https://YOUR-PROJECT-default-rtdb.YOUR-REGION.firebasedatabase.app"
# Example: "https://pflanzenbewasserung-default-rtdb.europe-west1.firebasedatabase.app"

# Pin Configuration (adjust based on your wiring)
# Moisture Sensors (Analog)
MOISTURE_PINS = [36, 39, 34, 35]  # GPIO pins for ADC

# DHT11 Sensor
DHT_PIN = 4

# Ultrasonic Sensor
ULTRASONIC_TRIGGER = 5
ULTRASONIC_ECHO = 18

# Relay Pins (for pumps)
RELAY_PINS = [13, 12, 14, 27]

# E-Ink Display (SPI)
EINK_CS = 15
EINK_DC = 2
EINK_RST = 0
EINK_BUSY = 16

# Water Tank Configuration (in cm)
TANK_DIAMETER = 20
TANK_HEIGHT = 30
TANK_FULL_DISTANCE = 5  # Distance from sensor to full tank (cm)

# System Configuration
MEASUREMENT_INTERVAL = 300  # Default: 5 minutes (will be overridden from Firebase)
WATERING_DURATION = 10  # Default watering duration in seconds
PUMP_4_DAILY_RUN = 10  # Pump 4 runs for 10 seconds daily when only 3 plants active

# =============================================================================
# HARDWARE INITIALIZATION
# =============================================================================

class HardwareController:
    def __init__(self):
        # Initialize WiFi
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        
        # Initialize moisture sensors (ADC)
        self.moisture_adcs = [ADC(Pin(pin)) for pin in MOISTURE_PINS]
        for adc in self.moisture_adcs:
            adc.atten(ADC.ATTN_11DB)  # Full range 0-3.3V
        
        # Initialize DHT11
        self.dht_sensor = dht.DHT11(Pin(DHT_PIN))
        
        # Initialize Ultrasonic Sensor
        self.trigger = Pin(ULTRASONIC_TRIGGER, Pin.OUT)
        self.echo = Pin(ULTRASONIC_ECHO, Pin.IN)
        
        # Initialize Relays (active LOW for most relay modules)
        self.relays = [Pin(pin, Pin.OUT, value=1) for pin in RELAY_PINS]  # Start with all OFF (HIGH)
        
        # Last watered timestamps
        self.last_watered = [0, 0, 0, 0]
        self.last_pump4_run = 0
        
        print("✓ Hardware initialized")
    
    def read_moisture(self, sensor_id):
        """Read moisture sensor (0-100%)"""
        try:
            raw = self.moisture_adcs[sensor_id].read()
            # Calibration: 4095 (dry) -> 0%, 1200 (wet) -> 100%
            # Adjust these values based on your sensor calibration
            dry_value = 4095
            wet_value = 1200
            moisture = 100 - ((raw - wet_value) * 100 / (dry_value - wet_value))
            return max(0, min(100, moisture))
        except Exception as e:
            print(f"✗ Error reading moisture sensor {sensor_id}: {e}")
            return 0
    
    def read_dht11(self):
        """Read temperature and humidity from DHT11"""
        try:
            self.dht_sensor.measure()
            temp = self.dht_sensor.temperature()
            humidity = self.dht_sensor.humidity()
            return temp, humidity
        except Exception as e:
            print(f"✗ Error reading DHT11: {e}")
            return 0, 0
    
    def read_ultrasonic(self):
        """Read distance from ultrasonic sensor (cm)"""
        try:
            self.trigger.value(0)
            time.sleep_us(2)
            self.trigger.value(1)
            time.sleep_us(10)
            self.trigger.value(0)
            
            # Wait for echo
            timeout = 30000
            start = time.ticks_us()
            while self.echo.value() == 0 and time.ticks_diff(time.ticks_us(), start) < timeout:
                pass
            time_start = time.ticks_us()
            
            while self.echo.value() == 1 and time.ticks_diff(time.ticks_us(), start) < timeout:
                pass
            time_end = time.ticks_us()
            
            duration = time.ticks_diff(time_end, time_start)
            distance = (duration * 0.0343) / 2  # Speed of sound = 343 m/s
            return distance
        except Exception as e:
            print(f"✗ Error reading ultrasonic: {e}")
            return 0
    
    def activate_pump(self, pump_id, duration=WATERING_DURATION):
        """Activate pump for specified duration"""
        try:
            print(f"→ Activating pump {pump_id + 1} for {duration}s")
            self.relays[pump_id].value(0)  # Active LOW
            time.sleep(duration)
            self.relays[pump_id].value(1)  # OFF
            self.last_watered[pump_id] = time.time()
            print(f"✓ Pump {pump_id + 1} deactivated")
        except Exception as e:
            print(f"✗ Error activating pump {pump_id}: {e}")
            self.relays[pump_id].value(1)  # Ensure OFF on error

# =============================================================================
# FIREBASE COMMUNICATION
# =============================================================================

class FirebaseClient:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
    
    def get(self, path):
        """GET request to Firebase"""
        try:
            url = f"{self.base_url}/{path}.json"
            response = requests.get(url)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Firebase GET error: {response.status_code}")
                return None
        except Exception as e:
            print(f"✗ Firebase GET exception: {e}")
            return None
        finally:
            if 'response' in locals():
                response.close()
    
    def put(self, path, data):
        """PUT request to Firebase"""
        try:
            url = f"{self.base_url}/{path}.json"
            headers = {'Content-Type': 'application/json'}
            response = requests.put(url, data=json.dumps(data), headers=headers)
            success = response.status_code == 200
            if not success:
                print(f"✗ Firebase PUT error: {response.status_code}")
            return success
        except Exception as e:
            print(f"✗ Firebase PUT exception: {e}")
            return False
        finally:
            if 'response' in locals():
                response.close()
    
    def update_sensor_data(self, data):
        """Update sensor data in Firebase"""
        return self.put("sensorData", data)
    
    def update_system_status(self, status):
        """Update system status in Firebase"""
        return self.put("systemStatus", status)
    
    def get_settings(self):
        """Get system settings from Firebase"""
        return self.get("settings")
    
    def get_manual_watering(self):
        """Check for manual watering commands"""
        return self.get("manualWatering")
    
    def clear_manual_watering(self):
        """Clear manual watering command"""
        return self.put("manualWatering", None)
    
    def update_test_result(self, result):
        """Update test result in Firebase"""
        return self.put("lastTest", result)

# =============================================================================
# MAIN SYSTEM CONTROLLER
# =============================================================================

class WateringSystem:
    def __init__(self, hardware, firebase):
        self.hw = hardware
        self.fb = firebase
        self.settings = None
        self.last_test_time = 0
        self.test_interval = 7 * 24 * 60 * 60  # 7 days in seconds
    
    def connect_wifi(self):
        """Connect to WiFi"""
        if not self.hw.wlan.isconnected():
            print(f"→ Connecting to WiFi: {WIFI_SSID}")
            self.hw.wlan.connect(WIFI_SSID, WIFI_PASSWORD)
            
            timeout = 20
            while not self.hw.wlan.isconnected() and timeout > 0:
                time.sleep(1)
                timeout -= 1
                print(".", end="")
            
            if self.hw.wlan.isconnected():
                print(f"\n✓ WiFi connected: {self.hw.wlan.ifconfig()[0]}")
                return True
            else:
                print("\n✗ WiFi connection failed")
                return False
        return True
    
    def load_settings(self):
        """Load settings from Firebase"""
        print("→ Loading settings from Firebase")
        settings = self.fb.get_settings()
        if settings:
            self.settings = settings
            print(f"✓ Settings loaded: {settings['numberOfPlants']} plants, interval: {settings['measurementInterval']}s")
            return True
        else:
            print("✗ Failed to load settings, using defaults")
            return False
    
    def read_all_sensors(self):
        """Read all sensor data"""
        # Read moisture sensors
        moisture = [self.hw.read_moisture(i) for i in range(4)]
        
        # Read DHT11
        temp, humidity = self.hw.read_dht11()
        
        # Read ultrasonic (water level)
        distance_cm = self.hw.read_ultrasonic()
        
        # Calculate water level percentage
        if distance_cm <= TANK_FULL_DISTANCE:
            water_level = 100
        elif distance_cm >= TANK_HEIGHT:
            water_level = 0
        else:
            water_level = 100 - ((distance_cm - TANK_FULL_DISTANCE) * 100 / (TANK_HEIGHT - TANK_FULL_DISTANCE))
        water_level = max(0, min(100, water_level))
        
        return {
            "timestamp": int(time.time() * 1000),  # Milliseconds
            "plantMoisture": moisture,
            "temperature": temp,
            "humidity": humidity,
            "waterLevel": water_level,
            "waterLevelCm": distance_cm
        }
    
    def check_and_water(self, sensor_data):
        """Check moisture levels and water if needed"""
        if not self.settings:
            return
        
        for i in range(self.settings['numberOfPlants']):
            profile = self.settings['plantProfiles'][i]
            moisture = sensor_data['plantMoisture'][i]
            
            if moisture < profile['moistureMin']:
                print(f"! Plant {i+1} needs water (moisture: {moisture}%, min: {profile['moistureMin']}%)")
                self.hw.activate_pump(i, WATERING_DURATION)
    
    def check_manual_watering(self):
        """Check for manual watering commands"""
        command = self.fb.get_manual_watering()
        if command and 'plantId' in command:
            plant_id = command['plantId'] - 1  # Convert to 0-indexed
            duration = command.get('duration', WATERING_DURATION)
            print(f"! Manual watering command for plant {plant_id + 1}")
            self.hw.activate_pump(plant_id, duration)
            self.fb.clear_manual_watering()
    
    def run_daily_pump4_maintenance(self):
        """Run pump 4 daily for 10 seconds if only 3 plants active"""
        if self.settings and self.settings['numberOfPlants'] == 3:
            current_time = time.time()
            # Run once per day (86400 seconds)
            if current_time - self.hw.last_pump4_run > 86400:
                print("→ Running daily pump 4 maintenance")
                self.hw.activate_pump(3, PUMP_4_DAILY_RUN)
                self.hw.last_pump4_run = current_time
    
    def run_system_test(self):
        """Run weekly system test"""
        current_time = time.time()
        if current_time - self.last_test_time < self.test_interval:
            return
        
        print("=" * 50)
        print("STARTING WEEKLY SYSTEM TEST")
        print("=" * 50)
        
        result = {
            "timestamp": int(current_time * 1000),
            "overallStatus": "passed",
            "sensorTests": {
                "moistureSensors": [],
                "dht11": False,
                "ultrasonic": False
            },
            "pumpTests": [],
            "connectivityTest": False,
            "details": ""
        }
        
        # Test moisture sensors
        for i in range(4):
            try:
                moisture = self.hw.read_moisture(i)
                passed = 0 <= moisture <= 100
                result["sensorTests"]["moistureSensors"].append(passed)
                print(f"Moisture sensor {i+1}: {'✓ PASS' if passed else '✗ FAIL'} ({moisture}%)")
            except:
                result["sensorTests"]["moistureSensors"].append(False)
                print(f"Moisture sensor {i+1}: ✗ FAIL")
        
        # Test DHT11
        try:
            temp, humidity = self.hw.read_dht11()
            passed = -40 <= temp <= 80 and 0 <= humidity <= 100
            result["sensorTests"]["dht11"] = passed
            print(f"DHT11: {'✓ PASS' if passed else '✗ FAIL'} (T:{temp}°C, H:{humidity}%)")
        except:
            result["sensorTests"]["dht11"] = False
            print("DHT11: ✗ FAIL")
        
        # Test ultrasonic
        try:
            distance = self.hw.read_ultrasonic()
            passed = 2 <= distance <= 400  # Valid range for HC-SR04
            result["sensorTests"]["ultrasonic"] = passed
            print(f"Ultrasonic: {'✓ PASS' if passed else '✗ FAIL'} ({distance}cm)")
        except:
            result["sensorTests"]["ultrasonic"] = False
            print("Ultrasonic: ✗ FAIL")
        
        # Test pumps (1 second activation)
        for i in range(4):
            try:
                self.hw.activate_pump(i, 1)
                result["pumpTests"].append(True)
                print(f"Pump {i+1}: ✓ PASS")
            except:
                result["pumpTests"].append(False)
                print(f"Pump {i+1}: ✗ FAIL")
        
        # Test connectivity
        try:
            test_data = self.fb.get("systemStatus")
            result["connectivityTest"] = test_data is not None
            print(f"Connectivity: {'✓ PASS' if result['connectivityTest'] else '✗ FAIL'}")
        except:
            result["connectivityTest"] = False
            print("Connectivity: ✗ FAIL")
        
        # Determine overall status
        all_tests = (
            all(result["sensorTests"]["moistureSensors"]) and
            result["sensorTests"]["dht11"] and
            result["sensorTests"]["ultrasonic"] and
            all(result["pumpTests"]) and
            result["connectivityTest"]
        )
        
        if all_tests:
            result["overallStatus"] = "passed"
            result["details"] = "Alle Tests erfolgreich abgeschlossen"
        else:
            failed_count = sum([
                result["sensorTests"]["moistureSensors"].count(False),
                0 if result["sensorTests"]["dht11"] else 1,
                0 if result["sensorTests"]["ultrasonic"] else 1,
                result["pumpTests"].count(False),
                0 if result["connectivityTest"] else 1
            ])
            if failed_count <= 2:
                result["overallStatus"] = "warning"
                result["details"] = f"{failed_count} Test(s) fehlgeschlagen"
            else:
                result["overallStatus"] = "failed"
                result["details"] = f"{failed_count} Test(s) fehlgeschlagen - Systemprüfung erforderlich"
        
        # Upload test result
        self.fb.update_test_result(result)
        self.last_test_time = current_time
        
        print("=" * 50)
        print(f"TEST COMPLETE: {result['overallStatus'].upper()}")
        print("=" * 50)
    
    def update_display_status(self, status):
        """Update E-Ink display with system status icon"""
        # TODO: Implement E-Ink display update
        # This requires the Waveshare E-Ink library
        # For now, just print status
        print(f"Display status: {status}")
    
    def run(self):
        """Main control loop"""
        print("\n" + "=" * 50)
        print("ESP32 PLANT WATERING SYSTEM")
        print("=" * 50)
        
        # Connect to WiFi
        if not self.connect_wifi():
            print("✗ Cannot start without WiFi")
            return
        
        # Load settings
        self.load_settings()
        
        # Main loop
        while True:
            try:
                # Get current interval from settings
                interval = self.settings['measurementInterval'] if self.settings else MEASUREMENT_INTERVAL
                
                # Read sensors
                print(f"\n→ Reading sensors...")
                sensor_data = self.read_all_sensors()
                print(f"  Moisture: {sensor_data['plantMoisture']}")
                print(f"  Temp: {sensor_data['temperature']}°C, Humidity: {sensor_data['humidity']}%")
                print(f"  Water: {sensor_data['waterLevel']}%")
                
                # Upload to Firebase
                if self.fb.update_sensor_data(sensor_data):
                    print("✓ Sensor data uploaded")
                
                # Update system status
                status = {
                    "online": True,
                    "lastUpdate": int(time.time() * 1000),
                    "displayStatus": "ok"  # Can be "ok", "warning", "error"
                }
                
                # Check water level
                if sensor_data['waterLevel'] < 20:
                    status['displayStatus'] = "warning"
                
                self.fb.update_system_status(status)
                
                # Check for manual watering commands
                self.check_manual_watering()
                
                # Auto-watering based on moisture levels
                self.check_and_water(sensor_data)
                
                # Daily pump 4 maintenance
                self.run_daily_pump4_maintenance()
                
                # Weekly system test
                self.run_system_test()
                
                # Reload settings (in case they changed)
                self.load_settings()
                
                # Update display
                self.update_display_status(status['displayStatus'])
                
                # Sleep until next measurement
                print(f"→ Sleeping for {interval} seconds...")
                time.sleep(interval)
                
            except Exception as e:
                print(f"✗ Error in main loop: {e}")
                time.sleep(60)  # Wait 1 minute before retry

# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    # Initialize hardware
    hardware = HardwareController()
    
    # Initialize Firebase client
    firebase = FirebaseClient(FIREBASE_URL)
    
    # Create and run watering system
    system = WateringSystem(hardware, firebase)
    system.run()

if __name__ == "__main__":
    main()
