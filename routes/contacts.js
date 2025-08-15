const express = require('express');
const router = express.Router();
const geo = require('node-geocoder');
const { requireAuth } = require('../middleware/auth');

// Configure geocoder with OpenStreetMap (no API key needed)
const geocoder = geo({
    provider: 'openstreetmap',
    headers: { 
        'user-agent': 'Contact Manager App <contact@yourapp.com>' // Replace with your email
    }
});

// GET /contacts/add - Show add contact form (requires authentication)
router.get('/add', requireAuth, (req, res) => {
    res.render('add-contact', {
        title: 'Add Contact',
        currentPage: 'add',
        user: req.session.user,
        isAuthenticated: true
    });
});

// POST /contacts - Create new contact with geocoding
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            title, firstName, lastName, address, phone, email,
            contactByMail, contactByPhone, contactByEmail
        } = req.body;
        
        console.log('Creating new contact:', { firstName, lastName, address });
        
        // Validate required fields
        if (!firstName || !lastName) {
            return res.redirect('/contacts/add?error=' + encodeURIComponent('First name and last name are required.'));
        }
        
        let latitude = 0;
        let longitude = 0;
        let geocodedAddress = address || '';
        
        // Perform geocoding if address is provided
        if (address && address.trim()) {
            try {
                console.log(`Geocoding address: ${address}`);
                const result = await geocoder.geocode(address.trim());
                
                if (result.length > 0) {
                    latitude = result[0].latitude;
                    longitude = result[0].longitude;
                    // Use the properly formatted address from geocoder
                    geocodedAddress = result[0].formattedAddress || address;
                    
                    console.log(`Geocoded successfully: ${latitude}, ${longitude} - ${geocodedAddress}`);
                } else {
                    console.log('No geocoding results found, using lat=0, lng=0');
                    geocodedAddress = address; // Keep original address if geocoding fails
                }
            } catch (geocodeError) {
                console.error('Geocoding error:', geocodeError);
                // Continue with lat=0, lng=0 if geocoding fails
                geocodedAddress = address;
            }
        }
        
        // Prepare contact data
        const contactData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address: geocodedAddress,
            phone: phone ? phone.trim() : '',
            email: email ? email.trim() : '',
            title: title || '',
            contactByMail: Boolean(contactByMail),
            contactByPhone: Boolean(contactByPhone),
            contactByEmail: Boolean(contactByEmail),
            latitude: latitude,
            longitude: longitude
        };
        
        // Create contact in database
        const contactId = await req.db.createContact(contactData);
        
        console.log(`Contact created successfully: ${contactData.firstName} ${contactData.lastName} (ID: ${contactId})`);
        
        // Success message with geocoding info
        let successMessage = `Contact "${contactData.firstName} ${contactData.lastName}" added successfully!`;
        if (latitude !== 0 && longitude !== 0) {
            successMessage += ' Address was located on the map.';
        } else if (address && address.trim()) {
            successMessage += ' Address could not be located for mapping.';
        }
        
        res.redirect('/?success=' + encodeURIComponent(successMessage));
        
    } catch (error) {
        console.error('Error creating contact:', error);
        res.redirect('/contacts/add?error=' + encodeURIComponent('Failed to create contact. Please try again.'));
    }
});

// GET /contacts/:id/edit - Show edit contact form (requires authentication)
router.get('/:id/edit', requireAuth, async (req, res) => {
    try {
        const contactId = req.params.id;
        const contact = await req.db.findContactById(contactId);
        
        if (!contact) {
            return res.redirect('/?error=' + encodeURIComponent('Contact not found.'));
        }
        
        // Convert database boolean fields to actual booleans
        const processedContact = {
            ...contact,
            contactByMail: Boolean(contact.contactByMail),
            contactByPhone: Boolean(contact.contactByPhone),
            contactByEmail: Boolean(contact.contactByEmail)
        };
        
        res.render('edit-contact', {
            title: `Edit ${contact.firstName} ${contact.lastName}`,
            currentPage: 'edit',
            contact: processedContact,
            user: req.session.user,
            isAuthenticated: true
        });
        
    } catch (error) {
        console.error('Error loading contact for edit:', error);
        res.redirect('/?error=' + encodeURIComponent('Failed to load contact.'));
    }
});

// POST /contacts/:id - Update existing contact (handles both PUT and POST)
router.post('/:id', requireAuth, async (req, res) => {
    try {
        const contactId = req.params.id;
        const {
            title, firstName, lastName, address, phone, email,
            contactByMail, contactByPhone, contactByEmail, _method
        } = req.body;
        
        console.log(`Updating contact ID: ${contactId}`);
        
        // Check if contact exists
        const existingContact = await req.db.findContactById(contactId);
        if (!existingContact) {
            return res.redirect('/?error=' + encodeURIComponent('Contact not found.'));
        }
        
        // Validate required fields
        if (!firstName || !lastName) {
            return res.redirect(`/contacts/${contactId}/edit?error=` + encodeURIComponent('First name and last name are required.'));
        }
        
        let latitude = existingContact.latitude || 0;
        let longitude = existingContact.longitude || 0;
        let geocodedAddress = address || '';
        
        // Perform geocoding if address changed and is not empty
        const addressChanged = (address || '').trim() !== (existingContact.address || '').trim();
        
        if (address && address.trim() && addressChanged) {
            try {
                console.log(`Re-geocoding changed address: ${address}`);
                const result = await geocoder.geocode(address.trim());
                
                if (result.length > 0) {
                    latitude = result[0].latitude;
                    longitude = result[0].longitude;
                    geocodedAddress = result[0].formattedAddress || address;
                    
                    console.log(`Re-geocoded successfully: ${latitude}, ${longitude} - ${geocodedAddress}`);
                } else {
                    console.log('No geocoding results found for updated address');
                    geocodedAddress = address;
                    // Keep existing coordinates if new address can't be geocoded
                }
            } catch (geocodeError) {
                console.error('Geocoding error on update:', geocodeError);
                geocodedAddress = address;
                // Keep existing coordinates if geocoding fails
            }
        } else if (!address || !address.trim()) {
            // If address is cleared, reset coordinates
            latitude = 0;
            longitude = 0;
            geocodedAddress = '';
        }
        
        // Prepare updated contact data
        const contactData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address: geocodedAddress,
            phone: phone ? phone.trim() : '',
            email: email ? email.trim() : '',
            title: title || '',
            contactByMail: Boolean(contactByMail),
            contactByPhone: Boolean(contactByPhone),
            contactByEmail: Boolean(contactByEmail),
            latitude: latitude,
            longitude: longitude
        };
        
        // Update contact in database
        await req.db.updateContact(contactId, contactData);
        
        console.log(`Contact updated successfully: ${contactData.firstName} ${contactData.lastName}`);
        
        // Success message
        let successMessage = `Contact "${contactData.firstName} ${contactData.lastName}" updated successfully!`;
        if (addressChanged && latitude !== 0 && longitude !== 0) {
            successMessage += ' New address was located on the map.';
        } else if (addressChanged && address && address.trim()) {
            successMessage += ' New address could not be located for mapping.';
        }
        
        res.redirect('/?success=' + encodeURIComponent(successMessage));
        
    } catch (error) {
        console.error('Error updating contact:', error);
        const contactId = req.params.id;
        res.redirect(`/contacts/${contactId}/edit?error=` + encodeURIComponent('Failed to update contact. Please try again.'));
    }
});

// DELETE /contacts/:id - Delete contact (requires authentication)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const contactId = req.params.id;
        
        console.log(`Deleting contact ID: ${contactId}`);
        
        // Check if contact exists and get name for confirmation
        const contact = await req.db.findContactById(contactId);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }
        
        // Delete the contact
        await req.db.deleteContact(contactId);
        
        console.log(`Contact deleted successfully: ${contact.firstName} ${contact.lastName}`);
        
        // Return success response for AJAX
        res.json({
            success: true,
            message: `Contact "${contact.firstName} ${contact.lastName}" deleted successfully.`
        });
        
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete contact'
        });
    }
});

// GET /contacts/:id - View single contact (optional - for future use)
router.get('/:id', async (req, res) => {
    try {
        const contactId = req.params.id;
        const contact = await req.db.findContactById(contactId);
        
        if (!contact) {
            return res.redirect('/?error=' + encodeURIComponent('Contact not found.'));
        }
        
        // Convert database boolean fields
        const processedContact = {
            ...contact,
            contactByMail: Boolean(contact.contactByMail),
            contactByPhone: Boolean(contact.contactByPhone),
            contactByEmail: Boolean(contact.contactByEmail)
        };
        
        res.render('view-contact', {
            title: `${contact.firstName} ${contact.lastName}`,
            currentPage: 'view',
            contact: processedContact,
            user: req.session.user,
            isAuthenticated: !!req.session.user
        });
        
    } catch (error) {
        console.error('Error loading contact:', error);
        res.redirect('/?error=' + encodeURIComponent('Failed to load contact.'));
    }
});

// API endpoint for searching contacts (for future search features)
router.get('/api/search', async (req, res) => {
    try {
        const { q, firstName, lastName } = req.query;
        let contacts = await req.db.findAllContacts();
        
        // Filter by search query
        if (q) {
            const query = q.toLowerCase();
            contacts = contacts.filter(contact => 
                contact.firstName.toLowerCase().includes(query) ||
                contact.lastName.toLowerCase().includes(query) ||
                (contact.email && contact.email.toLowerCase().includes(query)) ||
                (contact.address && contact.address.toLowerCase().includes(query))
            );
        }
        
        // Filter by first name
        if (firstName) {
            const fname = firstName.toLowerCase();
            contacts = contacts.filter(contact => 
                contact.firstName.toLowerCase().includes(fname)
            );
        }
        
        // Filter by last name
        if (lastName) {
            const lname = lastName.toLowerCase();
            contacts = contacts.filter(contact => 
                contact.lastName.toLowerCase().includes(lname)
            );
        }
        
        res.json({
            success: true,
            contacts: contacts,
            count: contacts.length
        });
        
    } catch (error) {
        console.error('Error searching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

module.exports = router;
