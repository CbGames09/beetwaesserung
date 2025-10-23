"""
Waveshare 1.54" 3-Color E-Ink Display Driver
Resolution: 200x200 pixels
Colors: Black, White, Red

Based on Waveshare documentation for 1.54inch e-Paper Module (B)
"""

import time
from machine import Pin, SPI

# Display resolution
EPD_WIDTH = 200
EPD_HEIGHT = 200

# Display commands
PANEL_SETTING = 0x00
POWER_SETTING = 0x01
POWER_OFF = 0x02
POWER_ON = 0x04
BOOSTER_SOFT_START = 0x06
DEEP_SLEEP = 0x07
DATA_START_TRANSMISSION_1 = 0x10
DATA_STOP = 0x11
DISPLAY_REFRESH = 0x12
DATA_START_TRANSMISSION_2 = 0x13
VCOM_LUT = 0x20
W2W_LUT = 0x21
B2W_LUT = 0x22
W2B_LUT = 0x23
B2B_LUT = 0x24
PLL_CONTROL = 0x30
TEMPERATURE_CALIBRATION = 0x41
VCOM_AND_DATA_INTERVAL_SETTING = 0x50
TCON_SETTING = 0x60
RESOLUTION_SETTING = 0x61
GET_STATUS = 0x71


class WaveshareEPD:
    def __init__(self, spi_id, clk_pin, mosi_pin, cs_pin, dc_pin, rst_pin, busy_pin):
        """
        Initialize E-Ink display
        
        Args:
            spi_id: SPI bus ID (1 or 2)
            clk_pin: Clock pin (SCK)
            mosi_pin: Data pin (MOSI/DIN)
            cs_pin: Chip Select pin
            dc_pin: Data/Command pin
            rst_pin: Reset pin
            busy_pin: Busy signal pin
        """
        # Initialize SPI
        self.spi = SPI(spi_id, baudrate=4000000, polarity=0, phase=0,
                       sck=Pin(clk_pin), mosi=Pin(mosi_pin))
        
        # Initialize control pins
        self.cs = Pin(cs_pin, Pin.OUT, value=1)
        self.dc = Pin(dc_pin, Pin.OUT, value=0)
        self.rst = Pin(rst_pin, Pin.OUT, value=1)
        self.busy = Pin(busy_pin, Pin.IN)
        
        self.width = EPD_WIDTH
        self.height = EPD_HEIGHT
        
        print("✓ E-Ink display initialized")
    
    def _send_command(self, command):
        """Send command to display"""
        self.dc.value(0)
        self.cs.value(0)
        self.spi.write(bytearray([command]))
        self.cs.value(1)
    
    def _send_data(self, data):
        """Send data to display"""
        self.dc.value(1)
        self.cs.value(0)
        self.spi.write(bytearray([data]))
        self.cs.value(1)
    
    def _wait_until_idle(self):
        """Wait until display is idle"""
        while self.busy.value() == 1:
            time.sleep_ms(10)
    
    def reset(self):
        """Hardware reset"""
        self.rst.value(1)
        time.sleep_ms(200)
        self.rst.value(0)
        time.sleep_ms(10)
        self.rst.value(1)
        time.sleep_ms(200)
    
    def init(self):
        """Initialize display settings"""
        self.reset()
        
        self._send_command(BOOSTER_SOFT_START)
        self._send_data(0x17)
        self._send_data(0x17)
        self._send_data(0x17)
        
        self._send_command(POWER_ON)
        self._wait_until_idle()
        
        self._send_command(PANEL_SETTING)
        self._send_data(0x8F)
        
        self._send_command(VCOM_AND_DATA_INTERVAL_SETTING)
        self._send_data(0x77)
        
        self._send_command(TCON_SETTING)
        self._send_data(0x22)
        
        self._send_command(RESOLUTION_SETTING)
        self._send_data(0xC8)  # 200
        self._send_data(0x00)
        self._send_data(0xC8)  # 200
        
        self._send_command(PLL_CONTROL)
        self._send_data(0x3C)
        
        print("✓ E-Ink display configured")
    
    def display_frame(self, frame_black, frame_red):
        """
        Display frame on E-Ink
        
        Args:
            frame_black: bytearray for black pixels (1 = black, 0 = white)
            frame_red: bytearray for red pixels (1 = red, 0 = no red)
        """
        if frame_black:
            self._send_command(DATA_START_TRANSMISSION_1)
            for i in range(0, int(self.width * self.height / 8)):
                self._send_data(frame_black[i])
        
        if frame_red:
            self._send_command(DATA_START_TRANSMISSION_2)
            for i in range(0, int(self.width * self.height / 8)):
                self._send_data(frame_red[i])
        
        self._send_command(DISPLAY_REFRESH)
        self._wait_until_idle()
    
    def clear(self):
        """Clear display (all white)"""
        frame_size = int(self.width * self.height / 8)
        frame_black = bytearray([0x00] * frame_size)  # All white
        frame_red = bytearray([0x00] * frame_size)    # No red
        self.display_frame(frame_black, frame_red)
    
    def sleep(self):
        """Put display in deep sleep mode"""
        self._send_command(POWER_OFF)
        self._wait_until_idle()
        self._send_command(DEEP_SLEEP)
        self._send_data(0xA5)
    
    def draw_status_icon(self, status="ok"):
        """
        Draw simple status icon in center of display
        
        Args:
            status: "ok", "warning", or "error"
        """
        frame_size = int(self.width * self.height / 8)
        frame_black = bytearray([0x00] * frame_size)
        frame_red = bytearray([0x00] * frame_size)
        
        # Draw a simple circle (40x40 pixels) in center
        center_x = 100
        center_y = 100
        radius = 20
        
        for y in range(center_y - radius, center_y + radius):
            for x in range(center_x - radius, center_x + radius):
                # Check if inside circle
                if (x - center_x)**2 + (y - center_y)**2 <= radius**2:
                    byte_index = (y * self.width + x) // 8
                    bit_index = 7 - ((y * self.width + x) % 8)
                    
                    if status == "ok":
                        # Black circle for OK
                        frame_black[byte_index] |= (1 << bit_index)
                    elif status == "warning":
                        # Yellow (black + red) circle for warning
                        frame_black[byte_index] |= (1 << bit_index)
                        frame_red[byte_index] |= (1 << bit_index)
                    elif status == "error":
                        # Red circle for error
                        frame_red[byte_index] |= (1 << bit_index)
        
        self.display_frame(frame_black, frame_red)
        print(f"✓ E-Ink display updated: {status}")
