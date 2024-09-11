const router = require('express').Router();
const { getTags, addTag } = require('../control/tags');
router.get('/getTagsList', getTags);
router.post('/addTag', addTag);
module.exports = router;