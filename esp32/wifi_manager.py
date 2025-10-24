# WiFi Manager mit Auto-Reconnect
import network
import time

class WiFiManager:
    def __init__(self, ssid, password):
        """Initialize WiFi manager"""
        self.ssid = ssid
        self.password = password
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        self.last_check = 0
        self.reconnect_interval = 30  # Check every 30 seconds
        
    def is_connected(self):
        """Check if WiFi is connected"""
        return self.wlan.isconnected()
    
    def connect(self, timeout=20):
        """Connect to WiFi with timeout"""
        if self.wlan.isconnected():
            print(f"✓ WiFi already connected: {self.wlan.ifconfig()[0]}")
            return True
        
        print(f"→ Connecting to WiFi: {self.ssid}")
        self.wlan.connect(self.ssid, self.password)
        
        start_time = time.time()
        while not self.wlan.isconnected() and (time.time() - start_time) < timeout:
            time.sleep(1)
            print(".", end="")
        
        if self.wlan.isconnected():
            print(f"\n✓ WiFi connected: {self.wlan.ifconfig()[0]}")
            return True
        else:
            print("\n✗ WiFi connection timeout")
            return False
    
    def ensure_connection(self):
        """
        Ensure WiFi is connected - auto-reconnect if needed
        Returns True if connected, False otherwise
        """
        current_time = time.time()
        
        # Only check every reconnect_interval seconds to avoid spam
        if current_time - self.last_check < self.reconnect_interval:
            return self.is_connected()
        
        self.last_check = current_time
        
        if not self.is_connected():
            print("\n⚠ WiFi disconnected - attempting reconnect...")
            return self.connect()
        
        return True
    
    def disconnect(self):
        """Disconnect from WiFi"""
        if self.wlan.isconnected():
            self.wlan.disconnect()
            print("✓ WiFi disconnected")
