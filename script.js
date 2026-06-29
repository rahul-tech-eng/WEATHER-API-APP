/* ─────────────────────────────────────────────
   WEATHER CODE MAP  (WMO code → label + emoji)
───────────────────────────────────────────── */
const WMO = {
  0:  { label: 'Clear Sky',          icon: '☀️' },
  1:  { label: 'Mainly Clear',       icon: '🌤️' },
  2:  { label: 'Partly Cloudy',      icon: '⛅' },
  3:  { label: 'Overcast',           icon: '☁️' },
  45: { label: 'Foggy',              icon: '🌫️' },
  48: { label: 'Icy Fog',            icon: '🌫️' },
  51: { label: 'Light Drizzle',      icon: '🌦️' },
  53: { label: 'Drizzle',            icon: '🌦️' },
  55: { label: 'Heavy Drizzle',      icon: '🌧️' },
  61: { label: 'Light Rain',         icon: '🌧️' },
  63: { label: 'Rain',               icon: '🌧️' },
  65: { label: 'Heavy Rain',         icon: '🌧️' },
  66: { label: 'Freezing Rain',      icon: '🌨️' },
  67: { label: 'Heavy Freezing Rain',icon: '🌨️' },
  71: { label: 'Light Snow',         icon: '🌨️' },
  73: { label: 'Snow',               icon: '❄️' },
  75: { label: 'Heavy Snow',         icon: '❄️' },
  77: { label: 'Snow Grains',        icon: '🌨️' },
  80: { label: 'Light Showers',      icon: '🌦️' },
  81: { label: 'Showers',            icon: '🌧️' },
  82: { label: 'Heavy Showers',      icon: '⛈️' },
  85: { label: 'Snow Showers',       icon: '🌨️' },
  86: { label: 'Heavy Snow Showers', icon: '❄️' },
  95: { label: 'Thunderstorm',       icon: '⛈️' },
  96: { label: 'Thunderstorm + Hail',icon: '⛈️' },
  99: { label: 'Thunderstorm + Hail',icon: '⛈️' },
};

function getWMO(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡️' };
}

/* ─────────────────────────────────────────────
   UV INDEX LABEL
───────────────────────────────────────────── */
function uvLabel(uv) {
  if (uv <= 2)  return 'Low exposure risk';
  if (uv <= 5)  return 'Moderate — wear SPF';
  if (uv <= 7)  return 'High — limit exposure';
  if (uv <= 10) return 'Very High — seek shade';
  return 'Extreme — avoid sun';
}

/* ─────────────────────────────────────────────
   WIND DIRECTION
───────────────────────────────────────────── */
function windDirLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8] || '—';
}

/* ─────────────────────────────────────────────
   HUMIDITY LABEL
───────────────────────────────────────────── */
function humidityLabel(h) {
  if (h < 30)  return 'Dry conditions';
  if (h < 60)  return 'Comfortable range';
  if (h < 80)  return 'Humid — feels sticky';
  return 'Very humid';
}

/* ─────────────────────────────────────────────
   SHOW / HIDE MESSAGE
───────────────────────────────────────────── */
function showMessage(text, type) {
  const box = document.getElementById('msgBox');
  box.textContent = text;
  box.className = 'message-box ' + type;
}
function clearMessage() {
  const box = document.getElementById('msgBox');
  box.className = 'message-box';
  box.textContent = '';
}

/* ─────────────────────────────────────────────
   GEOCODING  — city name → lat/lon
   Uses Open-Meteo Geocoding API (no key needed)
───────────────────────────────────────────── */
async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${city}" not found. Check the spelling and try again.`);
  }
  return data.results[0]; // { name, country, latitude, longitude, ... }
}

/* ─────────────────────────────────────────────
   WEATHER FETCH  — lat/lon → full weather JSON
   Uses Open-Meteo Forecast API (no key needed)
───────────────────────────────────────────── */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude:              lat,
    longitude:             lon,
    current:               [
      'temperature_2m','relative_humidity_2m','apparent_temperature',
      'weather_code','wind_speed_10m','wind_direction_10m','wind_gusts_10m',
      'surface_pressure','cloud_cover','precipitation','visibility','uv_index'
    ].join(','),
    hourly:                ['temperature_2m','weather_code','precipitation_probability'].join(','),
    temperature_unit:      'celsius',
    wind_speed_unit:       'kmh',
    precipitation_unit:    'mm',
    timezone:              'auto',
    forecast_days:         1,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error (HTTP ${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || 'Weather API returned an error');
  return data;
}

/* ─────────────────────────────────────────────
   RENDER — populate the DOM with weather data
───────────────────────────────────────────── */
function renderWeather(weather, cityName) {
  const c  = weather.current;
  const wmo = getWMO(c.weather_code);

  // ── Atmosphere ring ──
  const temp = Math.round(c.temperature_2m);
  document.getElementById('ringTemp').textContent = temp;
  document.getElementById('ringDesc').textContent = wmo.label;
  document.getElementById('ringCity').textContent = cityName;

  // Ring arc: map temp (-20 … 45) → 0–100% of circumference
  const pct = Math.min(1, Math.max(0, (temp + 20) / 65));
  const circ = 2 * Math.PI * 100; // r=100
  const offset = circ - pct * circ;
  const arc = document.getElementById('ringArc');
  arc.style.strokeDashoffset = offset;
  // Ring colour: cold=cyan, warm=amber, hot=red
  arc.style.stroke = temp < 10 ? 'var(--cyan)' : temp < 28 ? 'var(--green)' : 'var(--amber)';

  const ring = document.getElementById('atmosphereRing');
  ring.classList.add('visible');

  // ── Main metrics ──
  document.getElementById('feelsLike').innerHTML = `${Math.round(c.apparent_temperature)}<span class="metric-unit">°C</span>`;
  const diff = Math.round(c.apparent_temperature) - temp;
  document.getElementById('feelsLikeSub').textContent = diff > 0 ? `Warmer than actual` : diff < 0 ? `Colder than actual` : `Same as actual`;

  document.getElementById('humidity').innerHTML = `${c.relative_humidity_2m}<span class="metric-unit">%</span>`;
  document.getElementById('humiditySub').textContent = humidityLabel(c.relative_humidity_2m);

  document.getElementById('windSpeed').innerHTML = `${Math.round(c.wind_speed_10m)}<span class="metric-unit"> km/h</span>`;
  document.getElementById('windDir').textContent = `Direction: ${windDirLabel(c.wind_direction_10m)}`;

  const uv = Math.round(c.uv_index ?? 0);
  document.getElementById('uvIndex').innerHTML = `${uv}`;
  document.getElementById('uvSub').textContent = uvLabel(uv);

  // ── Detail row ──
  document.getElementById('pressure').textContent    = `${Math.round(c.surface_pressure)} hPa`;
  document.getElementById('visibility').textContent  = `${((c.visibility ?? 0) / 1000).toFixed(1)} km`;
  document.getElementById('precipitation').textContent = `${c.precipitation ?? 0} mm`;
  document.getElementById('windGusts').textContent   = `${Math.round(c.wind_gusts_10m ?? 0)} km/h`;
  document.getElementById('cloudCover').textContent  = `${c.cloud_cover ?? 0}%`;

  // ── Show grid + detail ──
  document.getElementById('metricsGrid').classList.add('visible');
  document.getElementById('detailRow').classList.add('visible');
  document.getElementById('emptyState').classList.add('hidden');

  // ── Hourly forecast ──
  renderHourly(weather);
}

/* ─────────────────────────────────────────────
   RENDER HOURLY STRIP
───────────────────────────────────────────── */
function renderHourly(weather) {
  const h   = weather.hourly;
  const now = new Date();
  const strip = document.getElementById('hourlyStrip');
  strip.innerHTML = '';

  // Find index matching current hour
  const currentHour = now.getHours();
  let startIdx = 0;
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i]);
    if (t.getHours() === currentHour) { startIdx = i; break; }
  }

  for (let i = startIdx; i < Math.min(startIdx + 12, h.time.length); i++) {
    const t   = new Date(h.time[i]);
    const isNow = i === startIdx;
    const wmo = getWMO(h.weather_code[i]);
    const item = document.createElement('div');
    item.className = 'hourly-item' + (isNow ? ' now' : '');
    item.innerHTML = `
      <div class="hourly-time">${isNow ? 'Now' : t.getHours().toString().padStart(2,'0') + ':00'}</div>
      <div class="hourly-icon">${wmo.icon}</div>
      <div class="hourly-temp">${Math.round(h.temperature_2m[i])}°</div>
      <div class="hourly-rain">${h.precipitation_probability[i] ?? 0}% 💧</div>
    `;
    strip.appendChild(item);
  }

  const sec = document.getElementById('hourlySection');
  sec.style.display = 'block';
  strip.classList.add('visible');
}

/* ─────────────────────────────────────────────
   MAIN HANDLER — orchestrates the full flow
───────────────────────────────────────────── */
async function handleSearch() {
  const cityInput = document.getElementById('cityInput');
  const searchBtn = document.getElementById('searchBtn');
  const city = cityInput.value.trim();

  if (!city) {
    showMessage('⚠️  Please enter a city name to search.', 'error');
    cityInput.focus();
    return;
  }

  // Reset UI
  clearMessage();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Fetching…';
  document.getElementById('atmosphereRing').classList.remove('visible');
  document.getElementById('metricsGrid').classList.remove('visible');
  document.getElementById('detailRow').classList.remove('visible');
  document.getElementById('hourlySection').style.display = 'none';

  try {
    // Step 1: Geocode
    showMessage('📡  Locating ' + city + '…', 'loading');
    const location = await geocodeCity(city);
    const label = `${location.name}${location.country_code ? ', ' + location.country_code : ''}`;

    // Step 2: Fetch weather
    showMessage('🌐  Pulling atmospheric data…', 'loading');
    const weather = await fetchWeather(location.latitude, location.longitude);

    // Step 3: Render
    clearMessage();
    renderWeather(weather, label);

    // Update status
    document.getElementById('statusText').textContent = `Last updated · ${new Date().toLocaleTimeString()}`;

  } catch (err) {
    // Comprehensive error handling
    let userMsg = '⚠️  ';
    if (err instanceof TypeError && err.message.includes('fetch')) {
      userMsg += 'Network error — check your internet connection and try again.';
    } else {
      userMsg += err.message || 'Something went wrong. Please try again.';
    }
    showMessage(userMsg, 'error');
    document.getElementById('emptyState').classList.remove('hidden');
    console.error('[Atmos] Error:', err);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Fetch Data';
  }
}

/* ── Allow Enter key in input ── */
document.getElementById('cityInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

/* ── Load a default city on page open ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cityInput').value = 'London';
  handleSearch();
});