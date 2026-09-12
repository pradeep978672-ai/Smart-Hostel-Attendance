export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  capturedAt: string; // ISO timestamp of when the capture happened
}

/**
 * Captures the device's current GPS position exactly once.
 * Rejects if permission is denied or position unavailable.
 * Does NOT fall back to hardcoded coordinates — callers must
 * handle the rejection and block any dependent action.
 */
export const getCurrentLocation = (): Promise<GeoLocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const capturedAt = new Date().toISOString();

        let address = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;

        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'HostelAttendanceApp/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              address = data.display_name;
            }
          }
        } catch {
          // Fall back to coordinate string if network request is blocked
        }

        resolve({ latitude, longitude, accuracy, address, capturedAt });
      },
      (error) => {
        let msg = 'Location access failed.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg =
              'Location permission was denied. You must allow GPS access to submit attendance.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Your device location is currently unavailable. Please check GPS settings.';
            break;
          case error.TIMEOUT:
            msg = 'GPS location request timed out. Please try again.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Always fresh — never use cached position
      }
    );
  });
};
