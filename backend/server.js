import express from 'express';
import cors from 'cors';
import { 
  initDatabase, 
  dbRun, 
  dbGet, 
  dbAll 
} from './db.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Endpoint to fetch dynamic products list
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbAll('SELECT * FROM products');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Database error fetching products' });
  }
});

// Endpoint to fetch dynamic dealers list
app.get('/api/dealers', async (req, res) => {
  try {
    const dealers = await dbAll('SELECT * FROM dealers');
    // Convert inStock integer back to boolean for client
    const clientDealers = dealers.map(d => ({
      ...d,
      inStock: Boolean(d.inStock)
    }));
    res.json(clientDealers);
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ error: 'Database error fetching dealers' });
  }
});

// Full state reconciliation fetch (for new devices or page refresh)
app.get('/api/state', async (req, res) => {
  try {
    const profile = await dbGet('SELECT * FROM profile WHERE id = ?', ['farmer_profile']) || null;
    const scans = await dbAll('SELECT * FROM scans');
    const reminders = await dbAll('SELECT * FROM reminders');
    
    // Map SQLite boolean representations (0/1) to actual booleans for JavaScript client
    const formattedScans = scans.map(s => ({ ...s, treated: Boolean(s.treated) }));
    const formattedReminders = reminders.map(r => ({ ...r, enabled: Boolean(r.enabled) }));

    res.json({
      profile,
      scans: formattedScans,
      reminders: formattedReminders
    });
  } catch (error) {
    console.error('Error fetching full state:', error);
    res.status(500).json({ error: 'Database error fetching state' });
  }
});

// Main Offline Sync Endpoint
app.post('/api/sync', async (req, res) => {
  const { profile, scans, reminders } = req.body;

  try {
    // 1. Sync Profile (Last Write Wins)
    if (profile) {
      const existing = await dbGet('SELECT updatedAt FROM profile WHERE id = ?', ['farmer_profile']);
      if (!existing || !existing.updatedAt || profile.updatedAt > existing.updatedAt) {
        await dbRun(
          `INSERT OR REPLACE INTO profile (id, name, phone, location, state, lga, farmSize, crops, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'farmer_profile',
            profile.name || '',
            profile.phone || '',
            profile.location || '',
            profile.state || '',
            profile.lga || '',
            profile.farmSize || '',
            profile.crops || '',
            profile.updatedAt || Date.now()
          ]
        );
      }
    }

    // 2. Sync Scans (Upserts and Deletes)
    if (scans) {
      const { upsert = [], delete: deletes = [] } = scans;
      
      // Perform deletes
      for (const id of deletes) {
        await dbRun('DELETE FROM scans WHERE id = ?', [id]);
      }

      // Perform upserts using ON CONFLICT for SQLite >= 3.24
      for (const s of upsert) {
        await dbRun(
          `INSERT INTO scans (id, diseaseId, fieldName, date, confidence, treated, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             diseaseId = excluded.diseaseId,
             fieldName = excluded.fieldName,
             date = excluded.date,
             confidence = excluded.confidence,
             treated = excluded.treated,
             updatedAt = excluded.updatedAt
           WHERE excluded.updatedAt > scans.updatedAt`,
          [
            s.id,
            s.diseaseId,
            s.fieldName || '',
            s.date || '',
            s.confidence || 0,
            s.treated ? 1 : 0,
            s.createdAt || Date.now(),
            s.updatedAt || Date.now()
          ]
        );
      }
    }

    // 3. Sync Reminders (Upserts and Deletes)
    if (reminders) {
      const { upsert = [], delete: deletes = [] } = reminders;

      // Perform deletes
      for (const id of deletes) {
        await dbRun('DELETE FROM reminders WHERE id = ?', [id]);
      }

      // Perform upserts
      for (const r of upsert) {
        await dbRun(
          `INSERT INTO reminders (id, title, time, days, icon, enabled, nextDue, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             time = excluded.time,
             days = excluded.days,
             icon = excluded.icon,
             enabled = excluded.enabled,
             nextDue = excluded.nextDue,
             updatedAt = excluded.updatedAt
           WHERE excluded.updatedAt > reminders.updatedAt`,
          [
            r.id,
            r.title,
            r.time || '',
            r.days || '',
            r.icon || '',
            r.enabled ? 1 : 0,
            r.nextDue || '',
            r.createdAt || Date.now(),
            r.updatedAt || Date.now()
          ]
        );
      }
    }

    // Fetch the fully updated data to return to the client
    const updatedProfile = await dbGet('SELECT * FROM profile WHERE id = ?', ['farmer_profile']) || null;
    const allScans = await dbAll('SELECT * FROM scans');
    const allReminders = await dbAll('SELECT * FROM reminders');

    const formattedScans = allScans.map(s => ({ ...s, treated: Boolean(s.treated) }));
    const formattedReminders = allReminders.map(r => ({ ...r, enabled: Boolean(r.enabled) }));

    res.json({
      success: true,
      profile: updatedProfile,
      scans: formattedScans,
      reminders: formattedReminders
    });
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ error: 'Sync server processing error' });
  }
});

// Health check for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FMN AgriSense Backend', timestamp: new Date().toISOString() });
});

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`FMN AgriSense backend listening at http://0.0.0.0:${port}`);
  });
});
