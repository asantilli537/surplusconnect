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
      <div style="font-family: 'Inter', sans-serif;">
        <h3 style="margin: 0 0 5px 0; font-size: 16px;">${listing.title}</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
          Donated by: <strong>${listing.donorName}</strong>
        </p>
        <a href="/listings/${listing._id}" 
           style="display: inline-block; padding: 5px 10px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 600;">
           View Details
        </a>
      </div>
    `;

    marker.bindPopup(popupHtml);
  });
});