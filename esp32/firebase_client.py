# Firebase Realtime Database Client mit Retry-Logik
import ujson as json
import urequests as requests
import time

class FirebaseClient:
    def __init__(self, base_url, max_retries=3):
        """Initialize Firebase client with retry logic"""
        self.base_url = base_url
        self.system = None  # Will be set by WateringSystem
        self.error_count = 0
        self.max_retries = max_retries
    
    def _make_request(self, method, url, data=None, headers=None):
        """Make HTTP request with retry (MicroPython urequests doesn't support timeout kwarg)"""
        for attempt in range(self.max_retries):
            response = None
            try:
                # Note: urequests in MicroPython does NOT support timeout parameter!
                if method == "GET":
                    response = requests.get(url)
                elif method == "PUT":
                    response = requests.put(url, data=data, headers=headers)
                elif method == "POST":
                    response = requests.post(url, data=data, headers=headers)
                elif method == "DELETE":
                    response = requests.delete(url)
                
                if response.status_code in [200, 201]:
                    result = response.json() if response.text else None
                    return result
                else:
                    print(f"  ⚠ Firebase {method} status {response.status_code} (attempt {attempt+1}/{self.max_retries})")
                    if attempt < self.max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
            except Exception as e:
                print(f"  ⚠ Firebase {method} error: {e} (attempt {attempt+1}/{self.max_retries})")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
            finally:
                if response:
                    try:
                        response.close()
                    except:
                        pass
        
        # All retries failed
        print(f"  ✗ Firebase {method} failed after {self.max_retries} attempts")
        return None
    
    def get(self, path):
        """GET request to Firebase with retry"""
        url = f"{self.base_url}/{path}.json"
        return self._make_request("GET", url)
    
    def put(self, path, data):
        """PUT request to Firebase with retry"""
        url = f"{self.base_url}/{path}.json"
        headers = {'Content-Type': 'application/json'}
        result = self._make_request("PUT", url, data=json.dumps(data), headers=headers)
        return result is not None
    
    def post(self, path, data):
        """POST request to Firebase with retry"""
        url = f"{self.base_url}/{path}.json"
        headers = {'Content-Type': 'application/json'}
        result = self._make_request("POST", url, data=json.dumps(data), headers=headers)
        return result
    
    def delete(self, path):
        """DELETE request to Firebase with retry"""
        url = f"{self.base_url}/{path}.json"
        result = self._make_request("DELETE", url)
        return result is not None
    
    def log_error(self, error_type, component, message, severity="error"):
        """Log error to Firebase (best effort - no retries)"""
        try:
            if not self.system:
                return
            
            self.error_count += 1
            existing_errors = self.get("systemErrors") or {}
            
            now_ms = self.system.get_timestamp()
            error_key = f"error_{int(now_ms/1000)}_{self.error_count}"
            
            error_data = {
                "timestamp": now_ms,
                "errorType": error_type,
                "component": component,
                "message": message,
                "severity": severity,
                "resolved": False
            }
            
            existing_errors[error_key] = error_data
            
            # Keep only the 10 newest
            if len(existing_errors) > 10:
                sorted_errors = sorted(
                    existing_errors.items(),
                    key=lambda x: x[1].get("timestamp", 0),
                    reverse=True
                )[:10]
                existing_errors = dict(sorted_errors)
            
            self.put("systemErrors", existing_errors)
        except Exception as e:
            print(f"✗ Failed to log error to Firebase: {e}")
    
    # Convenience methods
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
        if not self.system:
            return False
        return self.put("manualTest", {"trigger": False, "timestamp": self.system.get_timestamp()})
    
    def update_test_result(self, result):
        """Update test result in Firebase"""
        return self.put("lastTest", result)
    
    def save_historical_data(self, data):
        """Save historical data point to Firebase"""
        # POST creates unique key automatically
        return self.post("historicalData", data) is not None
