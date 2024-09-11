var express = require('express');
const { toggleLikeDynamicPost,
    toggleLikeTeamPost, getUserLikedDynamicPosts, getLikedDynamicPostUsers, getLikedTeamPostUsers, getUserLikedTeamPosts } = require('../control/like');
const authenticateToken = require('../utils/auth');
var router = express.Router();


// 点赞或则取消点赞组队帖
router.post('/likeTeamPost',authenticateToken,  toggleLikeTeamPost);
// 点赞或则取消点赞动态帖
router.post('/likeDynamicPost',authenticateToken,  toggleLikeDynamicPost);

// 获取点赞用户
router.get('/getLikeDynamicPostUsers/:post_id', getLikedDynamicPostUsers);
router.get('/getLikeTeamPostUsers/:post_id', getLikedTeamPostUsers);


// 查询用户点赞的动态帖子
router.get('/getUserLikedDynamicPosts/:user_id',authenticateToken,  getUserLikedDynamicPosts);
// 查询用户点赞的组队帖子
router.get('/getUserLikedTeamPosts/:user_id',authenticateToken,  getUserLikedTeamPosts);
module.exports = router;