const express = require('express');

const asyncHandler = require('../middleware/asyncHandler');
const { analyzeUrl } = require('../controllers/analyzeController');

const router = express.Router();

router.post('/', asyncHandler(analyzeUrl));

module.exports = router;
