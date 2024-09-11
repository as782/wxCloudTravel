var express = require('express');

const { getThemes, addTheme, deleteTheme } = require('../control/posttheme');
var router = express.Router();


/**
 * @swagger
 * /getThemes:
 *   get:
 *     summary: 获取主题列表
 *     responses:
 *       200:
 *         description: 成功获取主题列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: 响应状态码
 *                 msg:
 *                   type: string
 *                   description: 响应消息
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: ' '
 */
router.get('/getThemes', getThemes);

/**
 * @swagger
 * /deleteTheme:
 *   get:
 *     summary: 删除主题
 *     parameters:
 *       - in: query
 *         name: theme_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 待删除的主题ID
 *     responses:
 *       200:
 *         description: 成功删除主题
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: 响应状态码
 *                 msg:
 *                   type: string
 *                   description: 响应消息
 */
router.get('/deleteTheme/:theme_id', deleteTheme);

/**
 * @swagger
 * /addTheme:
 *   post:
 *     summary: 添加主题
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme_name:
 *                 type: string
 *                 description: 主题名称
 *           example:
 *             theme_name: Hiking
 *     responses:
 *       200:
 *         description: 成功添加主题
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: 响应状态码
 *                 msg:
 *                   type: string
 *                   description: 响应消息
 */
router.post('/addTheme', addTheme);




module.exports = router;