# SocialBoost Landing Page - Database & CRM Integration

## 🚀 Avvio Rapido

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Configura le integrazioni (opzionale)
Copia il file `.env.example` in `.env` e inserisci le tue credenziali:
```bash
cp .env.example .env
```

Modifica `.env` con le tue API keys:
```env
HUBSPOT_ACCESS_TOKEN=pat-na1-your-token-here
BREVO_API_KEY=xkeysib-your-api-key-here
BREVO_LIST_ID=5  # Opzionale
```

### 3. Avvia il server
```bash
npm start
```

Il server sarà disponibile su: **http://localhost:3000**

## 🔗 Integrazioni CRM e Mailing List

### HubSpot CRM
Ogni lead inviato tramite il form viene **automaticamente creato come contatto in HubSpot CRM**.

**Configurazione:**
1. Vai su [HubSpot Settings → Integrations → Private Apps](https://app.hubspot.com/l/settings/)
2. Crea una nuova Private App
3. Assegna permessi: `crm.objects.contacts.write` e `crm.objects.contacts.read`
4. Copia l'Access Token
5. Incollalo nel file `.env` come `HUBSPOT_ACCESS_TOKEN`

**Campi mappati:**
- Nome → `firstname` / `lastname`
- Email → `email`
- Telefono → `phone`
- Azienda → `company`
- Messaggio → `notes_last_contacted`
- Budget → `website` (campo personalizzabile)

**Gestione duplicati:** Se un contatto con la stessa email esiste già, viene aggiornato invece che creato.

### Brevo (ex Sendinblue)
I contatti vengono aggiunti automaticamente alla mailing list di **Brevo**.

**Configurazione:**
1. Vai su [Brevo → SMTP & API → API Keys](https://app.brevo.com/settings/keys/api)
2. Crea una nuova API key
3. Copia la chiave
4. Incollala nel file `.env` come `BREVO_API_KEY`
5. (Opzionale) Specifica un `BREVO_LIST_ID` per aggiungere i contatti a una lista specifica

**Campi mappati:**
- Nome → `FIRSTNAME` / `LASTNAME`
- Email → `email`
- Telefono → `SMS`
- Azienda → `COMPANY`
- Messaggio → `MESSAGE`
- Budget → `BUDGET`

**Gestione duplicati:** I contatti esistenti vengono aggiornati automaticamente.

### Strategia di Fallback
⚠️ **Importante:** Le integrazioni sono **opzionali** e **non bloccanti**.

- Se HubSpot o Brevo non sono configurati, vengono saltati
- Se le API esterne falliscono, il lead viene comunque salvato localmente
- Gli errori vengono loggati ma non impediscono il salvataggio del lead
- L'utente riceve sempre una risposta di successo se il salvataggio locale funziona

## 📦 Cosa è stato creato

### Backend
- **src/server.js**: Server Express con API REST e integrazioni CRM
- **data/leads.json**: Database JSON locale
- **data/leads.csv**: Export CSV automatico
- **package.json**: Configurazione dipendenze
- **.env**: Configurazione credenziali (da creare)

### API Endpoints

#### Salvataggio Lead
```
POST /api/leads
```
Body:
```json
{
  "name": "Mario Rossi",
  "email": "mario@esempio.it",
  "phone": "+39 333 123 4567",
  "company": "Azienda SRL",
  "budget": "2500-5000",
  "message": "Voglio aumentare la mia presenza online"
}
```

#### Visualizza tutti i Lead
```
GET /api/leads
```

#### Visualizza Lead specifico
```
GET /api/leads/:id
```

#### Statistiche
```
GET /api/stats
```
Ritorna: totale lead, lead oggi, settimana, mese

#### Elimina Lead
```
DELETE /api/leads/:id
```

#### Health Check
```
GET /api/health
```

## 🗄️ Struttura Database

I lead vengono salvati in 3 formati:
1. **JSON** (`data/leads.json`) - Database principale
2. **CSV** (`data/leads.csv`) - Export automatico
3. **HubSpot CRM** - Sincronizzazione automatica (se configurato)
4. **Brevo Contacts** - Mailing list automatica (se configurato)

Campi salvati:
- `id` - ID univoco (auto-increment)
- `name` - Nome completo (obbligatorio)
- `email` - Email (obbligatorio, unico)
- `phone` - Telefono (obbligatorio)
- `company` - Nome azienda (opzionale)
- `budget` - Budget mensile (opzionale)
- `message` - Messaggio (opzionale)
- `timestamp` - Timestamp invio form
- `ipAddress` - Indirizzo IP cliente
- `userAgent` - User agent browser
- `createdAt` - Data creazione record

## 🔧 Comandi Utili

### Visualizza tutti i lead (tramite API)
```bash
curl http://localhost:3000/api/leads
```

### Visualizza statistiche
```bash
curl http://localhost:3000/api/stats
```

### Test invio lead
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+39 123 456 7890"
  }'
```

## ✨ Funzionalità

- ✅ **Salvataggio locale** in JSON e CSV
- ✅ **Integrazione HubSpot CRM** (opzionale)
- ✅ **Integrazione Brevo mailing list** (opzionale)
- ✅ Validazione email lato server
- ✅ Protezione da email duplicate
- ✅ Gestione errori completa con fallback
- ✅ Tracciamento IP e User Agent
- ✅ API RESTful complete
- ✅ Feedback utente in tempo reale

## 📊 Visualizzare i Lead Salvati

I lead possono essere visualizzati in 4 modi:

1. **API REST**: `http://localhost:3000/api/leads`
2. **File JSON**: `data/leads.json`
3. **File CSV**: `data/leads.csv` (importabile in Excel/Google Sheets)
4. **HubSpot Dashboard**: [app.hubspot.com](https://app.hubspot.com)
5. **Brevo Dashboard**: [app.brevo.com](https://app.brevo.com)

## 🛠️ Development Mode

Per avviare in modalità development con auto-reload:
```bash
npm run dev
```

## 🔒 Sicurezza

- Email univoche (no duplicati)
- Validazione input lato server
- Sanitizzazione automatica dati
- CORS configurato
- Gestione errori robusta
- Credenziali in file `.env` (non committato su Git)
- API keys protette con `.gitignore`

## 📚 Documentazione Ufficiale

- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [Brevo API Documentation](https://developers.brevo.com/)
- [Express.js](https://expressjs.com/)
- [LowDB](https://github.com/typicode/lowdb)

