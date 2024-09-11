var express = require('express');
const { publishDynamicPost, updateDynamicPost, deleteDynamicPost, getDynamicPost, getDynamicPostsForPage,
    publishTeamPost, updateTeamPost, deleteTeamPost, getTeamPost, getTeamPostsForPage, getTeamMembers,
    getRecommendPosts,
} = require('../control/post/index');
const authenticateToken = require('../utils/auth');
var router = express.Router();

// 发布组队帖
router.post('/publishTeamPost',authenticateToken,  publishTeamPost);
// 发布动态帖
router.post('/publishDynamicPost',authenticateToken,  publishDynamicPost);
// 更新组队帖
router.post('/updateTeamPost',authenticateToken,  updateTeamPost);
// 更新动态帖
router.post('/updateDynamicPost',authenticateToken,  updateDynamicPost);
// 删除组队帖
router.post('/deleteTeamPost',authenticateToken,  deleteTeamPost);
// 删除组队帖
router.post('/deleteDynamicPost',authenticateToken,  deleteDynamicPost);
// 查询动态帖
router.get('/getDynamicPost/:dynamic_post_id', getDynamicPost);
// 查询动态帖
router.get('/getTeamPost/:post_id', getTeamPost);

// 分页查询
router.post('/getDynamicPostsForPage', getDynamicPostsForPage);
router.post('/getTeamPostsForPage', getTeamPostsForPage);

// 获取首页推荐数据列表
router.get('/getRecommendPosts', getRecommendPosts);

// 查询加入组队的用户列表
router.get('/getJoinTeamUsers/:post_id', getTeamMembers)
module.exports = router;
