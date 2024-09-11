var express = require('express');
const { query } = require('../db');
const { getUserInfo, getFollowers, getFans, updateUserInfo, joinTeam, followOrUnfollowUser, getMyPosts, getUserTeams, getUserCardInfo, updatePassword } = require('../control/user');
var router = express.Router();
const authenticateToken = require('../utils/auth/index')

/**
 * @swagger
 * /users/getUserInfo/{id}:
 *   get:
 *     summary: 通过用户ID获取用户信息
 *     description: 根据用户ID获取用户的详细信息，包括基本信息、关联的标签等。
 *     tags:
 *       - USER
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       '200':
 *         description: 成功获取用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: ''
 *       '400':
 *         description: 参数错误
 *       '500':
 *         description: 服务器错误
 */
router.get('/getUserInfo/:id',authenticateToken,getUserInfo);
/**
 * @swagger
 * /getFollows/:user_id:
 *   get:
 *     summary: 获取关注用户列表
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 获取关注用户列表
router.get('/getFollows/:user_id',authenticateToken,getFollowers)
/**
 * @swagger
 * /getFans/:user_id:
 *   get:
 *     summary: 获取粉丝用户列表
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 获取粉丝用户列表
router.get('/getFans/:user_id',authenticateToken,getFans)
/**
 * @swagger
 * /follow:
 *   post:
 *     summary: 关注或取消关注
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 关注或取消关注
router.post('/follow',authenticateToken, followOrUnfollowUser)
/**
 * @swagger
 * /update:
 *   post:
 *     summary: 更新用户信息
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 更新用户信息
router.post('/update', authenticateToken,updateUserInfo)

/**
 * @swagger
 * /joinTeam:
 *   post:
 *     summary: 加入小队
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 加入小队
router.post('/joinTeam/', authenticateToken,joinTeam)
/**
 * @swagger
 * /getJoinedTeams:
 *   post:
 *     summary: 获取用户加入的小队
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 获取用户加入的小队
router.post('/getJoinedTeams',authenticateToken, getUserTeams)
/**
 * @swagger
 * /getMyposts:
 *   post:
 *     summary: 获取我的发布
 *     description:  
 *     tags:
 *       - USER
 *     parameters:
 *     responses:
 */
// 获取我的发布
router.post('/getMyposts', getMyPosts)

// 获取用户卡片信息
router.get('/getUserCardInfo/:user_id',getUserCardInfo)

// 更新密码
router.post('/changePassword',updatePassword)
module.exports = router;
