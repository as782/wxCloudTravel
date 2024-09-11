const router = require('express').Router();
const { searchPostAndUserWithRealtiveKeyWord } = require('../control/search');
const authenticateToken = require('../utils/auth');
router.get('/', searchPostAndUserWithRealtiveKeyWord)
module.exports = router;