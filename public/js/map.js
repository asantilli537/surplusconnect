document.addEventListener('DOMContentLoaded', () => {
  const mapContainer = document.getElementById('map');
  const dataElement  = document.getElementById('map-data');
  
  if (!mapContainer || !dataElement) return;

  const map = L.map('map').setView([40.744, -74.024], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let listings = [];
  try {
    listings = JSON.parse(dataElement.textContent);
  } catch (e) {
    console.error('Failed to parse map data:', e);
    return;
  }

  listings.forEach((listing) => {
    
    if (!listing.latitude || !listing.longitude) return;

    const marker = L.marker([listing.latitude, listing.longitude]).addTo(map);

    const popupHtml = `
      <div class="marker-popup">
        <h3 class="popup-title">${listing.title}</h3>
        <p class="popup-donor">By <strong>${listing.donorName}</strong></p>
        <a href="/listings/${listing._id}" class="popup-button">
          View Details
        </a>
      </div>
    `;

    marker.bindPopup(popupHtml);
  });
});