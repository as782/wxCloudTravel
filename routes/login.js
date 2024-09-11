const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { MY_JWT } = require('../config');
const getUserTagsInfo = require('../control/utils/getUserTags');
const router = express.Router();

// 注册接口
/**
 * @swagger
 * /register:
 *   post:
 *     summary: 用户注册接口
 *     description: 用户注册功能，提供用户名和密码进行注册
 *     tags:
 *       - 用户操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       '200':
 *         description: 注册成功
 *       '400':
 *         description: 参数错误或用户名已存在
 *       '500':
 *         description: 服务器错误
 */
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // 检测参数
    if (!username || !password) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }

    try {
        // 检查用户名是否已存在
        const { result: userExists } = await query('SELECT * FROM users WHERE username = ?', [username]);
        console.log(userExists);
        if (userExists.length > 0) {
            return res.status(400).json({ code: 400, msg: '用户名已存在' });
        }
        // 插入新用户
        const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
        await query(insertUserQuery, [username, password]);
        res.status(200).json({ code: 200, msg: '注册成功' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});


// 登录接口
/**
 * @swagger
 * /login:
 *   post:
 *     summary: 用户登录接口
 *     description: 用户登录功能，提供用户名和密码进行登录
 *     tags:
 *       - 用户操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       '200':
 *         description: 登录成功
 *       '400':
 *         description: 参数错误
 *       '401':
 *         description: 用户不存在或密码错误
 *       '500':
 *         description: 服务器错误
 */

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    // 检测参数
    if (!username || !password) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }

    try {
        // 查询用户信息
        const { result: userResult } = await query('SELECT * FROM users WHERE username = ?', [username]);


        // 检查用户是否存在
        if (userResult.length === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在,去注册吧' });
        }

        // 验证密码
        if (password !== userResult[0].password) {
            return res.status(404).json({ code: 404, msg: '密码错误' });
        }
        // 用户状态
        if (userResult[0].status === 0) {
            return res.status(404).json({ code: 404, msg: '用户已被禁用' });
        }

    

        const user_id = userResult[0].user_id;
        // 每个用户的标签信息
        const followersUserTagsInfoList = await getUserTagsInfo([user_id]);
        const tags = followersUserTagsInfoList.find(e => {
            return e.user_id === user_id;
        }).tags;

        // 生成 JWT Token
        const token = jwt.sign({ user_id: userResult[0].user_id, username: userResult[0].username }, MY_JWT.SECRET_KEY, { expiresIn: MY_JWT.TIMEOUT });

        const {  avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, created_at } = userResult[0];
        const user_info = {
            user_id,
            username: userResult[0].username,
            avatar_url,
            nickname,
            gender,
            bio,
            birthday,
            tags: tags,
            address: {
                name: region_name,
                code: region_code
            },
            contact: {
                phone: contact_phone,
                email: contact_email
            },
            created_at
        }

        // 返回登录成功的消息和 token
        res.status(200).json({
            code: 200,
            msg: '登录成功',
            data: {
                user_info,
                token: token
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }

});




module.exports = router;
