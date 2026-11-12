const db = require('../config/db');

// Helper to calculate statistics
function calculateStats(readings) {
  if (!readings || readings.length === 0) {
    return {
      count: 0,
      highest: null,
      lowest: null,
      average: null,
      readings: []
    };
  }

  const values = readings.map(r => r.sugar_level);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = Number((sum / values.length).toFixed(1));

  return {
    count: readings.length,
    highest,
    lowest,
    average,
    readings
  };
}

// Helper to format a Date object as YYYY-MM-DD in local time
function formatLocalDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get reports based on type (daily, mtd, monthly)
async function getReport(req, res) {
  try {
    const { userId } = req.params;
    const { type, date } = req.query; // type: 'daily', 'mtd', 'monthly', date: 'YYYY-MM-DD'

    if (!type || !userId) {
      return res.status(400).json({ error: 'User ID and report type are required.' });
    }

    // Parse YYYY-MM-DD safely in local time so it doesn't shift across timezones
    let targetDate;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    } else {
      targetDate = new Date();
    }

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    let startDateStr, endDateStr;
    let reportRangeLabel = '';

    if (type === 'daily') {
      startDateStr = formatLocalDate(targetDate);
      endDateStr = startDateStr;
      reportRangeLabel = startDateStr;
    } else if (type === 'mtd') {
      const startOfMonth = new Date(year, month, 1);
      startDateStr = formatLocalDate(startOfMonth);
      endDateStr = formatLocalDate(targetDate);
      reportRangeLabel = `${startDateStr} to ${endDateStr}`;
    } else if (type === 'monthly') {
      // Whole previous month
      const startOfPrevMonth = new Date(year, month - 1, 1);
      const endOfPrevMonth = new Date(year, month, 0);
      startDateStr = formatLocalDate(startOfPrevMonth);
      endDateStr = formatLocalDate(endOfPrevMonth);
      reportRangeLabel = `${startDateStr} to ${endDateStr}`;
    } else {
      return res.status(400).json({ error: 'Invalid report type. Use daily, mtd, or monthly.' });
    }

    // Query readings within the date range for the user
    const queryStr = `
      SELECT * FROM readings 
      WHERE user_id = $1 AND DATE(created_at) >= $2 AND DATE(created_at) <= $3
      ORDER BY created_at DESC, id DESC
    `;

    const result = await db.query(queryStr, [userId, startDateStr, endDateStr]);
    const stats = calculateStats(result.rows);

    res.status(200).json({
      type,
      dateRange: reportRangeLabel,
      ...stats
    });
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ error: 'Server error while generating report' });
  }
}

module.exports = { getReport };