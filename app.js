// ============================================
// POETRY MAP - Main Application
// ============================================

// City coordinates for sidebar navigation
const cityCoords = {
  'Bangalore, IN': { lat: 12.9716, lng: 77.5946, zoom: 13 },
  'Kalga, IN': { lat: 31.995019, lng: 77.450985, zoom: 15 },
  'Delhi, IN': { lat: 28.6139, lng: 77.2090, zoom: 12 },
  'Gurgaon, IN': { lat: 28.4595, lng: 77.0266, zoom: 14 },
  'all': { lat: 22.5, lng: 78.5, zoom: 5 }  // Centered on India
};

// City colors for pins (add more as you expand)
const cityColors = {
  'Bangalore, IN': '#e63946',  // Red
  'Kalga, IN': '#2a9d8f',      // Teal
  'Delhi, IN': '#e9c46a',      // Yellow
  'Gurgaon, IN': '#457b9d',    // Blue
  'default': '#457b9d'         // Blue fallback
};

// ============================================
// 1. INITIALIZE THE MAP
// ============================================

// Create the map, centered on Bangalore
const map = L.map('map').setView([12.9716, 77.5946], 12);

// Define both light and dark tile layers
const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19
});

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19
});

// Start with dark mode
darkTiles.addTo(map);
let isDarkMode = true;

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

    // Create a custom colored marker
    const marker = L.circleMarker([poem.lat, poem.lng], {
      radius: 8,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    });

    // Add tooltip - permanent on mobile (controlled by zoom), hover on desktop
    marker.bindTooltip(poem.landmark, {
      direction: 'top',
      offset: [0, -8],
      className: 'marker-tooltip',
      permanent: false  // We'll control this manually on mobile
    });

    // When pin is clicked, show the poem
    marker.on('click', () => showPoem(poem));

    // Add marker to the map
    marker.addTo(map);
    markers.push(marker);
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

// Format coordinates as "12.9347°N, 77.6303°E"
function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

// Show poem in the side panel
function showPoem(poem) {
  document.getElementById('poem-title').textContent = poem.title;

  // Author with coordinates
  const coords = formatCoords(poem.lat, poem.lng);
  const authorText = poem.author ? `${poem.author} · ${coords}` : coords;
  document.getElementById('poem-author').textContent = authorText;

  document.getElementById('poem-text').textContent = poem.poem_text;
  document.getElementById('poem-date').textContent = poem.date_written;

  // Remove 'hidden' class to show panel
  panel.classList.remove('hidden');
}

// Close panel when X is clicked
closeBtn.addEventListener('click', () => {
  panel.classList.add('hidden');
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
});