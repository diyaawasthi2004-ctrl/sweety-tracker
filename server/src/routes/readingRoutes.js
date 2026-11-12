const express = require('express');
const router = express.Router();
const { addReading, getReadings, updateReading, deleteReading } = require('../controllers/readingController');

router.post('/', addReading);
router.get('/:userId', getReadings);
router.put('/:id', updateReading);
router.delete('/:id', deleteReading);

module.exports = router;