const db = require('../config/db');

const VALID_SLOTS = ['Morning (fasting)', 'After breakfast', 'After lunch', 'After dinner'];

async function addReading(req, res) {
  try {
    const { user_id, sugar_level, timing, date } = req.body;

    if (sugar_level === undefined || sugar_level === null || sugar_level === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }

    const numericValue = Number(sugar_level);

    if (isNaN(numericValue) || numericValue < 40 || numericValue > 600 || !Number.isInteger(numericValue)) {
      return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
    }

    if (!VALID_SLOTS.includes(timing)) {
      return res.status(400).json({ error: 'Invalid timing slot.' });
    }

    const readingDate = date ? new Date(date) : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(readingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date.' });
    }

    if (readingDate > today) {
      return res.status(400).json({ error: 'Date cannot be in the future.' });
    }

    const formattedDate = readingDate.toISOString().split('T')[0];

    const existingReadings = await db.query(
      'SELECT * FROM readings WHERE user_id = $1 AND date = $2',
      [user_id, formattedDate]
    );

    if (existingReadings.rows.length >= 4) {
      return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }

    const slotExists = existingReadings.rows.some((r) => r.slot === timing);
    if (slotExists) {
      return res.status(400).json({ error: `You already have an ${timing} reading for this date.` });
    }

    await db.query(
      'INSERT INTO readings (user_id, sugar_level, slot, date) VALUES ($1, $2, $3, $4)',
      [user_id, numericValue, timing, formattedDate]
    );

    res.status(201).json({ message: 'Reading added successfully' });
  } catch (err) {
    console.error('Add reading error:', err.message);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
}

async function getReadings(req, res) {
  try {
    const { userId } = req.params;
    const result = await db.query(
      'SELECT id, user_id, sugar_level, slot AS timing, date, created_at FROM readings WHERE user_id = $1 ORDER BY date DESC, id DESC',
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get readings error:', err.message);
    res.status(500).json({ error: 'Server error while fetching readings' });
  }
}

async function updateReading(req, res) {
  try {
    const { id } = req.params;
    const { sugar_level, timing } = req.body;

    if (sugar_level !== undefined) {
      const numericValue = Number(sugar_level);
      if (isNaN(numericValue) || numericValue < 40 || numericValue > 600 || !Number.isInteger(numericValue)) {
        return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
      }
    }

    if (timing && !VALID_SLOTS.includes(timing)) {
      return res.status(400).json({ error: 'Invalid timing slot.' });
    }

    const currentRes = await db.query('SELECT * FROM readings WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    const current = currentRes.rows[0];

    if (timing && timing !== current.slot) {
      const formattedDate = current.date ? new Date(current.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const dupCheck = await db.query(
        'SELECT id FROM readings WHERE user_id = $1 AND date = $2 AND slot = $3 AND id != $4',
        [current.user_id, formattedDate, timing, id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: `You already have an ${timing} reading for this date.` });
      }
    }

    await db.query(
      'UPDATE readings SET sugar_level = COALESCE($1, sugar_level), slot = COALESCE($2, slot) WHERE id = $3',
      [sugar_level, timing, id]
    );

    res.status(200).json({ message: 'Reading updated successfully' });
  } catch (err) {
    console.error('Update reading error:', err.message);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
}

async function deleteReading(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM readings WHERE id = $1', [id]);
    res.status(200).json({ message: 'Reading deleted successfully' });
  } catch (err) {
    console.error('Delete reading error:', err.message);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
}

module.exports = { addReading, getReadings, updateReading, deleteReading };