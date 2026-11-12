require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/config/db');

function formatLocalDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seed() {
  try {
    console.log('Starting database seed...');

    const demoEmail = 'demo@sweety.com';
    const demoPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    // 1. Insert or fetch demo user
    let userRes = await db.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      console.log('Demo user already exists. Resetting sample readings...');
      await db.query('DELETE FROM readings WHERE user_id = $1', [userId]);
    } else {
      const insertUser = await db.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
        ['Demo Patient', demoEmail, hashedPassword]
      );
      userId = insertUser.rows[0].id;
      console.log('Created demo user:', demoEmail);
    }

    // 2. Generate sample dates (Today, 2 days ago, and previous month)
    const today = new Date();
    const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 2));
    const prevMonthDay1 = new Date(today.getFullYear(), today.getMonth() - 1, 5);
    const prevMonthDay2 = new Date(today.getFullYear(), today.getMonth() - 1, 18);

    const sampleReadings = [
      // Today's readings (3 of 4 slots filled so user can test adding the 4th slot)
      { level: 94, timing: 'Morning (fasting)', notes: 'Slept well', date: formatLocalDate(today) },
      { level: 138, timing: 'After breakfast', notes: 'Oats and fruit', date: formatLocalDate(today) },
      { level: 126, timing: 'After lunch', notes: 'Dal, roti, salad', date: formatLocalDate(today) },

      // Earlier this month (for Month-to-Date report)
      { level: 98, timing: 'Morning (fasting)', notes: 'Morning walk', date: formatLocalDate(twoDaysAgo) },
      { level: 145, timing: 'After dinner', notes: 'Light dinner', date: formatLocalDate(twoDaysAgo) },

      // Previous month (for Monthly report)
      { level: 102, timing: 'Morning (fasting)', notes: 'Fasting check', date: formatLocalDate(prevMonthDay1) },
      { level: 152, timing: 'After lunch', notes: 'Rice meal', date: formatLocalDate(prevMonthDay1) },
      { level: 89, timing: 'Morning (fasting)', notes: 'Normal fasting', date: formatLocalDate(prevMonthDay2) },
      { level: 131, timing: 'After dinner', notes: 'Evening soup', date: formatLocalDate(prevMonthDay2) },
    ];

    for (const r of sampleReadings) {
      await db.query(
        'INSERT INTO readings (user_id, sugar_level, timing, notes, created_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, r.level, r.timing, r.notes, r.date]
      );
    }

    console.log(`Inserted ${sampleReadings.length} sample readings.`);
    console.log('Seed complete! Login with:');
    console.log(`Email: ${demoEmail}`);
    console.log(`Password: ${demoPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();