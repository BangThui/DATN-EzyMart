const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

// Route GET /api/recommendations/combo
router.get('/combo', recommendationController.getDailyCombo);

module.exports = router;
