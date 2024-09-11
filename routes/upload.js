var express = require('express');
const { query } = require('../db');
const fs = require('fs');
var router = express.Router();

const multer = require('multer');
const path = require('path');
const { USERS } = require('../db/config');

// 设置文件存储路径和文件名
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        // 这里可以根据用户的用户名动态设置文件夹路径
        const username = req.params.username;
        const { result } = await query(`SELECT * FROM ${USERS} WHERE username = ?`, [username])

        if (!result.length) {
            return cb(new Error('User not found'), false);
        }

        const uploadPath = path.join('./user_resources/images', username, file.fieldname);
        // 如果路径不存在，创建它
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (_, file, cb) => {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        // 时间戳
        let timestamp = date.getTime();
        let datename = `${year}${month}${day}${timestamp}`
        // 设置文件名，这里可以根据需要进行修改
        const extension = path.extname(file.originalname); //后缀
        //    不带后缀的文件名
        let pfix = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
        let filename = file.fieldname + '-' + pfix + '-' + datename + extension;
        cb(null, filename);
    }
});

const upload = multer({ storage });

// 用户组队帖轮播图上传（支持上传多张，如果上传有失败的需要中断 ）
router.post('/team_post/:username', upload.array('team_post', 10), async (req, res) => {
    try {
        // 如果成功上传文件，返回成功消息，且返回图片服务器地址数组
        const files = req.files;
        const fileUrls = files.map(file => req.protocol + '://' + req.get('host') + '/' + file.path.replace(/\\/g, '/').replace('user_resources/', ''));

        res.status(200).json({
            code: 200, msg: '文件上传成功', data: {
                fileUrls
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ code: 500, msg: '文件上传失败' });
    }
});

// 行程图
router.post('/initerary/:username', upload.array('initerary', 10), async (req, res) => {
    try {
        // 如果成功上传文件，返回成功消息，且返回图片服务器地址数组
        const files = req.files;
        const fileUrls = files.map(file => req.protocol + '://' + req.get('host') + '/' + file.path.replace(/\\/g, '/').replace('user_resources/', ''));
        res.status(200).json({
            code: 200, msg: '文件上传成功', data: {
                fileUrls
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ code: 500, msg: '文件上传失败' });
    }
});

// 用户动态帖上传（支持上传多张，如果上传有失败的需要中断 ）
router.post('/moment_post/:username', upload.array('moment_post', 10), async (req, res) => {
    try {
        // 如果成功上传文件，返回成功消息，且返回图片服务器地址数组
        const files = req.files;
        const fileUrls = files.map(file => req.protocol + '://' + req.get('host') + '/' + file.path.replace(/\\/g, '/').replace('user_resources/', ''));
        res.status(200).json({
            code: 200, msg: '文件上传成功', data: {
                fileUrls
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ code: 500, msg: '文件上传失败' });
    }
});

router.post('/avatar/:username', upload.array('avatar', 1), async (req, res) => {
    try {
        // 如果成功上传文件，返回成功消息，且返回图片服务器地址
        const files = req.files;
        const fileUrls = files.map(file => req.protocol + '://' + req.get('host') + '/' + file.path.replace(/\\/g, '/').replace('user_resources/', ''));
        res.status(200).json({
            code: 200, msg: '文件上传成功', data: {
                fileUrls
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ code: 500, msg: '文件上传失败' });
    }
});

// 个人主页图片
router.post('/profile_bg/:username', upload.array('profile_bg', 1), async (req, res) => {
    try {
        // 如果成功上传文件，返回成功消息，且返回图片服务器地址
        const files = req.files;
        const fileUrls = files.map(file => req.protocol + '://' + req.get('host') + '/' + file.path.replace(/\\/g, '/').replace('user_resources/', ''));
        res.status(200).json({
            code: 200, msg: '文件上传成功', data: {
                fileUrls
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ code: 500, msg: '文件上传失败' });
    }
});

module.exports = router;



