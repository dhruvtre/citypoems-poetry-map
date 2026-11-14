// ============================================
// POETRY MAP - Main Application
// ============================================

// City coordinates for sidebar navigation
const cityCoords = {
  'Bangalore, IN': { lat: 12.9716, lng: 77.5946, zoom: 13 },
  'Kalga, IN': { lat: 31.995019, lng: 77.450985, zoom: 15 },
  'Delhi, IN': { lat: 28.6139, lng: 77.2090, zoom: 12 },
  'Gurgaon, IN': { lat: 28.461992, lng: 77.100416, zoom: 14 },
  'Mumbai, IN': { lat: 19.0760, lng: 72.8777, zoom: 11 },
  'all': { lat: 22.5, lng: 78.5, zoom: 5 }  // Centered on India
};

// City colors for pins (add more as you expand)
const cityColors = {
  'Bangalore, IN': '#e63946',  // Red
  'Kalga, IN': '#2a9d8f',      // Teal
  'Delhi, IN': '#e9c46a',      // Yellow
  'Gurgaon, IN': '#457b9d',    // Blue
  'Mumbai, IN': '#f4a261',     // Orange
  'default': '#457b9d'         // Blue fallback
};

// ============================================
// 1. INITIALIZE THE MAP
// ============================================

// Create the map, centered on Bangalore
const map = L.map('map').setView([12.9716, 77.5946], 12);

// CARTO basemaps API key (required since Sep 2026).
// This key is public by design - restrict it to citypoems.in in the CARTO dashboard.
const CARTO_API_KEY = 'cb1_4z1o_1_243bcf166f49d7633ac96f14';

const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Define both light and dark tile layers
const lightTiles = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`, {
  attribution: tileAttribution,
  maxZoom: 19
});

const darkTiles = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`, {
  attribution: tileAttribution,
  maxZoom: 19
});

// Start in whichever theme the page loaded with: dark by default,
// or light if the visitor chose it last time (see the script at the top of <body>)
let isDarkMode = document.body.classList.contains('dark-mode');
(isDarkMode ? darkTiles : lightTiles).addTo(map);

// ============================================
// 2. LOAD POEMS AND CREATE PINS
// ============================================

// This will hold our poem data after loading
let poems = [];

// Fetch the poems from our JSON file
fetch('poems.json')
  .then(response => response.json())
  .then(data => {
    poems = data;
    addPinsToMap(poems);
    populateCitySidebar(poems);
  })
  .catch(error => {
    console.error('Error loading poems:', error);
  });

// Check if mobile device
const isMobile = window.innerWidth <= 1000;

// Store markers for zoom-based label control
const markers = [];

// Create a pin for each poem and add to map
function addPinsToMap(poems) {
  poems.forEach(poem => {
    // Get color for this city (or use default)
    const color = cityColors[poem.city] || cityColors['default'];

    // Determine all points to pin for this poem
    const pinPoints = (poem.route && poem.route.length > 1)
      ? poem.route
      : [{ lat: poem.lat, lng: poem.lng, landmark: poem.landmark }];

    pinPoints.forEach(point => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindTooltip(point.landmark, {
        direction: 'top',
        offset: [0, -8],
        className: 'marker-tooltip',
        permanent: true
      });

      marker.on('click', () => showPoem(poem));

      marker.addTo(map);
      markers.push(marker);
    });
  });

  // Show/hide labels based on zoom (both mobile and desktop)
  updateLabels();
  map.on('zoomend', updateLabels);
}

// Show permanent labels when zoomed in enough (zoom 13+)
function updateLabels() {
  const zoom = map.getZoom();
  const showLabels = zoom >= 13;  // Show labels at zoom 13+

  markers.forEach(marker => {
    if (showLabels) {
      marker.openTooltip();
    } else {
      marker.closeTooltip();
    }
  });
}

// ============================================
// 3. POEM PANEL - Show/Hide
// ============================================

const panel = document.getElementById('poem-panel');
const closeBtn = document.getElementById('close-panel');

// Store active route layer for poems with routes
let activePolyline = null;

// Format coordinates as "12.9347°N, 77.6303°E"
function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Format "2022-08-15" as "15 August 2022".
// Years and ranges ("1984", "1982–83") are shown exactly as written.
// Done by hand rather than with Date, which can shift the day in some time zones.
function formatDate(dateText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
  if (!match) return dateText || '';

  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName || Number(day) < 1 || Number(day) > 31) return dateText;

  return `${Number(day)} ${monthName} ${year}`;
}

// Build the poem as stanzas (<p>, split at blank lines) of lines (one block each).
// CSS gives every line a hanging indent, so a line that wraps is indented and the
// poet's own breaks stay clear. Using <p> for stanzas also keeps the blank lines
// when someone copies the poem.
function renderPoemText(container, text) {
  container.replaceChildren();
  let stanza = null;

  text.split(/\r?\n/).forEach(line => {
    // A blank line ends the current stanza
    if (!line.trim()) {
      stanza = null;
      return;
    }

    if (!stanza) {
      stanza = document.createElement('p');
      stanza.className = 'poem-stanza';
      container.appendChild(stanza);
    }

    const lineEl = document.createElement('span');
    lineEl.className = 'poem-line';

    // Keep leading spaces in the text (so copying keeps them), and tell CSS how many
    // there are, so the wrapped part of an indented line hangs past its indented start
    const leadingSpaces = line.match(/^ */)[0].length;
    if (leadingSpaces) lineEl.style.setProperty('--indent', leadingSpaces);
    lineEl.textContent = line;

    stanza.appendChild(lineEl);
  });
}

// Show poem in the side panel
function showPoem(poem) {
  document.getElementById('poem-title').textContent = poem.title;

  // Author on one line (hidden if there isn't one)
  const authorEl = document.getElementById('poem-author');
  authorEl.textContent = poem.author || '';
  authorEl.style.display = poem.author ? '' : 'none';

  // Place name with coordinates on the next line, e.g. "ST Bed Layout · 12.9367°N, 77.6323°E".
  // Route poems show their journey instead, e.g. "Purana Qila → Golcha Cinema".
  const placeEl = document.getElementById('poem-place');
  if (placeEl) {
    const coords = formatCoords(poem.lat, poem.lng);
    const placeName = (poem.route && poem.route.length > 1)
      ? poem.route.map(point => point.landmark).join(' → ')
      : poem.landmark;
    placeEl.textContent = placeName ? `${placeName} · ${coords}` : coords;
  }

  renderPoemText(document.getElementById('poem-text'), poem.poem_text);
  document.getElementById('poem-date').textContent = formatDate(poem.date_written);

  const sourceLink = document.getElementById('poem-source');
  const sourceSep = document.getElementById('poem-source-sep');
  if (poem.source_url) {
    sourceLink.href = poem.source_url;
    sourceLink.textContent = 'source';
    sourceLink.style.display = '';
    sourceSep.style.display = '';
  } else {
    sourceLink.removeAttribute('href');
    sourceLink.textContent = '';
    sourceLink.style.display = 'none';
    sourceSep.style.display = 'none';
  }

  // Clear any existing polyline
  if (activePolyline) {
    map.removeLayer(activePolyline);
    activePolyline = null;
  }

  // Draw route line if this poem has one
  if (poem.route && poem.route.length > 1) {
    const color = cityColors[poem.city] || cityColors['default'];
    const points = poem.route.map(p => [p.lat, p.lng]);

    activePolyline = L.polyline(points, {
      color: color,
      weight: 2,
      opacity: 0.7,
      dashArray: '6, 8'
    }).addTo(map);
  }

  // The same panel is reused for every poem, so it keeps its scroll position.
  // Jump back to the top so each new poem starts at its title.
  panel.scrollTop = 0;

  // Remove 'hidden' class to show panel
  panel.classList.remove('hidden');
}

// Close panel when X is clicked
closeBtn.addEventListener('click', () => {
  panel.classList.add('hidden');
  if (activePolyline) {
    map.removeLayer(activePolyline);
    activePolyline = null;
  }
});

// Close panel when clicking outside of it
document.addEventListener('click', (e) => {
  // If panel is hidden, do nothing
  if (panel.classList.contains('hidden')) return;

  // If click is inside the panel, do nothing
  if (panel.contains(e.target)) return;

  // If click is on a marker, do nothing (marker click opens new poem)
  if (e.target.closest('.leaflet-marker-icon') || e.target.closest('.leaflet-interactive')) return;

  // Otherwise, close the panel
  panel.classList.add('hidden');
  if (activePolyline) {
    map.removeLayer(activePolyline);
    activePolyline = null;
  }
});

// ============================================
// 4. LANDMARK SIDEBAR - Navigation
// ============================================

const cityList = document.getElementById('city-list');

// Fill sidebar with cities and poem counts
function populateCitySidebar(poems) {
  // Count poems per city
  const cityCounts = {};
  poems.forEach(poem => {
    cityCounts[poem.city] = (cityCounts[poem.city] || 0) + 1;
  });

  // Add "all" option first
  const allItem = document.createElement('li');
  const allLink = document.createElement('a');
  allLink.textContent = 'all';
  allLink.dataset.city = 'all';
  allItem.appendChild(allLink);
  cityList.appendChild(allItem);

  // Add each city with its count
  Object.keys(cityCounts).forEach(city => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = `${city} (${cityCounts[city]})`;
    link.dataset.city = city;
    li.appendChild(link);
    cityList.appendChild(li);
  });
}

// When a city link is clicked, fly to that city
cityList.addEventListener('click', (e) => {
  if (e.target.tagName !== 'A') return;

  const city = e.target.dataset.city;
  const coords = cityCoords[city];

  if (coords) {
    // Smooth animated flight to the city
    map.flyTo([coords.lat, coords.lng], coords.zoom, {
      duration: 1.5
    });
  }

  // Update active state
  cityList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  e.target.classList.add('active');
});

// ============================================
// 5. DARK MODE TOGGLE
// ============================================

const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
  isDarkMode = !isDarkMode;

  // Toggle body class for CSS styling
  document.body.classList.toggle('dark-mode', isDarkMode);

  // Swap map tiles
  if (isDarkMode) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
  }

  // Remember the choice for the next visit (fails silently in private browsing)
  try {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  } catch (e) {}
});