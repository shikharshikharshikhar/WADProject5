require('dotenv').config();
const Database = require('dbcmps369');
const bcrypt = require('bcrypt');

class ContactDB {
    constructor() {
        this.db = new Database();
    }

    async initialize() {
        await this.db.connect();
        
        // Create Users table
        await this.db.schema('User', [
            { name: 'id', type: 'INTEGER' },
            { name: 'username', type: 'TEXT' },
            { name: 'passwordHash', type: 'TEXT' }
        ], 'id');

        // Create Contacts table
        await this.db.schema('Contact', [
            { name: 'id', type: 'INTEGER' },
            { name: 'firstName', type: 'TEXT' },
            { name: 'lastName', type: 'TEXT' },
            { name: 'address', type: 'TEXT' },
            { name: 'phone', type: 'TEXT' },
            { name: 'email', type: 'TEXT' },
            { name: 'title', type: 'TEXT' },
            { name: 'contactByMail', type: 'INTEGER' }, // 0 or 1 for boolean
            { name: 'contactByPhone', type: 'INTEGER' },
            { name: 'contactByEmail', type: 'INTEGER' },
            { name: 'latitude', type: 'REAL' },
            { name: 'longitude', type: 'REAL' }
        ], 'id');

        // Create default user if it doesn't exist
        await this.createDefaultUser();
    }

    async createDefaultUser() {
        try {
            const existing = await this.db.read('User', [{ column: 'username', value: 'rcnj' }]);
            if (existing.length === 0) {
                const hashedPassword = await bcrypt.hash('password', 10);
                await this.db.create('User', [
                    { column: 'username', value: 'rcnj' },
                    { column: 'passwordHash', value: hashedPassword }
                ]);
                console.log('Default user created: rcnj/password');
            }
        } catch (error) {
            console.error('Error creating default user:', error);
        }
    }

    // User methods
    async findUserByUsername(username) {
        const users = await this.db.read('User', [{ column: 'username', value: username }]);
        return users.length > 0 ? users[0] : null;
    }

    async createUser(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = await this.db.create('User', [
            { column: 'username', value: username },
            { column: 'passwordHash', value: hashedPassword }
        ]);
        return id;
    }

    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Contact methods
    async findAllContacts() {
        const contacts = await this.db.read('Contact', []);
        return contacts;
    }

    async findContactById(id) {
        const contacts = await this.db.read('Contact', [{ column: 'id', value: id }]);
        return contacts.length > 0 ? contacts[0] : null;
    }

    async createContact(contactData) {
        const {
            firstName, lastName, address, phone, email, title,
            contactByMail, contactByPhone, contactByEmail,
            latitude, longitude
        } = contactData;

        const id = await this.db.create('Contact', [
            { column: 'firstName', value: firstName },
            { column: 'lastName', value: lastName },
            { column: 'address', value: address },
            { column: 'phone', value: phone },
            { column: 'email', value: email },
            { column: 'title', value: title },
            { column: 'contactByMail', value: contactByMail ? 1 : 0 },
            { column: 'contactByPhone', value: contactByPhone ? 1 : 0 },
            { column: 'contactByEmail', value: contactByEmail ? 1 : 0 },
            { column: 'latitude', value: latitude || 0 },
            { column: 'longitude', value: longitude || 0 }
        ]);
        return id;
    }

    async updateContact(id, contactData) {
        const {
            firstName, lastName, address, phone, email, title,
            contactByMail, contactByPhone, contactByEmail,
            latitude, longitude
        } = contactData;

        await this.db.update('Contact', 
            [
                { column: 'firstName', value: firstName },
                { column: 'lastName', value: lastName },
                { column: 'address', value: address },
                { column: 'phone', value: phone },
                { column: 'email', value: email },
                { column: 'title', value: title },
                { column: 'contactByMail', value: contactByMail ? 1 : 0 },
                { column: 'contactByPhone', value: contactByPhone ? 1 : 0 },
                { column: 'contactByEmail', value: contactByEmail ? 1 : 0 },
                { column: 'latitude', value: latitude || 0 },
                { column: 'longitude', value: longitude || 0 }
            ],
            [{ column: 'id', value: id }]
        );
    }

    async deleteContact(id) {
        await this.db.delete('Contact', [{ column: 'id', value: id }]);
    }
}

module.exports = ContactDB;
