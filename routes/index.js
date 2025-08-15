const express = require('express');
const router = express.Router();

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

// Health check endpoint (useful for deployment monitoring)
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
