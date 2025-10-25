from machine import Pin, SPI
from epaper1in54b import EPD
import time

spi = SPI(1, baudrate=4000000, polarity=0, phase=0,
          sck=Pin(48), mosi=Pin(38))

cs = Pin(21)
dc = Pin(18)
rst = Pin(14)
busy = Pin(8, Pin.IN)

print("Init display ...")
eink = EPD(spi, cs, dc, rst, busy)
eink.init()

fb_black = bytearray(5000)
fb_red = bytearray(5000)

for i in range(5000):
    fb_black[i] = 0x00  # schwarz
    fb_red[i] = 0x00

print("Display refresh ...")
eink.display_frame(fb_black, fb_red)
print("Done")
time.sleep(10)
eink.sleep()
