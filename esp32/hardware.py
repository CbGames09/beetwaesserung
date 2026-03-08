# Hardware Controller für ESP32-S3 Bewässerungssystem
import time
from machine import Pin, ADC
import dht
from neopixel import NeoPixel

class HardwareController:
    def __init__(self, config):
        """Initialize hardware with configuration (power-optimized)"""
        self.config = config
        self.system = None  # Will be set by WateringSystem
        
        # Initialize moisture sensors (ADC)
        self.moisture_adcs = [ADC(Pin(pin)) for pin in config['MOISTURE_PINS']]
        for adc in self.moisture_adcs:
            adc.atten(ADC.ATTN_11DB)  # Full range 0-3.3V
        
        # Initialize DHT11
        self.dht_sensor = dht.DHT11(Pin(config['DHT_PIN']))
        self.dht_last_read = 0  # Cache DHT reads - they're slow
        self.dht_cache = (0.0, 0.0)  # (temp, humidity)
        self.dht_cache_interval = 5  # Cache DHT for 5 seconds min (sensor is slow anyway)
        
        # Initialize Ultrasonic Sensor
        self.trigger = Pin(config['ULTRASONIC_TRIGGER'], Pin.OUT)
        self.echo = Pin(config['ULTRASONIC_ECHO'], Pin.IN)
        
        # Initialize Relays (active LOW for most relay modules)
        self.relays = [Pin(pin, Pin.OUT, value=1) for pin in config['RELAY_PINS']]
        
        # Initialize Motion Sensor (PIR) - Digital Input
        self.motion_sensor = Pin(config['MOTION_SENSOR_PIN'], Pin.IN)
        
        # Initialize LED Ring (24-bit WS2812B / NeoPixel) - turn OFF by default to save power
        try:
            self.led_ring = NeoPixel(Pin(config['LED_RING_PIN'], Pin.OUT), config['LED_RING_COUNT'])
            self.led_ring.fill((0, 0, 0))  # All LEDs OFF
            self.led_ring.write()
        except Exception as e:
            print(f"⚠ LED Ring initialization failed: {e}")
            self.led_ring = None
        
        # Last watered timestamps
        self.last_watered = [0, 0, 0, 0]
        self.last_pump4_run = 0
        
        print("✓ Hardware initialized (power-optimized)")
    
    def read_moisture(self, sensor_id):
        """Read moisture sensor (0-100%) - raises exception on error"""
        try:
            raw = self.moisture_adcs[sensor_id].read()
            # Calibration: 4095 (dry) -> 0%, 1200 (wet) -> 100%
            dry_value = 4095
            wet_value = 1200
            moisture = 100 - ((raw - wet_value) * 100 / (dry_value - wet_value))
            return max(0, min(100, moisture))
        except Exception as e:
            raise Exception(f"Moisture sensor {sensor_id} read failed: {e}")
    
    def read_dht11(self):
        """Read temperature and humidity from DHT11 with caching - raises exception on error"""
        try:
            current_time = time.time()
            
            # Return cached value if recent (DHT11 can't update faster than ~2 seconds anyway)
            if (current_time - self.dht_last_read) < self.dht_cache_interval:
                return self.dht_cache
            
            self.dht_sensor.measure()
            temp = self.dht_sensor.temperature()
            humidity = self.dht_sensor.humidity()
            
            # Update cache
            self.dht_cache = (temp, humidity)
            self.dht_last_read = current_time
            
            return temp, humidity
        except Exception as e:
            # Return cached value on error instead of failing completely
            return self.dht_cache
    
    def read_ultrasonic(self):
        """Read distance from ultrasonic sensor (cm) - raises exception on error"""
        try:
            self.trigger.value(0)
            time.sleep_us(2)
            self.trigger.value(1)
            time.sleep_us(10)
            self.trigger.value(0)
            
            # Timeout after 30ms (max distance ~5m)
            timeout = 30000
            pulse_start = time.ticks_us()
            
            while self.echo.value() == 0:
                if time.ticks_diff(time.ticks_us(), pulse_start) > timeout:
                    raise Exception("Echo timeout (start)")
                pulse_start = time.ticks_us()
            
            pulse_end = time.ticks_us()
            while self.echo.value() == 1:
                if time.ticks_diff(time.ticks_us(), pulse_start) > timeout:
                    raise Exception("Echo timeout (end)")
                pulse_end = time.ticks_us()
            
            pulse_duration = time.ticks_diff(pulse_end, pulse_start)
            distance = (pulse_duration * 0.0343) / 2
            
            return distance
        except Exception as e:
            raise Exception(f"Ultrasonic read failed: {e}")
    
    def activate_pump(self, pump_id, duration):
        """Activate pump for specified duration (seconds)"""
        try:
            print(f"  → Activating pump {pump_id + 1} for {duration}s")
            self.relays[pump_id].value(0)  # Relay ON (active LOW)
            time.sleep(duration)
            self.relays[pump_id].value(1)  # Relay OFF
            print(f"  ✓ Pump {pump_id + 1} done")
            
            # Update timestamp
            if self.system:
                self.last_watered[pump_id] = self.system.get_timestamp()
            return True
        except Exception as e:
            print(f"  ✗ Pump {pump_id + 1} activation failed: {e}")
            # Make sure relay is OFF even on error
            try:
                self.relays[pump_id].value(1)
            except:
                pass
            return False
