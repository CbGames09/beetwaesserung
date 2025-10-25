from machine import Pin, SPI
from epaper1in54b import EPD
import time

spi = SPI(2, baudrate=4000000, polarity=0, phase=0,
          sck=Pin(48), mosi=Pin(38))
eink = EPD(spi, Pin(21), Pin(18), Pin(14), Pin(46))
eink.init()

fb_black = bytearray(5000)
fb_red = bytearray(5000)

# Schwarz füllen
for i in range(5000):
    fb_black[i] = 0x00
    fb_red[i] = 0x00

print("Refreshing...")
eink.display_frame(fb_black, fb_red)
print("Done.")

time.sleep(10)
eink.sleep()
