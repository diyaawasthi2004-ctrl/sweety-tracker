const db = require('../config/db');

// Valid time slots as per requirements
const VALID_SLOTS = ['Morning (fasting)', 'After breakfast', 'After lunch', 'After dinner'];

// Add a new blood glucose reading with strict validations
async function addReading(req, res) {
  try {
    const { user_id, sugar_level, timing, notes, date } = req.body;

    // 1. Value is required & number check
    if (sugar_level === undefined || sugar_level === null || sugar_level === '') {
      return res.status(400).json({ error: 'Please enter a glucose value.' });
    }

    const numericValue = Number(sugar_level);

    // 2. Value must be a whole number between 40 and 600
    if (isNaN(numericValue) || numericValue < 40 || numericValue > 600 || !Number.isInteger(numericValue)) {
      return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
    }

    // 3. Timing/slot validation
    if (!VALID_SLOTS.includes(timing)) {
      return res.status(400).json({ error: 'Invalid timing slot.' });
    }

    // 4. Date validation (default to today if not provided, cannot be in the future)
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

    // Check existing readings for this user on this date (PostgreSQL $1, $2 syntax)
    const existingReadings = await db.query(
      'SELECT * FROM readings WHERE user_id = $1 AND DATE(created_at) = $2',
      [user_id, formattedDate]
    );

    // 5. Maximum 4 readings per day
    if (existingReadings.rows.length >= 4) {
      return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }

    // 6. Only one reading per slot per day
    const slotExists = existingReadings.rows.some((r) => r.timing === timing);
    if (slotExists) {
      return res.status(400).json({ error: `You already have an ${timing} reading for this date.` });
    }

    // Insert reading (PostgreSQL $1, $2, $3, $4, $5 syntax)
    await db.query(
      'INSERT INTO readings (user_id, sugar_level, timing, notes, created_at) VALUES ($1, $2, $3, $4, $5)',
      [user_id, numericValue, timing, notes || '', formattedDate]
    );

    res.status(201).json({ message: 'Reading added successfully' });
  } catch (err) {
    console.error('Add reading error:', err.message);
    res.status(500).json({ error: 'Server error while adding reading' });
  }
}

// Get all readings for a specific user
async function getReadings(req, res) {
  try {
    const { userId } = req.params;

    // PostgreSQL $1 syntax
    const result = await db.query(
      'SELECT * FROM readings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get readings error:', err.message);
    res.status(500).json({ error: 'Server error while fetching readings' });
  }
}

// Edit a reading
async function updateReading(req, res) {
  try {
    const { id } = req.params;
    const { sugar_level, timing, notes } = req.body;

    if (sugar_level !== undefined) {
      const numericValue = Number(sugar_level);
      if (isNaN(numericValue) || numericValue < 40 || numericValue > 600 || !Number.isInteger(numericValue)) {
        return res.status(400).json({ error: 'Value must be between 40 and 600 mg/dl.' });
      }
    }

    if (timing && !VALID_SLOTS.includes(timing)) {
      return res.status(400).json({ error: 'Invalid timing slot.' });
    }

    // Check current reading to validate duplicate slot on the same date
    const currentRes = await db.query('SELECT * FROM readings WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    const current = currentRes.rows[0];

    if (timing && timing !== current.timing) {
      const formattedDate = new Date(current.created_at).toISOString().split('T')[0];
      const dupCheck = await db.query(
        'SELECT id FROM readings WHERE user_id = $1 AND DATE(created_at) = $2 AND timing = $3 AND id != $4',
        [current.user_id, formattedDate, timing, id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: `You already have an ${timing} reading for this date.` });
      }
    }

    await db.query(
      'UPDATE readings SET sugar_level = COALESCE($1, sugar_level), timing = COALESCE($2, timing), notes = COALESCE($3, notes) WHERE id = $4',
      [sugar_level, timing, notes, id]
    );

    res.status(200).json({ message: 'Reading updated successfully' });
  } catch (err) {
    console.error('Update reading error:', err.message);
    res.status(500).json({ error: 'Server error while updating reading' });
  }
}

// Delete a reading
async function deleteReading(req, res) {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM readings WHERE id = $1', [id]);

    res.status(200).json({ message: 'Reading deleted successfully' });
  } catch (err) {
    console.error('Delete reading error:', err.message);
    res.status(500).json({ error: 'Server error while deleting reading' });
  }
}

module.exports = { addReading, getReadings, updateReading, deleteReading };