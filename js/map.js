// ============================================
// COMMUNITY HERO — MAP MODULE
// map.js
// ============================================

const MapModule = (() => {

  const { ISSUES_DATA, CATEGORIES, STATUSES } = window.AppData;
  let mapInstance = null;
  let markers = [];
  let markerLayer = null;

  // ─── Marker colors per category ───
  const MARKER_COLORS = {
    pothole: '#ff6b6b',
    water:   '#4dabf7',
    light:   '#ffd43b',
    waste:   '#51cf66',
    road:    '#ff922b',
    other:   '#cc5de8',
  };

  function createMarkerIcon(category, status) {
    const color = MARKER_COLORS[category] || '#6c63ff';
    const resolved = status === 'resolved';
    const size = resolved ? 28 : 34;
    const emoji = CATEGORIES[category]?.icon || '📌';

    const svg = `
      <svg width="${size}" height="${size+10}" viewBox="0 0 ${size} ${size+10}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${category}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${color}" flood-opacity="0.5"/>
          </filter>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" fill-opacity="${resolved ? 0.4 : 0.9}" filter="url(#shadow-${category})" stroke="white" stroke-width="2"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-6}" fill="${color}" fill-opacity="${resolved ? 0.3 : 0.2}"/>
        <text x="${size/2}" y="${size/2+5}" text-anchor="middle" font-size="${size/2.5}" dominant-baseline="middle">${emoji}</text>
        <polygon points="${size/2-5},${size-4} ${size/2+5},${size-4} ${size/2},${size+8}" fill="${color}" fill-opacity="${resolved ? 0.5 : 0.9}"/>
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: 'custom-marker',
      iconSize: [size, size+10],
      iconAnchor: [size/2, size+8],
      popupAnchor: [0, -(size+8)],
    });
  }

  // ─── Build popup HTML ───
  function buildPopup(issue) {
    const cat = CATEGORIES[issue.category];
    const sts = STATUSES[issue.status];
    return `
      <div style="min-width:220px;font-family:'Inter',sans-serif;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:1.4rem">${issue.emoji || cat?.icon}</span>
          <div>
            <div style="font-weight:700;font-size:0.9rem;color:#f1f3f9;line-height:1.3">${issue.title.substring(0,50)}${issue.title.length>50?'…':''}</div>
            <div style="font-size:0.72rem;color:#5a6a7e;margin-top:2px">${issue.location.address.substring(0,40)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <span style="padding:2px 8px;background:${MARKER_COLORS[issue.category]}22;color:${MARKER_COLORS[issue.category]};border:1px solid ${MARKER_COLORS[issue.category]}44;border-radius:20px;font-size:0.7rem;font-weight:600">${cat?.label}</span>
          <span style="padding:2px 8px;background:rgba(255,255,255,0.06);color:#a0aec0;border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:0.7rem;">${sts?.label}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;color:#a0aec0;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
          <span>👍 ${issue.upvotes} · ✅ ${issue.verifications} verified</span>
          <button onclick="window.AppModule?.showIssueDetail('${issue.id}')" style="padding:4px 12px;background:linear-gradient(135deg,#6c63ff,#4f46e5);color:#fff;border:none;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;">View →</button>
        </div>
      </div>
    `;
  }

  // ─── Initialize map ───
  function init() {
    if (!document.getElementById('leaflet-map')) return;
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }

    // Delhi center
    mapInstance = L.map('leaflet-map', {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInstance);

    // Attribution subtle
    L.control.attribution({ prefix: '© OpenStreetMap · © CARTO', position: 'bottomright' }).addTo(mapInstance);

    // Custom zoom control
    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    // Add markers
    markerLayer = L.featureGroup().addTo(mapInstance);
    addIssueMarkers(ISSUES_DATA);

    // Click on map to add new report pin (UX demo)
    mapInstance.on('click', e => {
      handleMapClick(e.latlng);
    });

    // Fit bounds to markers
    if (markerLayer.getLayers().length) {
      mapInstance.fitBounds(markerLayer.getBounds().pad(0.2));
    }
  }

  // ─── Add markers ───
  function addIssueMarkers(issues) {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    markers = [];

    issues.forEach(issue => {
      const icon = createMarkerIcon(issue.category, issue.status);
      const marker = L.marker([issue.location.lat, issue.location.lng], { icon });

      marker.bindPopup(buildPopup(issue), {
        className: 'dark-popup',
        maxWidth: 280,
        closeButton: true,
      });

      marker.on('mouseover', function() { this.openPopup(); });
      marker.on('click', function() {
        window.AppModule?.showIssueDetail(issue.id);
      });

      markerLayer.addLayer(marker);
      markers.push({ marker, issue });
    });
  }

  // ─── Filter markers ───
  function filterMarkers(category) {
    if (!markerLayer) return;
    const filtered = category === 'all'
      ? ISSUES_DATA
      : ISSUES_DATA.filter(i => i.category === category);
    addIssueMarkers(filtered);
  }

  // ─── Fly to issue ───
  function flyToIssue(issue) {
    if (!mapInstance) return;
    mapInstance.flyTo([issue.location.lat, issue.location.lng], 15, { duration: 1.5 });
  }

  // ─── Handle map click (for report wizard) ───
  let tempPin = null;
  function handleMapClick(latlng) {
    if (tempPin) { mapInstance.removeLayer(tempPin); }
    // Only act if report wizard is in geo-step context
    const wizardActive = document.querySelector('#wizard-modal.open');
    if (!wizardActive) return;

    tempPin = L.marker(latlng, {
      icon: L.divIcon({
        html: '<div style="width:20px;height:20px;background:#6c63ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 15px rgba(108,99,255,0.8)"></div>',
        className: '',
        iconSize: [20,20],
        iconAnchor: [10,10],
      }),
    }).addTo(mapInstance);

    // Update wizard fields
    const latEl = document.getElementById('report-lat');
    const lngEl = document.getElementById('report-lng');
    const addrEl = document.getElementById('report-address');
    if (latEl) latEl.value = latlng.lat.toFixed(5);
    if (lngEl) lngEl.value = latlng.lng.toFixed(5);
    if (addrEl && !addrEl.value) addrEl.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)} (Pin dropped)`;

    showGlobalToast('📍 Location pinned on map!', 'info');
  }

  function clearTempPin() {
    if (tempPin && mapInstance) {
      mapInstance.removeLayer(tempPin);
      tempPin = null;
    }
  }

  // ─── Get current user location ───
  async function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { timeout: 8000 }
      );
    });
  }

  function getInstance() { return mapInstance; }

  return { init, filterMarkers, flyToIssue, addIssueMarkers, getUserLocation, clearTempPin, getInstance };
})();

window.MapModule = MapModule;
