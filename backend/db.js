import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper functions to use async/await with sqlite3 callbacks
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables and seed default data
export async function initDatabase() {
  try {
    // 1. Profile Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS profile (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        location TEXT,
        state TEXT,
        lga TEXT,
        farmSize TEXT,
        crops TEXT,
        updatedAt INTEGER
      )
    `);

    // 2. Scans Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        diseaseId TEXT,
        fieldName TEXT,
        date TEXT,
        confidence INTEGER,
        treated INTEGER,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);

    // 3. Reminders Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        title TEXT,
        time TEXT,
        days TEXT,
        icon TEXT,
        enabled INTEGER,
        nextDue TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);

    // 4. Dealers Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS dealers (
        id INTEGER PRIMARY KEY,
        name TEXT,
        address TEXT,
        phone TEXT,
        distance TEXT,
        inStock INTEGER
      )
    `);

    // 5. Products Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        price TEXT,
        description TEXT,
        dosage TEXT,
        icon TEXT,
        color TEXT
      )
    `);

    console.log('Database tables verified/created successfully.');

    // Seed default dealers if empty
    const dealerCount = await dbGet('SELECT COUNT(*) as count FROM dealers');
    if (dealerCount.count === 0) {
      console.log('Seeding default FMN dealers...');
      const defaultDealers = [
        { id: 1, name: 'FMN AgriStore Ibadan', address: 'Ring Road, Ibadan, Oyo State', phone: '+234 802 345 6789', distance: '1.2km', inStock: 1 },
        { id: 2, name: 'FMN Agro Depot Lagos', address: 'Agege Motor Road, Lagos', phone: '+234 803 456 7890', distance: '3.4km', inStock: 1 },
        { id: 3, name: 'FMN Farm Inputs Abeokuta', address: 'Oke-Mosan, Abeokuta, Ogun State', phone: '+234 704 567 8901', distance: '5.7km', inStock: 0 },
        { id: 4, name: 'FMN AgriHub Ilorin', address: 'Tanke Road, Ilorin, Kwara State', phone: '+234 805 678 9012', distance: '8.1km', inStock: 1 },
        { id: 5, name: 'FMN Rural Inputs Ondo', address: 'Akure Road, Ondo Town', phone: '+234 706 789 0123', distance: '12.3km', inStock: 1 }
      ];

      for (const d of defaultDealers) {
        await dbRun(
          'INSERT OR IGNORE INTO dealers (id, name, address, phone, distance, inStock) VALUES (?, ?, ?, ?, ?, ?)',
          [d.id, d.name, d.address, d.phone, d.distance, d.inStock]
        );
      }
    }

    // Seed default products if empty
    const productCount = await dbGet('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
      console.log('Seeding default FMN products...');
      const defaultProducts = [
        { id: 'fmn-bioguard', name: 'FMN BioGuard Pro', category: 'Fungicide', price: '₦4,500', description: 'Broad-spectrum biological fungicide for fungal and viral diseases.', dosage: '2L/ha every 14 days', icon: '🧪', color: '#003087' },
        { id: 'fmn-whitefly', name: 'FMN WhiteFly Control', category: 'Insecticide', price: '₦3,200', description: 'Systemic insecticide for effective whitefly control.', dosage: '1.5L/ha', icon: '🐛', color: '#4527A0' },
        { id: 'fmn-stemguard', name: 'FMN StemGuard', category: 'Fungicide', price: '₦5,800', description: 'Systemic fungicide for stem and root protection.', dosage: '3L/ha at planting', icon: '🌿', color: '#BF360C' },
        { id: 'fmn-npk', name: 'FMN NPK 15-15-15', category: 'Fertilizer', price: '₦18,500/50kg', description: 'Balanced compound fertilizer for strong crop establishment.', dosage: '200kg/ha', icon: '⚗️', color: '#E65100' },
        { id: 'fmn-urea', name: 'FMN Urea (46% N)', category: 'Fertilizer', price: '₦14,000/50kg', description: 'High-nitrogen fertilizer for rapid correction of deficiency.', dosage: '50kg/ha top-dress', icon: '💊', color: '#1565C0' },
        { id: 'fmn-growboost', name: 'FMN GrowBoost', category: 'Foliar', price: '₦2,800', description: 'Micronutrient foliar spray for rapid plant recovery and vigour.', dosage: '500ml/ha monthly', icon: '🌱', color: '#2E7D32' },
        { id: 'fmn-rootboost', name: 'FMN RootBoost', category: 'Root Stimulant', price: '₦3,600', description: 'Root stimulant to strengthen tuber formation.', dosage: '1L/ha at planting', icon: '🥬', color: '#558B2F' }
      ];

      for (const p of defaultProducts) {
        await dbRun(
          'INSERT OR IGNORE INTO products (id, name, category, price, description, dosage, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [p.id, p.name, p.category, p.price, p.description, p.dosage, p.icon, p.color]
        );
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
