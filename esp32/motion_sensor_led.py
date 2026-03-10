# Motion Sensor LED Ring Controller
# Energy-optimized with debouncing, error handling, and fallback support
# - Completely powers down LED after display
# - Debounced motion detection with cooldown
# - WiFi error signaling support
# - Graceful fallback if NeoPixel unavailable

import time
from machine import Pin, deepsleep

class MotionSensorLED:
    def __init__(self, hardware_controller, watering_system):
        """Initialize Motion Sensor LED controller"""
        self.hw = hardware_controller
        self.sys = watering_system
        self.led_ring = hardware_controller.led_ring
        self.motion_pin = hardware_controller.motion_sensor
        
        # LED Configuration
        self.led_count = 24
        self.segment_leds = self.led_count // 4  # 6 LEDs per quadrant
        
        # State tracking
        self.last_motion_time = 0
        self.motion_cooldown = 180  # 3 minutes in seconds
        self.is_on_cooldown = False
        self.motion_trigger_count_last_display = 0  # Track triggers between displays
        
        # Colors for visualization
        self.COLOR_WATER_FILL = (0, 100, 200)  # Blue for water level
        self.COLOR_PLANT1 = (100, 200, 50)    # Green for plant 1
        self.COLOR_PLANT2 = (150, 150, 50)    # Yellow for plant 2
        self.COLOR_PLANT3 = (200, 100, 50)    # Orange for plant 3
        self.COLOR_PLANT4 = (200, 50, 100)    # Pink/Purple for plant 4
        self.COLOR_OFF = (0, 0, 0)            # Off
        self.COLOR_WIFI_ERROR = (255, 0, 0)   # Red for WiFi errors
        
        # Last sensor data cache for LED display
        self._last_sensor_data = None
        
        print("✓ Motion Sensor LED Controller initialized (optimized)")
    
    def _hsv_to_rgb(self, h, s, v):
        """Convert HSV to RGB for better color range"""
        c = v * s
        x = c * (1 - abs((h / 60) % 2 - 1))
        m = v - c
        
        if h < 60:
            r, g, b = c, x, 0
        elif h < 120:
            r, g, b = x, c, 0
        elif h < 180:
            r, g, b = 0, c, x
        elif h < 240:
            r, g, b = 0, x, c
        elif h < 300:
            r, g, b = x, 0, c
        else:
            r, g, b = c, 0, x
        
        return (
            int((r + m) * 255),
            int((g + m) * 255),
            int((b + m) * 255)
        )
    
    def _set_quadrant(self, quadrant, color, brightness=1.0):
        """Set all LEDs in a quadrant to a color
        quadrant: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
        """
        if not self.led_ring:
            return
        
        start_idx = quadrant * self.segment_leds
        end_idx = start_idx + self.segment_leds
        
        # Apply brightness
        r, g, b = color
        r = int(r * brightness)
        g = int(g * brightness)
        b = int(b * brightness)
        
        for i in range(start_idx, end_idx):
            self.led_ring[i] = (r, g, b)
    
    def _clear_ring(self):
        """Turn off all LEDs"""
        if not self.led_ring:
            return
        try:
            self.led_ring.fill((0, 0, 0))
            self.led_ring.write()
        except Exception as e:
            print(f"⚠ LED clear error: {e}")
    
    def _power_down_ring(self):
        """Completely power down LED ring after display"""
        if not self.led_ring:
            return
        try:
            self._clear_ring()
            # Call hardware power-down if available
            if hasattr(self.hw, 'power_down_led_ring'):
                self.hw.power_down_led_ring()
        except Exception as e:
            print(f"⚠ LED power-down error: {e}")
    
    def _fill_ring_clockwise(self, color, duration=15):
        """Fill ring clockwise from bottom to top gradually
        duration: total time in seconds
        """
        if not self.led_ring:
            return
        
        try:
            self._clear_ring()
            steps = self.led_count
            delay = duration / steps
            
            for i in range(steps):
                for j in range(i + 1):
                    self.led_ring[j] = color
                self.led_ring.write()
                time.sleep(delay)
        except Exception as e:
            print(f"⚠ LED fill error: {e}")
    
    def show_water_level(self, water_level_percent):
        """Show water level as filling circle (0-100%)
        water_level_percent: 0-100
        """
        if not self.led_ring or water_level_percent < 0:
            return
        
        try:
            print(f"  → Showing water level: {water_level_percent}%")
            self._clear_ring()
            
            # Calculate how many LEDs to fill based on water level
            leds_to_fill = int((water_level_percent / 100) * self.led_count)
            leds_to_fill = max(1, min(self.led_count, leds_to_fill))
            
            # Fill LEDs one by one in clockwise direction (slow animation)
            color = self.COLOR_WATER_FILL
            step_duration = 0.3  # 300ms per LED
            
            for i in range(leds_to_fill):
                self.led_ring[i] = color
                self.led_ring.write()
                time.sleep(step_duration)
        except Exception as e:
            print(f"⚠ Water level display error: {e}")
    
    def show_soil_moisture(self, moisture_values):
        """Show soil moisture in 4 quadrants
        moisture_values: [plant1, plant2, plant3, plant4] (0-100)
        """
        if not self.led_ring or not self.sys.settings:
            return
        
        try:
            colors = [
                self.COLOR_PLANT1,
                self.COLOR_PLANT2,
                self.COLOR_PLANT3,
                self.COLOR_PLANT4
            ]
            
            plant_names = ["Plant 1", "Plant 2", "Plant 3", "Plant 4"]
            
            # Show each quadrant blinking (3 seconds each)
            for i in range(4):
                print(f"  → Showing {plant_names[i]}: {moisture_values[i]}%")
                
                # Blink effect: on-off-on-off during 3 seconds
                blink_duration = 0.5  # 500ms per blink
                total_blinks = int(3.0 / (blink_duration * 2))  # 3 seconds total
                
                for _ in range(total_blinks):
                    # LED ON with brightness based on moisture level
                    brightness = 0.3 + (moisture_values[i] / 100) * 0.7
                    self._set_quadrant(i, colors[i], brightness)
                    self.led_ring.write()
                    time.sleep(blink_duration)
                    
                    # LED OFF
                    self._set_quadrant(i, self.COLOR_OFF)
                    self.led_ring.write()
                    time.sleep(blink_duration)
            
            # Show all quadrants together at full brightness (representative of overall moisture)
            print(f"  → Showing all plants combined")
            avg_moisture = sum(moisture_values) / 4
            avg_brightness = 0.3 + (avg_moisture / 100) * 0.7
            
            for i in range(4):
                self._set_quadrant(i, colors[i], avg_brightness)
            self.led_ring.write()
            time.sleep(3)  # Show for 3 seconds
        except Exception as e:
            print(f"⚠ Soil moisture display error: {e}")
    
    def show_complete_sequence(self, sensor_data):
        """Show complete sequence: water level + soil moisture
        sensor_data: dictionary with 'waterLevel', 'waterLevelCm', 'plantMoisture'
        """
        if not self.led_ring:
            print("⚠ LED Ring not available - skipping display")
            return False
        
        try:
            # Step 1: Show water level (fills ring clockwise)
            water_level = sensor_data.get('waterLevel', 0)
            self.show_water_level(water_level)
            time.sleep(1)
            
            # Step 2: Show soil moisture in quadrants
            moisture_values = sensor_data.get('plantMoisture', [0, 0, 0, 0])
            self.show_soil_moisture(moisture_values)
            
            # Step 3: Power down LED ring to save energy
            self._power_down_ring()
            
            return True
        except Exception as e:
            print(f"✗ Error showing LED sequence: {e}")
            self._power_down_ring()
            return False
    
    def show_wifi_error(self):
        """Display WiFi error signal on LED ring"""
        if not self.led_ring:
            return
        
        try:
            print("  → Showing WiFi error signal (red blinks)")
            # Red blinking pattern
            for _ in range(3):
                self._clear_ring()
                self.led_ring.fill(self.COLOR_WIFI_ERROR)
                self.led_ring.write()
                time.sleep(0.3)
                self._clear_ring()
                time.sleep(0.2)
            self._power_down_ring()
        except Exception as e:
            print(f"⚠ WiFi error display failed: {e}")
    
    def can_trigger(self):
        """Check if motion sensor can trigger (not in cooldown)
        Ignores multiple triggers within cooldown window
        """
        current_time = time.time()
        if self.is_on_cooldown:
            elapsed = current_time - self.last_motion_time
            if elapsed >= self.motion_cooldown:
                self.is_on_cooldown = False
                self.motion_trigger_count_last_display = 0
                print("✓ Motion sensor cooldown expired")
                return True
            else:
                remaining = self.motion_cooldown - elapsed
                print(f"⏳ Motion sensor cooldown: {remaining:.0f}s remaining ({self.motion_trigger_count_last_display} triggers ignored)")
                return False
        return True
    
    def handle_motion_detected(self, sensor_data):
        """Handle motion detection - show LED sequence
        sensor_data: current sensor data to display
        """
        if not self.can_trigger():
            self.motion_trigger_count_last_display += 1
            print(f"⚠ Motion detected but cooldown active (ignored)")
            return False
        
        print("\n" + "="*50)
        print("MOTION DETECTED - DISPLAYING LED SEQUENCE")
        print("="*50 + "\n")
        
        # Show the complete LED sequence
        success = self.show_complete_sequence(sensor_data)
        
        if success:
            # Set cooldown
            self.last_motion_time = time.time()
            self.is_on_cooldown = True
            self.motion_trigger_count_last_display = 0
            print(f"✓ LED sequence complete, cooldown for {self.motion_cooldown}s\n")
            return True
        else:
            print("✗ LED sequence failed\n")
            return False


class MotionSensorInterrupt:
    """Manages motion sensor as interrupt for deep sleep wake-up
    With debouncing to prevent false triggers from sensor noise
    """
    
    def __init__(self, motion_pin, callback=None):
        """Initialize motion sensor interrupt
        motion_pin: Pin object for motion sensor
        callback: function to call when motion is detected
        """
        self.motion_pin = motion_pin
        self.callback = callback
        self.is_armed = False
        self.was_motion_wake = False  # Flag to track if woke from motion
        
        # Debounce state
        self.last_interrupt_time = 0
        self.debounce_ms = 100  # 100ms debounce between interrupts
        self.valid_triggers = 0
        
        print("✓ Motion Sensor Interrupt handler initialized (with debouncing)")
    
    def arm(self):
        """Arm motion sensor for interrupt during deep sleep"""
        try:
            # Configure pin interrupt (rising edge - HIGH when motion detected)
            self.motion_pin.irq(trigger=Pin.IRQ_RISING, handler=self._isr_handler)
            self.is_armed = True
            self.valid_triggers = 0
            print("✓ Motion sensor armed for deep sleep interrupt")
            return True
        except Exception as e:
            print(f"✗ Failed to arm motion sensor interrupt: {e}")
            return False
    
    def disarm(self):
        """Disarm motion sensor interrupt"""
        try:
            self.motion_pin.irq(handler=None)
            self.is_armed = False
            print("✓ Motion sensor disarmed")
            return True
        except Exception as e:
            print(f"✗ Failed to disarm motion sensor: {e}")
            return False
    
    def _isr_handler(self, pin):
        """Interrupt handler - called when motion is detected
        Implements debouncing to filter false triggers
        """
        current_time = time.ticks_ms()
        time_diff = time.ticks_diff(current_time, self.last_interrupt_time)
        
        # Debounce: only count if enough time has passed
        if time_diff >= self.debounce_ms:
            self.was_motion_wake = True
            self.valid_triggers += 1
            self.last_interrupt_time = current_time
            print(f"✓ Motion interrupt triggered (debounced) [#{self.valid_triggers}]")
            
            if self.callback:
                try:
                    self.callback()
                except Exception as e:
                    print(f"✗ Motion callback error: {e}")
    
    def check_and_clear_motion_wake(self):
        """Check if device woke from motion, clear flag, return status"""
        was_motion = self.was_motion_wake
        self.was_motion_wake = False
        return was_motion


def integrate_with_main_system(watering_system, hardware_controller):
    """Integration helper for main.py
    Call this in main.py to add motion sensor LED control
    """
    try:
        # Create LED controller
        led_controller = MotionSensorLED(hardware_controller, watering_system)
        
        # Create interrupt handler
        interrupt_handler = MotionSensorInterrupt(
            hardware_controller.motion_sensor,
            callback=None  # Callback will be set based on system state
        )
        
        print("✓ Motion Sensor LED system integrated with main")
        return led_controller, interrupt_handler
    except Exception as e:
        print(f"✗ Failed to integrate motion sensor LED system: {e}")
        return None, None
