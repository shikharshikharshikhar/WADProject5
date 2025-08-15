const express = require('express');
const router = express.Router();
const geo = require('node-geocoder');

// Configure geocoder for search functionality
const geocoder = geo({
    provider: 'openstreetmap',
    headers: { 
        'user-agent': 'Contact Manager App <contact@yourapp.com>' // Replace with your email
    }
});

// Home page - displays all contacts and map

// Home page - displays all contacts and map
router.get('/', async (req, res) => {
    try {
        console.log('Loading home page...');
        
        // Get all contacts from database
        const contacts = await req.db.findAllContacts();
        
        console.log(`Found ${contacts.length} contacts`);
        
        // Convert database boolean fields (stored as integers) to actual booleans
        const processedContacts = contacts.map(contact => ({
            ...contact,
            contactByMail: Boolean(contact.contactByMail),
            contactByPhone: Boolean(contact.contactByPhone),
            contactByEmail: Boolean(contact.contactByEmail)
        }));
        
        // Render the home page with contacts data
        res.render('index', {
            title: 'Contact Manager',
            currentPage: 'home',
            contacts: processedContacts,
            user: req.session.user || null,
            isAuthenticated: !!req.session.user
        });
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        
        // Render error page or show empty state
        res.render('index', {
            title: 'Contact Manager',
            currentPage: 'home',
            contacts: [],
            error: 'Unable to load contacts. Please try refreshing the page.',
            user: req.session.user || null,
            isAuthenticated: !!req.session.user
        });
    }
});

// API endpoint to get contacts as JSON (for AJAX requests)
router.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await req.db.findAllContacts();
        
        // Process contacts for JSON response
        const processedContacts = contacts.map(contact => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            address: contact.address,
            phone: contact.phone,
            email: contact.email,
            title: contact.title,
            contactByMail: Boolean(contact.contactByMail),
            contactByPhone: Boolean(contact.contactByPhone),
            contactByEmail: Boolean(contact.contactByEmail),
            latitude: contact.latitude,
            longitude: contact.longitude
        }));
        
        res.json({
            success: true,
            contacts: processedContacts,
            count: processedContacts.length
        });
        
    } catch (error) {
        console.error('Error fetching contacts via API:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts',
            contacts: []
        });
    }
});

// About page (optional - you can add this later)
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About',
        currentPage: 'about',
        user: req.session.user || null,
        isAuthenticated: !!req.session.user
    });
});

// Geocoding API endpoint for search functionality
router.post('/api/geocode', async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address || !address.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Address is required'
            });
        }
        
        console.log(`Geocoding search address: ${address}`);
        
        const result = await geocoder.geocode(address.trim());
        
        if (result.length > 0) {
            const location = result[0];
            res.json({
                success: true,
                latitude: location.latitude,
                longitude: location.longitude,
                formattedAddress: location.formattedAddress || address,
                city: location.city,
                state: location.administrativeLevels?.level1short,
                country: location.country
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Address not found'
            });
        }
        
    } catch (error) {
        console.error('Geocoding API error:', error);
        res.status(500).json({
            success: false,
            error: 'Geocoding failed'
        });
    }
});

// Health check endpoint (useful for deployment monitoring)
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
