require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Connecting to database...');
    
    // Drop existing tables to ensure clean schema alignment
    await pool.query(`
      DROP TABLE IF EXISTS readings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE readings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        slot VARCHAR(50) NOT NULL,
        sugar_level INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tables created successfully.');

    // Insert demo user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['Demo User', 'demo@sweety.com', hashedPassword]
    );
    const userId = userResult.rows[0].id;
    console.log(`Created demo user with ID: ${userId}`);

    // Insert sample readings
    const sampleReadings = [
      { date: '2026-11-01', slot: 'Morning (fasting)', value: 95 },
      { date: '2026-11-01', slot: 'After breakfast', value: 140 },
      { date: '2026-11-02', slot: 'Morning (fasting)', value: 102 },
      { date: '2026-11-02', slot: 'After lunch', value: 155 },
    ];

    for (const r of sampleReadings) {
      await pool.query(
        'INSERT INTO readings (user_id, date, slot, sugar_level) VALUES ($1, $2, $3, $4)',
        [userId, r.date, r.slot, r.value]
      );
    }
    console.log('Sample readings inserted successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();