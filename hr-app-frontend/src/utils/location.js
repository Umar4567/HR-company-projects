// Reusable location helper used by Dashboard and Attendance
// language: optional ISO language code (e.g. 'en', 'kn') - defaults to 'en'
export const reverseGeocode = async (latitude, longitude, language = 'en') => {
  try {
    // request JSON v2 and include address details; ask Nominatim for a specific language via Accept-Language header
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'Accept-Language': language } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || (data.address && Object.values(data.address).join(', ')) || null;
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
};

// Acquire multiple high-accuracy samples and return the best reading + optional reverse geocoded address
// Accepts an optional options object: { language: 'en' }
export const getLocationAndAddress = (options = {}) => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve({ location: null, address: null });

  let best = null;
  let samples = 0;
  const maxSamples = 8;
  const desiredAccuracy = 20; // meters
  const timeoutMs = 10000;

  const clearAndResolve = async () => {
    try {
      if (best) {
        const lang = options.language || 'en';
        const address = await reverseGeocode(best.latitude, best.longitude, lang).catch(() => null);
        resolve({ location: best, address });
      } else {
        resolve({ location: null, address: null });
      }
    } catch (e) {
      resolve({ location: best, address: null });
    }
  };

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      samples += 1;
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
      if (!best || (coords.accuracy && coords.accuracy < (best.accuracy || Infinity))) {
        best = coords;
      }
      if ((best.accuracy && best.accuracy <= desiredAccuracy) || samples >= maxSamples) {
        try { navigator.geolocation.clearWatch(watchId); } catch (e) { }
        clearAndResolve();
      }
    },
    (err) => {
      try { navigator.geolocation.clearWatch(watchId); } catch (e) { }
      resolve({ location: null, address: null });
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
  );

  // safety timeout
  setTimeout(() => {
    try { navigator.geolocation.clearWatch(watchId); } catch (e) { }
    clearAndResolve();
  }, timeoutMs + 300);
});

export default getLocationAndAddress;