# ESP32-S3 Automatic Plant Watering System
# MicroPython Implementation

import time
import ujson as json
import urequests as requests
import network
import machine
from machine import Pin, ADC, I2C, RTC, SPI
import dht
import ntptime
from epaper1in54b import EPD

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
# Moisture Sensors (Analog) - ESP32-S3 ADC1 Pins (WiFi compatible!)
# IMPORTANT: ESP32-S3 ADC1 = GPIO 1-10, ADC2 = GPIO 11-20
# ADC2 does NOT work with WiFi! Use ADC1 pins only!
# ⚠️ WARNING: GPIO 0, 1, 2, 3 are STRAPPING PINS - do NOT use for ADC!
MOISTURE_PINS = [13, 2, 3, 4]  # GPIO pins for ADC (ADC1_CH3, CH4, CH5, CH6)

# DHT11 Sensor
DHT_PIN = 17  # Changed to avoid ADC pin conflict

# Ultrasonic Sensor
ULTRASONIC_TRIGGER = 9
ULTRASONIC_ECHO = 10

# Relay Pins (for pumps) - Using safe GPIO pins
RELAY_PINS = [5, 6, 7, 8]

# E-Ink Display (SPI) - Waveshare 1.54" 3-Color (8 Pins)
# Standard SPI Pins (Hardware SPI)
EINK_MOSI = 38   # DIN (Data In)
EINK_CLK = 48    # CLK (Clock)
# Control Pins (können frei gewählt werden)
EINK_CS = 21     # CS (Chip Select)
EINK_DC = 18     # DC (Data/Command)
EINK_RST = 14   # RST (Reset)
EINK_BUSY = 1  # BUSY (Busy Signal)
# VCC = 3.3V, GND = Ground (nicht konfigurierbar)

# Water Tank Configuration (in cm)
TANK_DIAMETER = 20
TANK_HEIGHT = 30
TANK_FULL_DISTANCE = 5  # Distance from sensor to full tank (cm)

# System Configuration
MEASUREMENT_INTERVAL = 300  # Default: 5 minutes (will be overridden from Firebase)
WATERING_DURATION = 5  # Pump 4 runs for 10 seconds daily when only 3 plants active

# NTP Configuration
NTP_HOST = "pool.ntp.org"  # NTP server
# Timezone wird automatisch erkannt (MEZ/MESZ für Deutschland)

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
        """Read moisture sensor (0-100%) - raises exception on error"""
        raw = self.moisture_adcs[sensor_id].read()
        # Calibration: 4095 (dry) -> 0%, 1200 (wet) -> 100%
        # Adjust these values based on your sensor calibration
        dry_value = 4095
        wet_value = 1200
        moisture = 100 - ((raw - wet_value) * 100 / (dry_value - wet_value))
        return max(0, min(100, moisture))
    
    def read_dht11(self):
        """Read temperature and humidity from DHT11 - raises exception on error"""
        self.dht_sensor.measure()
        temp = self.dht_sensor.temperature()
        humidity = self.dht_sensor.humidity()
        return temp, humidity
    
    def read_ultrasonic(self):
        """Read distance from ultrasonic sensor (cm) - raises exception on error"""
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
    
    def activate_pump(self, pump_id, duration=WATERING_DURATION):
        """Activate pump for specified duration"""
        try:
            print(f"→ Activating pump {pump_id + 1} for {duration}s")
            print(f"[DEBUG] Setting relay[{pump_id}] to LOW (activate)")
            self.relays[pump_id].value(0)  # Active LOW
            print(f"[DEBUG] Relay activated, sleeping for {duration}s...")
            time.sleep(duration)
            print(f"[DEBUG] Setting relay[{pump_id}] to HIGH (deactivate)")
            self.relays[pump_id].value(1)  # OFF
            self.last_watered[pump_id] = time.time()
            print(f"✓ Pump {pump_id + 1} deactivated")
        except Exception as e:
            print(f"✗ Error activating pump {pump_id}: {e}")
            print(f"[DEBUG] Exception type: {type(e).__name__}")
            print(f"[DEBUG] Ensuring relay {pump_id} is OFF")
            self.relays[pump_id].value(1)  # Ensure OFF on error

# =============================================================================
# FIREBASE COMMUNICATION
# =============================================================================

class FirebaseClient:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.error_count = 0  # Track errors to avoid spam
    
    def log_error(self, error_type, component, message, severity="error"):
        """Log error to Firebase with automatic cleanup"""
        try:
            # Get existing errors
            existing_errors = self.get("systemErrors") or {}
            
            # Create new error entry
            self.error_count += 1
            error_key = f"error_{int(time.time())}_{self.error_count}"
            error_data = {
                "timestamp": int(time.time() * 1000),
                "errorType": error_type,  # "sensor", "pump", "connectivity", "general"
                "component": component,
                "message": message,
                "severity": severity,  # "info", "warning", "error"
                "resolved": False
            }
            
            # Add new error
            existing_errors[error_key] = error_data
            
            # Keep only 10 most recent errors
            if len(existing_errors) > 10:
                # Sort by timestamp and keep newest 10
                sorted_errors = sorted(
                    existing_errors.items(),
                    key=lambda x: x[1]["timestamp"],
                    reverse=True
                )[:10]
                existing_errors = dict(sorted_errors)
            
            # Update Firebase with cleaned error list
            self.put("systemErrors", existing_errors)
            
        except Exception as e:
            print(f"✗ Failed to log error to Firebase: {e}")
    
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
    
    def get_manual_test_trigger(self):
        """Check for manual test trigger"""
        return self.get("manualTest")
    
    def clear_manual_test_trigger(self):
        """Clear manual test trigger"""
        return self.put("manualTest", {"trigger": False, "timestamp": 0})
    
    def update_test_result(self, result):
        """Update test result in Firebase"""
        return self.put("lastTest", result)

# =============================================================================
# MAIN SYSTEM CONTROLLER
# =============================================================================

class WateringSystem:
    def __init__(self, hardware, firebase, eink_display=None):
        self.hw = hardware
        self.fb = firebase
        self.eink = eink_display
        self.settings = None
        self.last_test_time = 0
        self.test_interval = 7 * 24 * 60 * 60  # 7 days in seconds
        self.last_display_status = None  # Track display status to avoid unnecessary updates
    
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
                self.sync_time()
                return True
            else:
                print("\n✗ WiFi connection failed")
                return False
        return True
    
    def is_dst(self, year, month, day, hour):
        """
        Prüft ob Sommerzeit (DST) in Deutschland/EU aktiv ist
        Sommerzeit: letzter Sonntag im März 02:00 bis letzter Sonntag im Oktober 03:00
        """
        # Finde letzten Sonntag im März
        march_last_sunday = 31
        while True:
            # Wochentag berechnen (0=Montag, 6=Sonntag)
            # Vereinfachte Berechnung (Zeller's Congruence)
            if march_last_sunday <= 0:
                break
            m = 3  # März
            y = year
            d = march_last_sunday
            if m < 3:
                m += 12
                y -= 1
            weekday = (d + ((13 * (m + 1)) // 5) + y + (y // 4) - (y // 100) + (y // 400)) % 7
            if weekday == 0:  # Sonntag
                break
            march_last_sunday -= 1
        
        # Finde letzten Sonntag im Oktober
        october_last_sunday = 31
        while True:
            if october_last_sunday <= 0:
                break
            m = 10  # Oktober
            y = year
            d = october_last_sunday
            weekday = (d + ((13 * (m + 1)) // 5) + y + (y // 4) - (y // 100) + (y // 400)) % 7
            if weekday == 0:  # Sonntag
                break
            october_last_sunday -= 1
        
        # Prüfe ob Sommerzeit
        if month < 3 or month > 10:
            return False  # Winterzeit
        elif month > 3 and month < 10:
            return True   # Sommerzeit
        elif month == 3:
            # März: Sommerzeit ab letztem Sonntag 02:00
            if day < march_last_sunday:
                return False
            elif day > march_last_sunday:
                return True
            else:  # Genau am letzten Sonntag
                return hour >= 2
        else:  # month == 10
            # Oktober: Winterzeit ab letztem Sonntag 03:00
            if day < october_last_sunday:
                return True
            elif day > october_last_sunday:
                return False
            else:  # Genau am letzten Sonntag
                return hour < 3
    
    def get_timezone_offset(self):
        """Automatische Erkennung von MEZ (UTC+1) oder MESZ (UTC+2)"""
        # Hole UTC Zeit
        utc = time.localtime(time.time())
        year, month, day, hour = utc[0], utc[1], utc[2], utc[3]
        
        # Prüfe Sommerzeit
        if self.is_dst(year, month, day, hour):
            return 2  # MESZ (Sommerzeit)
        else:
            return 1  # MEZ (Winterzeit)
    
    def sync_time(self):
        """Synchronize time with NTP server"""
        try:
            print("\n" + "="*50)
            print("NTP TIME SYNCHRONIZATION")
            print("="*50)
            print("→ Synchronizing time with NTP server...")
            
            # Get NTP time (returns seconds since 1900, NOT 1970!)
            ntptime.settime()
            
            # DEBUG: Show raw system time after NTP
            raw_time = time.time()
            print(f"[DEBUG] Raw time.time() after ntptime: {raw_time}")
            print(f"[DEBUG] Raw localtime: {time.localtime(raw_time)}")
            
            # Automatische Timezone-Erkennung
            offset_hours = self.get_timezone_offset()
            offset_seconds = offset_hours * 3600
            current_timestamp = time.time() + offset_seconds
            
            # Convert to readable format
            year, month, day, hour, minute, second, _, _ = time.localtime(current_timestamp)
            
            timezone_name = "MESZ (Sommerzeit)" if offset_hours == 2 else "MEZ (Winterzeit)"
            print(f"\n✓ Time synchronized successfully!")
            print(f"  Date/Time: {day:02d}.{month:02d}.{year} {hour:02d}:{minute:02d}:{second:02d}")
            print(f"  Timezone: {timezone_name} (UTC+{offset_hours})")
            print(f"  Unix Timestamp: {int(current_timestamp * 1000)} ms")
            print("="*50 + "\n")
            
        except Exception as e:
            print(f"✗ Time sync failed: {e}")
            print("  Using system time (may be incorrect)")
    
    def get_timestamp(self):
        """Get current timestamp in milliseconds (with timezone offset) - for Firebase"""
        offset_hours = self.get_timezone_offset()
        offset_seconds = offset_hours * 3600
        return int((time.time() + offset_seconds) * 1000)
    
    def get_time(self):
        """Get current time in seconds (with timezone offset) - for calculations"""
        offset_hours = self.get_timezone_offset()
        offset_seconds = offset_hours * 3600
        return time.time() + offset_seconds
    
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
        # Read moisture sensors with error handling
        moisture = []
        for i in range(4):
            try:
                value = self.hw.read_moisture(i)
                moisture.append(value)
            except Exception as e:
                moisture.append(0)
                self.fb.log_error("sensor", f"Moisture Sensor {i+1}", f"{str(e)}", "error")
        
        # Read DHT11 with error handling
        try:
            temp, humidity = self.hw.read_dht11()
            # Log warning if sensor returns zeros (might indicate connection issue)
            if temp == 0 and humidity == 0:
                self.fb.log_error("sensor", "DHT11", "Sensor gibt Nullwerte zurück", "warning")
        except Exception as e:
            temp, humidity = 0, 0
            self.fb.log_error("sensor", "DHT11", f"{str(e)}", "error")
        
        # Read ultrasonic (water level) with error handling
        try:
            distance_cm = self.hw.read_ultrasonic()
        except Exception as e:
            distance_cm = 0
            self.fb.log_error("sensor", "Ultrasonic", f"{str(e)}", "error")
        
        # Calculate water level percentage
        if distance_cm <= TANK_FULL_DISTANCE:
            water_level = 100
        elif distance_cm >= TANK_HEIGHT:
            water_level = 0
        else:
            water_level = 100 - ((distance_cm - TANK_FULL_DISTANCE) * 100 / (TANK_HEIGHT - TANK_FULL_DISTANCE))
        water_level = max(0, min(100, water_level))
        
        return {
            "timestamp": self.get_timestamp(),  # Milliseconds with timezone
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
        print(f"[DEBUG] Manual watering check - command: {command}")
        
        if command and 'plantId' in command:
            plant_id = command['plantId'] - 1  # Convert to 0-indexed
            duration = command.get('duration', WATERING_DURATION)
            print(f"! Manual watering command for plant {plant_id + 1}, duration: {duration}s")
            print(f"[DEBUG] Calling activate_pump({plant_id}, {duration})")
            self.hw.activate_pump(plant_id, duration)
            print(f"[DEBUG] Pump activation complete, clearing command...")
            self.fb.clear_manual_watering()
            print(f"[DEBUG] Manual watering command cleared")
        elif command:
            print(f"[DEBUG] Command exists but missing plantId: {command}")
    
    def check_manual_test_trigger(self):
        """Check if manual test was triggered from website"""
        trigger_data = self.fb.get_manual_test_trigger()
        if trigger_data and trigger_data.get('trigger'):
            print("! Manual system test triggered from website")
            # Clear trigger immediately to prevent repeated execution
            self.fb.clear_manual_test_trigger()
            # Execute test and update last test time
            self.execute_system_test()
            self.last_test_time = self.get_time()  # Prevent immediate weekly test
    
    def run_daily_pump4_maintenance(self):
        """Run pump 4 daily for 10 seconds if only 3 plants active"""
        if self.settings and self.settings['numberOfPlants'] == 3:
            current_time = self.get_time()  # Get time in seconds with timezone
            # Run once per day (86400 seconds)
            if current_time - self.hw.last_pump4_run > 86400:
                print("→ Running daily pump 4 maintenance")
                self.hw.activate_pump(3, PUMP_4_DAILY_RUN)
                self.hw.last_pump4_run = current_time
    
    def update_display(self, sensor_data):
        """Update E-Ink display with system status (only if status changed)"""
        if not self.eink:
            return  # Display not available
        
        # Determine status based on sensor data
        status = "ok"
        if sensor_data:
            # Check water level
            if sensor_data['waterLevel'] < 20:
                status = "warning"
            
            # Check moisture levels
            if self.settings:
                for i in range(self.settings['numberOfPlants']):
                    profile = self.settings['plantProfiles'][i]
                    moisture = sensor_data['plantMoisture'][i]
                    if moisture < profile['moistureMin']:
                        status = "warning"
                        break
        
        # Only update display if status changed (saves power)
        if status != self.last_display_status:
            try:
                print(f"→ Updating E-Ink display: {status}")
                self.draw_status_icon_on_eink(status)
                self.last_display_status = status
            except Exception as e:
                print(f"✗ E-Ink display update failed: {e}")
    
    def draw_status_icon_on_eink(self, status):
        """Draw status icon on E-Ink display (200x200 pixels)"""
        # Create frame buffers (200x200 = 5000 bytes)
        frame_black = bytearray(5000)
        frame_red = bytearray(5000)
        
        # Fill with white (0xFF = white)
        for i in range(5000):
            frame_black[i] = 0xFF
            frame_red[i] = 0x00
        
        # Draw status icon in center (100, 100)
        center_x = 100
        center_y = 100
        radius = 40
        
        if status == "ok":
            # Draw black filled circle for OK status
            self.eink.draw_filled_circle(frame_black, center_x, center_y, radius, 1)
        elif status == "warning":
            # Draw red filled circle for warning
            self.eink.draw_filled_circle(frame_red, center_x, center_y, radius, 1)
        else:  # error
            # Draw red filled circle for error
            self.eink.draw_filled_circle(frame_red, center_x, center_y, radius, 1)
        
        # Display the frame
        self.eink.display_frame(frame_black, frame_red)
    
    def execute_system_test(self):
        """Execute the actual system test (called by both weekly and manual triggers)"""
        print("=" * 50)
        print("STARTING SYSTEM TEST")
        print("=" * 50)
        
        result = {
            "timestamp": self.get_timestamp(),  # Milliseconds with timezone
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
        
        print("=" * 50)
        print(f"TEST COMPLETE: {result['overallStatus'].upper()}")
        print("=" * 50)
    
    def run_system_test(self):
        """Run weekly system test (scheduled)"""
        current_time = self.get_time()  # Get time in seconds with timezone
        if current_time - self.last_test_time < self.test_interval:
            return
        
        # Execute test and update last test time
        self.execute_system_test()
        self.last_test_time = current_time
    
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
        
        # Run automatic system test on startup
        print("\n→ Running automatic system test after restart...")
        self.execute_system_test()
        self.last_test_time = self.get_time()  # Prevent immediate weekly test
        
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
                    "lastUpdate": self.get_timestamp(),  # Milliseconds with timezone
                    "displayStatus": "ok"  # Can be "ok", "warning", "error"
                }
                
                # Check water level
                if sensor_data['waterLevel'] < 20:
                    status['displayStatus'] = "warning"
                
                self.fb.update_system_status(status)
                
                # Check for manual watering commands
                self.check_manual_watering()
                
                # Check for manual test trigger from website
                self.check_manual_test_trigger()
                
                # Auto-watering based on moisture levels
                self.check_and_water(sensor_data)
                
                # Daily pump 4 maintenance
                self.run_daily_pump4_maintenance()
                
                # Weekly system test (scheduled)
                self.run_system_test()
                
                # Reload settings (in case they changed)
                self.load_settings()
                
                # Update E-Ink display
                self.update_display(sensor_data)
                
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
    
    # Initialize E-Ink Display (optional - comment out if not connected)
    eink = None  # Default: no display
    print("\n→ Attempting E-Ink display initialization...")
    
    try:
        print("[DEBUG] Creating SPI bus for E-Ink...")
        # Create SPI bus (using VSPI pins on ESP32-S3)
        spi = SPI(2, baudrate=4000000, polarity=0, phase=0,
                  sck=Pin(EINK_CLK), mosi=Pin(EINK_MOSI))
        
        print("[DEBUG] Creating Pin objects for E-Ink...")
        cs_pin = Pin(EINK_CS)
        dc_pin = Pin(EINK_DC)
        rst_pin = Pin(EINK_RST)
        busy_pin = Pin(EINK_BUSY)
        
        print("[DEBUG] Creating EPD instance...")
        eink = EPD(spi, cs_pin, dc_pin, rst_pin, busy_pin)
        
        print("[DEBUG] Initializing E-Ink display...")
        eink.init()
        
        print("[DEBUG] Clearing E-Ink display...")
        # Create empty frame buffers (200x200 = 5000 bytes)
        frame_black = bytearray(5000)
        frame_red = bytearray(5000)
        # Fill with white (0xFF = white)
        for i in range(5000):
            frame_black[i] = 0xFF
            frame_red[i] = 0x00
        eink.display_frame(frame_black, frame_red)
        
        print("✓ E-Ink display ready")
    except Exception as e:
        print(f"⚠ E-Ink display initialization failed: {e}")
        print("  Continuing without display...")
        eink = None
    
    # Create and run watering system
    system = WateringSystem(hardware, firebase, eink)
    system.run()

if __name__ == "__main__":
    main()
