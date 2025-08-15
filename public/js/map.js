// Map functionality for Contact Manager
console.log('Map.js loaded');

let map;
let markers = [];

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadContactMarkers();
    setupRowClickHandlers();
});

function initializeMap() {
    try {
        console.log('Initializing map...');
        
        // Initialize map centered on a default location (you can change this)
        map = L.map('map').setView([40.7589, -73.9851], 10); // New York City
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
        showMapError('Failed to initialize map');
    }
}

function loadContactMarkers() {
    try {
        console.log('Loading contact markers...');
        clearMarkers();
        
        const contactRows = document.querySelectorAll('.contact-row');
        let validLocations = 0;
        
        contactRows.forEach(row => {
            const lat = parseFloat(row.dataset.lat);
            const lng = parseFloat(row.dataset.lng);
            const name = row.dataset.name;
            
            if (lat && lng && lat !== 0 && lng !== 0) {
                addMarker(lat, lng, name, getContactInfo(row));
                validLocations++;
            }
        });
        
        console.log(`Added ${validLocations} markers to map`);
        
        // If we have markers, fit the map to show them all
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        // Show message if no locations found
        if (validLocations === 0) {
            showMapMessage('No contact locations to display on map');
        }
        
    } catch (error) {
        console.error('Error loading markers:', error);
        showMapError('Failed to load contact locations');
    }
}

function addMarker(lat, lng, name, info) {
    try {
        const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(createPopupContent(name, info));
        
        markers.push(marker);
        
        // Add click handler to marker
        marker.on('click', function() {
            console.log(`Marker clicked: ${name}`);
        });
        
    } catch (error) {
        console.error('Error adding marker:', error);
    }
}

function createPopupContent(name, info) {
    let content = `<div class="marker-popup">`;
    content += `<h6 class="mb-2"><i class="fas fa-user me-2"></i>${name}</h6>`;
    
    if (info.address) {
        content += `<p class="mb-1"><i class="fas fa-map-marker-alt me-2"></i>${info.address}</p>`;
    }
    
    if (info.phone) {
        content += `<p class="mb-1"><i class="fas fa-phone me-2"></i><a href="tel:${info.phone}">${info.phone}</a></p>`;
    }
    
    if (info.email) {
        content += `<p class="mb-0"><i class="fas fa-envelope me-2"></i><a href="mailto:${info.email}">${info.email}</a></p>`;
    }
    
    content += `</div>`;
    return content;
}

function getContactInfo(row) {
    const cells = row.querySelectorAll('td');
    const info = {};
    
    if (cells.length >= 4) {
        // Extract address, phone, email from table cells
        info.address = cells[1].textContent.trim();
        info.phone = cells[2].textContent.trim();
        info.email = cells[3].textContent.trim();
        
        // Clean up "No [field]" messages
        if (info.address === 'No address') info.address = '';
        if (info.phone === 'No phone') info.phone = '';
        if (info.email === 'No email') info.email = '';
    }
    
    return info;
}

function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

function setupRowClickHandlers() {
    const contactRows = document.querySelectorAll('.contact-row');
    
    contactRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking on buttons
            if (e.target.closest('.btn') || e.target.closest('a')) {
                return;
            }
            
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const name = this.dataset.name;
            
            if (lat && lng && lat !== 0 && lng !== 0) {
                console.log(`Flying to: ${name} at ${lat}, ${lng}`);
                
                // Fly to the location
                map.flyTo([lat, lng], 15, {
                    duration: 1.5
                });
                
                // Find and open the marker popup
                markers.forEach(marker => {
                    const markerLat = marker.getLatLng().lat;
                    const markerLng = marker.getLatLng().lng;
                    
                    if (Math.abs(markerLat - lat) < 0.0001 && Math.abs(markerLng - lng) < 0.0001) {
                        setTimeout(() => {
                            marker.openPopup();
                        }, 1000);
                    }
                });
                
                // Visual feedback on the clicked row
                this.style.backgroundColor = '#e3f2fd';
                setTimeout(() => {
                    this.style.backgroundColor = '';
                }, 2000);
                
            } else {
                showMapMessage('No location data available for this contact');
            }
        });
        
        // Add hover effect for rows with location data
        const lat = parseFloat(row.dataset.lat);
        const lng = parseFloat(row.dataset.lng);
        
        if (lat && lng && lat !== 0 && lng !== 0) {
            row.style.cursor = 'pointer';
            row.title = 'Click to view on map';
        } else {
            row.style.cursor = 'default';
            row.style.opacity = '0.7';
        }
    });
}

function showMapMessage(message) {
    // Create a temporary message overlay on the map
    const messageDiv = document.createElement('div');
    messageDiv.className = 'map-message alert alert-info position-absolute top-50 start-50 translate-middle';
    messageDiv.style.zIndex = '1000';
    messageDiv.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    
    const mapContainer = document.getElementById('map-container');
    mapContainer.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

function showMapError(message) {
    console.error('Map Error:', message);
    
    const mapContainer = document.getElementById('map-container');
    mapContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 bg-light">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                <h5>Map Error</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Retry
                </button>
            </div>
        </div>
    `;
}

// Utility function to refresh map after contact changes
function refreshMap() {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
            loadContactMarkers();
            setupRowClickHandlers();
        }, 100);
    }
}

// Export functions for use by other scripts
window.mapUtils = {
    refreshMap,
    clearMarkers,
    addMarker,
    showMapMessage
};
