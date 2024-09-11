const { deleteTeamActivityImage,
    deleteItinerary,
    deleteDynamicPostImage } = require('../control/file');

//处理文件相关接口
const router = require('express').Router();

router.post('/deleteTeamPostImage', deleteTeamActivityImage)
router.post('/deleteDynamicPostImage', deleteDynamicPostImage)
router.post('/deleteItinerary', deleteItinerary)
module.exports = router;