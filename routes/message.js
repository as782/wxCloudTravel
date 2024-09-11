const express = require('express');
const { sendMessage, getNotification, getMessagesBetweenUsers, getUserInteractiveNotifications, getUserAdminNotifications, getNotice } = require('../control/message/index,');
const router = express.Router();

// 发送消息
router.post('/sendMessage', sendMessage);

// 拉取通知
router.get('/getNotification/:user_id', getNotification);
router.get('/getNotice', getNotice);

// 获取两人之间的记录
router.post('/getMessagesBetweenUsers', getMessagesBetweenUsers);


// 获取管理员通知
router.post('/getUserAdminNotifications',getUserAdminNotifications)

// 获取互动通知
router.post('/getUserInteractiveNotifications',getUserInteractiveNotifications)


module.exports = router;