import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { Client as HubSpotClient } from '@hubspot/api-client';
import SibApiV3Sdk from '@getbrevo/brevo';

// Load environment variables
dotenv.config();

// ESM workaround for __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(join(__dirname, '../public')));

// Initialize Database
const dataDir = join(__dirname, '../data');
const adapter = new JSONFile(join(dataDir, 'leads.json'));
const defaultData = { leads: [] };
const db = new Low(adapter, defaultData);

// Read data from JSON file
try {
    await db.read();
} catch (error) {
    console.log('⚠️  Could not read local database (expected on fresh Vercel deploy):', error.message);
}

// Initialize db.data if it doesn't exist
db.data ||= defaultData;

console.log('✅ Database initialized successfully');

// ===== EXTERNAL INTEGRATIONS SETUP =====

// HubSpot Client
let hubspotClient = null;
if (process.env.HUBSPOT_ACCESS_TOKEN) {
    hubspotClient = new HubSpotClient({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
    console.log('✅ HubSpot client initialized');
} else {
    console.log('⚠️  HubSpot not configured (missing HUBSPOT_ACCESS_TOKEN)');
}

// Brevo Client
let brevoApiInstance = null;
if (process.env.BREVO_API_KEY) {
    brevoApiInstance = new SibApiV3Sdk.ContactsApi();
    const apiKey = SibApiV3Sdk.ApiClient.instance.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    console.log('✅ Brevo client initialized');
} else {
    console.log('⚠️  Brevo not configured (missing BREVO_API_KEY)');
}

// ===== HELPERS =====

// Email validation
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Check if email exists
const emailExists = (email) => {
    return db.data.leads.some(lead => lead.email.toLowerCase() === email.toLowerCase());
};

// Get next ID
const getNextId = () => {
    if (db.data.leads.length === 0) return 1;
    return Math.max(...db.data.leads.map(lead => lead.id)) + 1;
};

// Write leads to CSV file
const writeLeadsToCSV = () => {
    try {
        const csvPath = join(__dirname, '../data/leads.csv');

        // CSV Headers
        const headers = ['ID', 'Nome', 'Email', 'Telefono', 'Azienda', 'Budget', 'Messaggio', 'Timestamp', 'IP Address', 'User Agent', 'Data Creazione'];

        // Convert leads to CSV rows
        const rows = db.data.leads.map(lead => {
            return [
                lead.id,
                `"${lead.name || ''}"`,
                lead.email || '',
                lead.phone || '',
                `"${lead.company || ''}"`,
                lead.budget || '',
                `"${(lead.message || '').replace(/"/g, '""')}"`, // Escape quotes in message
                lead.timestamp || '',
                lead.ipAddress || '',
                `"${(lead.userAgent || '').replace(/"/g, '""')}"`, // Escape quotes in user agent
                lead.createdAt || ''
            ].join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Write to file
        writeFileSync(csvPath, csvContent, 'utf-8');

        console.log(`📊 CSV file updated: ${db.data.leads.length} leads`);
    } catch (error) {
        console.error('⚠️  Error writing CSV file (expected on Vercel):', error.message);
    }
};

// Initialize CSV file with existing data
writeLeadsToCSV();

// ===== EXTERNAL INTEGRATIONS HELPERS =====

/**
 * Send lead data to HubSpot CRM
 * @param {Object} leadData - The lead data to send
 * @returns {Promise<boolean>} - Success status
 */
const sendToHubSpot = async (leadData) => {
    if (!hubspotClient) {
        console.log('⏭️  Skipping HubSpot (not configured)');
        return false;
    }

    try {
        const properties = {
            email: leadData.email,
            firstname: leadData.name.split(' ')[0] || leadData.name,
            lastname: leadData.name.split(' ').slice(1).join(' ') || '',
            phone: leadData.phone,
            company: leadData.company || '',
            notes_last_contacted: leadData.message || '',
            website: leadData.budget || ''
        };

        // Create or update contact
        const response = await hubspotClient.crm.contacts.basicApi.create({
            properties,
            associations: []
        });

        console.log(`✅ HubSpot: Contact created/updated (ID: ${response.id})`);
        return true;
    } catch (error) {
        // If contact already exists, update it
        if (error.code === 409) {
            try {
                // Get existing contact by email
                const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
                    filterGroups: [{
                        filters: [{
                            propertyName: 'email',
                            operator: 'EQ',
                            value: leadData.email
                        }]
                    }]
                });

                if (searchResponse.results && searchResponse.results.length > 0) {
                    const contactId = searchResponse.results[0].id;
                    await hubspotClient.crm.contacts.basicApi.update(contactId, {
                        properties: {
                            phone: leadData.phone,
                            company: leadData.company || '',
                            notes_last_contacted: leadData.message || ''
                        }
                    });
                    console.log(`✅ HubSpot: Contact updated (ID: ${contactId})`);
                    return true;
                }
            } catch (updateError) {
                console.error('❌ HubSpot update error:', updateError.message);
                return false;
            }
        }

        console.error('❌ HubSpot error:', error.message);
        return false;
    }
};

/**
 * Send lead data to Brevo mailing list
 * @param {Object} leadData - The lead data to send
 * @returns {Promise<boolean>} - Success status
 */
const sendToBrevo = async (leadData) => {
    if (!brevoApiInstance) {
        console.log('⏭️  Skipping Brevo (not configured)');
        return false;
    }

    try {
        const createContact = new SibApiV3Sdk.CreateContact();
        createContact.email = leadData.email;
        createContact.attributes = {
            FIRSTNAME: leadData.name.split(' ')[0] || leadData.name,
            LASTNAME: leadData.name.split(' ').slice(1).join(' ') || '',
            SMS: leadData.phone,
            COMPANY: leadData.company || '',
            MESSAGE: leadData.message || '',
            BUDGET: leadData.budget || ''
        };

        // Add to list if LIST_ID is configured
        if (process.env.BREVO_LIST_ID) {
            createContact.listIds = [parseInt(process.env.BREVO_LIST_ID)];
        }

        createContact.updateEnabled = true; // Update if contact already exists

        const response = await brevoApiInstance.createContact(createContact);
        console.log(`✅ Brevo: Contact created/updated (ID: ${response.id})`);
        return true;
    } catch (error) {
        // Contact already exists is not really an error for us
        if (error.response && error.response.body && error.response.body.code === 'duplicate_parameter') {
            console.log('✅ Brevo: Contact already exists (skipped)');
            return true;
        }

        console.error('❌ Brevo error:', error.message);
        return false;
    }
};

// ===== API ENDPOINTS =====

// GET - Serve the main page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../public/index.html'));
});

// POST - Submit new lead
app.post('/api/leads', async (req, res) => {
    try {
        const { name, email, phone, company, budget, message, timestamp } = req.body;

        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Nome, email e telefono sono campi obbligatori'
            });
        }

        // Email validation
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email non valida'
            });
        }

        // Check for duplicate email
        if (emailExists(email)) {
            return res.status(409).json({
                success: false,
                error: 'Questa email è già stata registrata'
            });
        }

        // Get client info
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Create new lead
        const newLead = {
            id: getNextId(),
            name,
            email: email.toLowerCase(),
            phone,
            company: company || null,
            budget: budget || null,
            message: message || null,
            timestamp: timestamp || new Date().toISOString(),
            ipAddress,
            userAgent,
            createdAt: new Date().toISOString()
        };

        // Add lead to database
        db.data.leads.push(newLead);

        // Write to JSON file
        try {
            await db.write();
        } catch (error) {
            console.error('⚠️  Error writing to JSON DB (expected on Vercel):', error.message);
        }

        // Write to CSV file
        writeLeadsToCSV();

        console.log(`✅ New lead saved: ${email} (ID: ${newLead.id})`);

        // Send to external integrations (non-blocking)
        // We don't await these - they run in background and don't block the response
        sendToHubSpot(newLead).catch(err => console.error('HubSpot background error:', err));
        sendToBrevo(newLead).catch(err => console.error('Brevo background error:', err));

        res.status(201).json({
            success: true,
            message: 'Lead salvato con successo!',
            leadId: newLead.id
        });

    } catch (error) {
        console.error('Error saving lead:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante il salvataggio. Riprova più tardi.'
        });
    }
});

// GET - Retrieve all leads (for admin purposes)
app.get('/api/leads', async (req, res) => {
    try {
        await db.read();
        const leads = [...db.data.leads].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({
            success: true,
            count: leads.length,
            leads: leads
        });
    } catch (error) {
        console.error('Error retrieving leads:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante il recupero dei lead'
        });
    }
});

// GET - Retrieve single lead by ID
app.get('/api/leads/:id', async (req, res) => {
    try {
        await db.read();
        const { id } = req.params;
        const lead = db.data.leads.find(lead => lead.id === parseInt(id));

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead non trovato'
            });
        }

        res.json({
            success: true,
            lead: lead
        });
    } catch (error) {
        console.error('Error retrieving lead:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante il recupero del lead'
        });
    }
});

// GET - Statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        await db.read();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalLeads = db.data.leads.length;
        const leadsToday = db.data.leads.filter(lead =>
            new Date(lead.createdAt) >= today
        ).length;
        const leadsThisWeek = db.data.leads.filter(lead =>
            new Date(lead.createdAt) >= weekAgo
        ).length;
        const leadsThisMonth = db.data.leads.filter(lead =>
            new Date(lead.createdAt) >= monthStart
        ).length;

        res.json({
            success: true,
            stats: {
                total: totalLeads,
                today: leadsToday,
                thisWeek: leadsThisWeek,
                thisMonth: leadsThisMonth
            }
        });
    } catch (error) {
        console.error('Error retrieving stats:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante il recupero delle statistiche'
        });
    }
});

// DELETE - Remove a lead (for admin purposes)
app.delete('/api/leads/:id', async (req, res) => {
    try {
        await db.read();
        const { id } = req.params;
        const initialLength = db.data.leads.length;

        db.data.leads = db.data.leads.filter(lead => lead.id !== parseInt(id));

        if (db.data.leads.length === initialLength) {
            return res.status(404).json({
                success: false,
                error: 'Lead non trovato'
            });
        }

        try {
            await db.write();
        } catch (error) {
            console.error('⚠️  Error writing to JSON DB (expected on Vercel):', error.message);
        }

        // Update CSV file
        writeLeadsToCSV();

        res.json({
            success: true,
            message: 'Lead eliminato con successo'
        });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante l\'eliminazione del lead'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint non trovato'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Errore interno del server'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 SocialBoost Server Running!      ║
╟────────────────────────────────────────╢
║   Port: ${PORT}                         ║
║   URL:  http://localhost:${PORT}        ║
║   DB:   JSON (leads.json)             ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});
