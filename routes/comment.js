var express = require('express');
const { deleteDynamicPostComment, postDynamicPostComment, deleteTeamPostComment, postTeamPostComment, getUserComments, getPostComments } = require('../control/comment');
var router = express.Router();
const authenticateToken = require('../utils/auth/index')

// 发表评论（组队帖）
router.post('/publishTeamComment', authenticateToken, postTeamPostComment);
// 删除评论（组队帖）
router.post('/deleteTeamComment', authenticateToken, deleteTeamPostComment);
// 发表评论（动态帖）
router.post('/publishDynamicComment', authenticateToken, postDynamicPostComment);
// 删除评论（动态帖）
router.post('/deleteDynamicComment', authenticateToken, deleteDynamicPostComment);

// 获取用户评论
router.post('/getUserDynamicComments', authenticateToken, getUserComments);
// 获取帖子评论
router.post('/getPostDynamicComments', getPostComments);

module.exports = router;