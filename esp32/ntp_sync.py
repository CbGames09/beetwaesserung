# NTP Time Synchronization mit Multi-Server Fallback
import time
import ntptime

class NTPSync:
    def __init__(self):
        """Initialize NTP synchronization"""
        self.ntp_sync_timestamp = 0  # UTC timestamp in ms when synced
        self.ntp_sync_localtime = 0  # ESP32 time when synced
        self.servers = [
            "de.pool.ntp.org",
            "europe.pool.ntp.org",
            "pool.ntp.org",
            "time.google.com",
        ]
    
    def is_dst(self, year, month, day, hour):
        """
        Check if DST is active in Germany/EU
        DST: Last Sunday in March 02:00 to last Sunday in October 03:00
        """
        # Find last Sunday in March
        march_last_sunday = 31
        while march_last_sunday > 0:
            m, y, d = 3, year, march_last_sunday
            if m < 3:
                m += 12
                y -= 1
            weekday = (d + ((13 * (m + 1)) // 5) + y + (y // 4) - (y // 100) + (y // 400)) % 7
            if weekday == 0:  # Sunday
                break
            march_last_sunday -= 1
        
        # Find last Sunday in October
        october_last_sunday = 31
        while october_last_sunday > 0:
            m, y, d = 10, year, october_last_sunday
            weekday = (d + ((13 * (m + 1)) // 5) + y + (y // 4) - (y // 100) + (y // 400)) % 7
            if weekday == 0:  # Sunday
                break
            october_last_sunday -= 1
        
        # Check if DST is active
        if month < 3 or month > 10:
            return False
        elif month > 3 and month < 10:
            return True
        elif month == 3:
            if day < march_last_sunday:
                return False
            elif day > march_last_sunday:
                return True
            else:
                return hour >= 2
        else:  # month == 10
            if day < october_last_sunday:
                return True
            elif day > october_last_sunday:
                return False
            else:
                return hour < 3
    
    def sync(self):
        """
        Synchronize time with NTP servers
        Returns True if successful, False otherwise
        """
        print("\n" + "="*50)
        print("NTP TIME SYNCHRONIZATION")
        print("="*50)
        
        for server in self.servers:
            try:
                print(f"→ Trying NTP server: {server}")
                
                ntptime.host = server
                ntptime.timeout = 5
                
                ntptime.settime()
                
                # Save sync time
                self.ntp_sync_localtime = time.time()
                
                # Calculate UTC timestamp (ms)
                unix_offset = 946684800  # Seconds between 1970 and 2000
                self.ntp_sync_timestamp = int((self.ntp_sync_localtime + unix_offset) * 1000)
                
                # Display time with timezone (for logging only)
                utc_time = time.localtime(self.ntp_sync_localtime)
                year, month, day, hour = utc_time[0], utc_time[1], utc_time[2], utc_time[3]
                
                if self.is_dst(year, month, day, hour):
                    offset_hours = 2
                    timezone_name = "MESZ (Sommerzeit)"
                else:
                    offset_hours = 1
                    timezone_name = "MEZ (Winterzeit)"
                
                offset_seconds = offset_hours * 3600
                local_time = time.localtime(self.ntp_sync_localtime + offset_seconds)
                year, month, day, hour, minute, second = (
                    local_time[0], local_time[1], local_time[2],
                    local_time[3], local_time[4], local_time[5]
                )
                
                print(f"\n✓ Time synchronized successfully!")
                print(f"  Server: {server}")
                print(f"  Local Date/Time: {day:02d}.{month:02d}.{year} {hour:02d}:{minute:02d}:{second:02d}")
                print(f"  Timezone: {timezone_name} (UTC+{offset_hours})")
                print(f"  Stored ntp_sync_timestamp (UTC, ms): {self.ntp_sync_timestamp}")
                print("="*50 + "\n")
                
                return True
                
            except Exception as e:
                print(f"  ✗ Failed with {server}: {e}")
        
        # All servers failed
        print(f"\n✗ All NTP servers failed")
        print("  Using system time (may be incorrect)")
        print("="*50 + "\n")
        return False
    
    def get_timestamp(self):
        """Get current UTC timestamp in milliseconds"""
        unix_offset = 946684800
        
        if self.ntp_sync_timestamp == 0:
            # Fallback if NTP never synced
            return int((time.time() + unix_offset) * 1000)
        
        # Calculate elapsed time since sync
        elapsed_seconds = time.time() - self.ntp_sync_localtime
        return int(self.ntp_sync_timestamp + (elapsed_seconds * 1000))
    
    def get_time(self):
        """Get current UTC time in seconds"""
        unix_offset = 946684800
        
        if self.ntp_sync_timestamp == 0:
            return time.time() + unix_offset
        
        elapsed_seconds = time.time() - self.ntp_sync_localtime
        return (self.ntp_sync_timestamp / 1000) + elapsed_seconds
