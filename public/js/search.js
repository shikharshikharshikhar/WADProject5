// Contact search functionality
console.log('Search.js loaded');

let allContacts = [];
let filteredContacts = [];
let searchLocation = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    loadAllContacts();
});

function initializeSearch() {
    // Name search inputs
    const firstNameInput = document.getElementById('searchFirstName');
    const lastNameInput = document.getElementById('searchLastName');
    
    // Location search elements
    const addressInput = document.getElementById('searchAddress');
    const radiusSelect = document.getElementById('searchRadius');
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    // Set up real-time name search
    if (firstNameInput && lastNameInput) {
        firstNameInput.addEventListener('input', performNameSearch);
        lastNameInput.addEventListener('input', performNameSearch);
    }
    
    // Set up location search
    if (searchLocationBtn) {
        searchLocationBtn.addEventListener('click', performLocationSearch);
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearAllFilters);
    }
    
    // Enter key support for location search
    if (addressInput) {
        addressInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performLocationSearch();
            }
        });
    }
}

function loadAllContacts() {
    // Extract contacts from the page data or fetch via API
    const contactRows = document.querySelectorAll('.contact-row');
    allContacts = [];
    
    contactRows.forEach(row => {
        const contact = {
            id: row.querySelector('button[data-contact-id]')?.dataset.contactId || '',
            firstName: extractFromRow(row, 0, 'firstName'),
            lastName: extractFromRow(row, 0, 'lastName'),
            address: extractFromRow(row, 1),
            phone: extractFromRow(row, 2),
            email: extractFromRow(row, 3),
            latitude: parseFloat(row.dataset.lat) || 0,
            longitude: parseFloat(row.dataset.lng) || 0,
            element: row
        };
        allContacts.push(contact);
    });
    
    filteredContacts = [...allContacts];
    console.log(`Loaded ${allContacts.length} contacts for searching`);
}

function extractFromRow(row, cellIndex, field = null) {
    const cells = row.querySelectorAll('td');
    if (cells.length > cellIndex) {
        let text = cells[cellIndex].textContent.trim();
        
        // Clean up "No [field]" messages
        if (text.startsWith('No ')) {
            return '';
        }
        
        // Extract name parts from first cell if needed
        if (field === 'firstName' || field === 'lastName') {
            const nameText = text;
            const nameParts = nameText.split(' ');
            
            if (field === 'firstName') {
                // Skip title if present, get first actual name
                return nameParts.find(part => !['Mr.', 'Mrs.', 'Ms.', 'Dr.'].includes(part)) || '';
            } else if (field === 'lastName') {
                // Get last part of name
                return nameParts[nameParts.length - 1] || '';
            }
        }
        
        return text;
    }
    return '';
}

function performNameSearch() {
    const firstNameQuery = document.getElementById('searchFirstName').value.toLowerCase().trim();
    const lastNameQuery = document.getElementById('searchLastName').value.toLowerCase().trim();
    
    console.log(`Name search: "${firstNameQuery}" "${lastNameQuery}"`);
    
    // Start with all contacts or current location-filtered contacts
    let searchBase = searchLocation ? getContactsWithinRadius() : allContacts;
    
    filteredContacts = searchBase.filter(contact => {
        const firstNameMatch = !firstNameQuery || 
            contact.firstName.toLowerCase().includes(firstNameQuery);
        const lastNameMatch = !lastNameQuery || 
            contact.lastName.toLowerCase().includes(lastNameQuery);
        
        return firstNameMatch && lastNameMatch;
    });
    
    updateContactDisplay();
    updateSearchResults();
}

async function performLocationSearch() {
    const addressInput = document.getElementById('searchAddress');
    const radiusSelect = document.getElementById('searchRadius');
    const searchBtn = document.getElementById('searchLocationBtn');
    
    const address = addressInput.value.trim();
    const radius = parseFloat(radiusSelect.value);
    
    if (!address) {
        showMessage('Please enter an address to search near.', 'warning');
        return;
    }
    
    // Show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
    
    try {
        console.log(`Location search: "${address}" within ${radius} miles`);
        
        // Geocode the search address
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to geocode address');
        }
        
        searchLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.formattedAddress,
            radius: radius
        };
        
        console.log('Search location:', searchLocation);
        
        // Update map to show search location
        if (typeof map !== 'undefined' && map) {
            // Add search marker
            if (window.searchMarker) {
                map.removeLayer(window.searchMarker);
            }
            
            window.searchMarker = L.marker([data.latitude, data.longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            window.searchMarker.bindPopup(`
                <b>Search Location</b><br/>
                ${data.formattedAddress}<br/>
                <small>Searching within ${radius} miles</small>
            `);
            
            // Fly to search location
            map.flyTo([data.latitude, data.longitude], 12);
        }
        
        // Filter contacts
        performNameSearch(); // This will use the location filter
        
        showMessage(`Searching for contacts within ${radius} miles of ${data.formattedAddress}`, 'success');
        
    } catch (error) {
        console.error('Location search error:', error);
        showMessage('Failed to search by location: ' + error.message, 'danger');
    } finally {
        // Restore button
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search by Location';
    }
}

function getContactsWithinRadius() {
    if (!searchLocation) return allContacts;
    
    return allContacts.filter(contact => {
        if (contact.latitude === 0 || contact.longitude === 0) {
            return false; // Skip contacts without coordinates
        }
        
        const distance = calculateDistance(
            searchLocation.latitude, searchLocation.longitude,
            contact.latitude, contact.longitude
        );
        
        return distance <= searchLocation.radius;
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two points
    const R = 3959; // Earth's radius in miles
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in miles
    
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

function clearAllFilters() {
    // Clear input fields
    document.getElementById('searchFirstName').value = '';
    document.getElementById('searchLastName').value = '';
    document.getElementById('searchAddress').value = '';
    document.getElementById('searchRadius').value = '10';
    
    // Clear search location
    searchLocation = null;
    
    // Remove search marker from map
    if (window.searchMarker && typeof map !== 'undefined') {
        map.removeLayer(window.searchMarker);
        window.searchMarker = null;
    }
    
    // Reset to all contacts
    filteredContacts = [...allContacts];
    updateContactDisplay();
    
    // Hide search results
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    // Refresh map to show all contacts
    if (typeof window.mapUtils !== 'undefined') {
        window.mapUtils.refreshMap();
    }
    
    showMessage('All filters cleared', 'info');
}

function updateContactDisplay() {
    // Hide all contact rows first
    allContacts.forEach(contact => {
        contact.element.style.display = 'none';
    });
    
    // Show filtered contacts
    filteredContacts.forEach(contact => {
        contact.element.style.display = '';
    });
    
    // Update map markers to show only filtered contacts
    if (typeof window.mapUtils !== 'undefined') {
        window.mapUtils.clearMarkers();
        
        filteredContacts.forEach(contact => {
            if (contact.latitude !== 0 && contact.longitude !== 0) {
                window.mapUtils.addMarker(
                    contact.latitude, 
                    contact.longitude, 
                    `${contact.firstName} ${contact.lastName}`,
                    {
                        address: contact.address,
                        phone: contact.phone,
                        email: contact.email
                    }
                );
            }
        });
    }
    
    console.log(`Displaying ${filteredContacts.length} of ${allContacts.length} contacts`);
}

function updateSearchResults() {
    const searchResults = document.getElementById('searchResults');
    const searchResultsText = document.getElementById('searchResultsText');
    
    if (!searchResults || !searchResultsText) return;
    
    const firstNameQuery = document.getElementById('searchFirstName').value.trim();
    const lastNameQuery = document.getElementById('searchLastName').value.trim();
    const hasNameSearch = firstNameQuery || lastNameQuery;
    const hasLocationSearch = searchLocation !== null;
    
    if (hasNameSearch || hasLocationSearch) {
        let resultText = `Showing ${filteredContacts.length} of ${allContacts.length} contacts`;
        
        if (hasNameSearch) {
            const searchTerms = [];
            if (firstNameQuery) searchTerms.push(`first name: "${firstNameQuery}"`);
            if (lastNameQuery) searchTerms.push(`last name: "${lastNameQuery}"`);
            resultText += ` matching ${searchTerms.join(' and ')}`;
        }
        
        if (hasLocationSearch) {
            if (hasNameSearch) resultText += ' and';
            resultText += ` within ${searchLocation.radius} miles of ${searchLocation.address}`;
        }
        
        searchResultsText.textContent = resultText;
        searchResults.style.display = 'block';
    } else {
        searchResults.style.display = 'none';
    }
}

function showMessage(message, type = 'info') {
    if (typeof window.contactUtils !== 'undefined') {
        if (type === 'success') {
            window.contactUtils.showSuccessMessage(message);
        } else if (type === 'danger') {
            window.contactUtils.showErrorMessage(message);
        } else {
            window.contactUtils.showInfoMessage(message);
        }
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Export search functions
window.searchUtils = {
    performNameSearch,
    performLocationSearch,
    clearAllFilters,
    loadAllContacts
};
