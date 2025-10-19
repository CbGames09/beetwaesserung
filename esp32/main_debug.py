# ESP32-S3 Automatic Plant Watering System
# MicroPython Implementation - DEBUG VERSION
# 
# This version does NOT auto-start!
# To run: import main_debug; main_debug.start()

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
# Moisture Sensors (Analog) - ESP32-S3 ADC1 Pins (WiFi compatible!)
# IMPORTANT: ESP32-S3 ADC1 = GPIO 1-10, ADC2 = GPIO 11-20
# ADC2 does NOT work with WiFi! Use ADC1 pins only!
# ⚠️ WARNING: GPIO 0, 1, 2, 3 are STRAPPING PINS - do NOT use for ADC!
MOISTURE_PINS = [4, 5, 6, 7]  # GPIO pins for ADC (ADC1_CH3, CH4, CH5, CH6)

# DHT11 Sensor
DHT_PIN = 8  # Changed to avoid ADC pin conflict

# Ultrasonic Sensor
ULTRASONIC_TRIGGER = 9
ULTRASONIC_ECHO = 10

# Relay Pins (for pumps) - Using safe GPIO pins
RELAY_PINS = [11, 12, 13, 14]

# E-Ink Display (SPI) - Using safe GPIO pins
EINK_CS = 38
EINK_DC = 39
EINK_RST = 40
EINK_BUSY = 41

# Water Tank Configuration (in cm)
TANK_DIAMETER = 20
TANK_HEIGHT = 30
TANK_FULL_DISTANCE = 5  # Distance from sensor to full tank (cm)

# System Configuration
MEASUREMENT_INTERVAL = 300  # Default: 5 minutes (will be overridden from Firebase)
WATERING_DURATION = 10  # Default watering duration in seconds
PUMP_4_DAILY_RUN = 10  # Pump 4 runs for 10 seconds daily when only 3 plants active

print("✓ Configuration loaded (debug mode - manual start)")

# =============================================================================
# TEST FUNCTIONS - Use these to test individual components
# =============================================================================

def test_wifi():
    """Test WiFi connection"""
    print("→ Testing WiFi...")
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        print(f"✓ WiFi already connected: {wlan.ifconfig()[0]}")
    else:
        print(f"→ Connecting to {WIFI_SSID}...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        timeout = 20
        while not wlan.isconnected() and timeout > 0:
            print(".", end="")
            time.sleep(1)
            timeout -= 1
        print()
        if wlan.isconnected():
            print(f"✓ WiFi connected: {wlan.ifconfig()[0]}")
        else:
            print("✗ WiFi connection failed")

def test_moisture_sensors():
    """Test all moisture sensors"""
    print("→ Testing moisture sensors...")
    try:
        adcs = [ADC(Pin(pin)) for pin in MOISTURE_PINS]
        for adc in adcs:
            adc.atten(ADC.ATTN_11DB)
        
        for i, adc in enumerate(adcs):
            raw = adc.read()
            print(f"  Sensor {i+1} (GPIO {MOISTURE_PINS[i]}): {raw} (raw)")
        print("✓ Moisture sensors OK")
    except Exception as e:
        print(f"✗ Moisture sensor error: {e}")

def test_dht11():
    """Test DHT11 sensor"""
    print("→ Testing DHT11...")
    try:
        sensor = dht.DHT11(Pin(DHT_PIN))
        sensor.measure()
        temp = sensor.temperature()
        humidity = sensor.humidity()
        print(f"  Temperature: {temp}°C")
        print(f"  Humidity: {humidity}%")
        print("✓ DHT11 OK")
    except Exception as e:
        print(f"✗ DHT11 error: {e}")

def test_ultrasonic():
    """Test ultrasonic sensor"""
    print("→ Testing ultrasonic...")
    try:
        trigger = Pin(ULTRASONIC_TRIGGER, Pin.OUT)
        echo = Pin(ULTRASONIC_ECHO, Pin.IN)
        
        trigger.value(0)
        time.sleep_us(2)
        trigger.value(1)
        time.sleep_us(10)
        trigger.value(0)
        
        timeout = 30000
        start = time.ticks_us()
        while echo.value() == 0 and time.ticks_diff(time.ticks_us(), start) < timeout:
            pass
        time_start = time.ticks_us()
        
        while echo.value() == 1 and time.ticks_diff(time.ticks_us(), start) < timeout:
            pass
        time_end = time.ticks_us()
        
        duration = time.ticks_diff(time_end, time_start)
        distance = (duration * 0.0343) / 2
        print(f"  Distance: {distance:.1f} cm")
        print("✓ Ultrasonic OK")
    except Exception as e:
        print(f"✗ Ultrasonic error: {e}")

def test_relays():
    """Test all relays (brief pulse)"""
    print("→ Testing relays...")
    try:
        relays = [Pin(pin, Pin.OUT, value=1) for pin in RELAY_PINS]
        
        for i, relay in enumerate(relays):
            print(f"  Testing relay {i+1} (GPIO {RELAY_PINS[i]})...")
            relay.value(0)  # ON
            time.sleep(0.5)
            relay.value(1)  # OFF
            time.sleep(0.5)
        
        print("✓ Relays OK")
    except Exception as e:
        print(f"✗ Relay error: {e}")

def test_firebase():
    """Test Firebase connection"""
    print("→ Testing Firebase...")
    try:
        url = f"{FIREBASE_URL}/systemStatus.json"
        response = requests.get(url)
        if response.status_code == 200:
            print(f"✓ Firebase connected")
            print(f"  Status: {response.json()}")
        else:
            print(f"✗ Firebase error: {response.status_code}")
        response.close()
    except Exception as e:
        print(f"✗ Firebase error: {e}")

def run_all_tests():
    """Run all hardware tests"""
    print("="*40)
    print("ESP32-S3 Hardware Test Suite")
    print("="*40)
    test_wifi()
    test_moisture_sensors()
    test_dht11()
    test_ultrasonic()
    test_relays()
    test_firebase()
    print("="*40)
    print("Tests complete!")
    print("="*40)

# =============================================================================
# USAGE INSTRUCTIONS
# =============================================================================

print("""
DEBUG MODE COMMANDS:
  test_wifi()            - Test WiFi connection
  test_moisture_sensors() - Test all moisture sensors
  test_dht11()           - Test DHT11 sensor
  test_ultrasonic()      - Test ultrasonic sensor
  test_relays()          - Test all relays
  test_firebase()        - Test Firebase connection
  run_all_tests()        - Run all tests
  
  To start the full system, rename this file to main.py
  or run: import main; main.main()
""")
