const { MY_JWT } = require("../../config");
const { getUserList, addUser, updateUser, deleteUser, addAdmin, updateAdmin, deleteAdmin, getAdminList, updateTag, deleteTag, getTagList, updatePassword } = require("../../control/admin_control/userManage");
const { ADMINS } = require("../../db/config");
const { query } = require("../../db/index");
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require("../../utils/auth");
const { addTag } = require("../../control/tags");
const { getTeamActivityPostList, getDynamicPostList, passTeamActivityPost,
    passDynamicPost,
    unpassTeamActivityPost,
    unpassDynamicPost,
    offlineTeamActivityPost,
    offlineDynamicPost,
    deleteTeamActivityPost,
    deleteDynamicPost,
    removeFromRecommendTable,
    addToRecommendTable,
    getThemeList,
    addTheme,
    deleteTheme,
    updateTheme,
    getRecommendList,
    getApprovalRecord,
    deleteApprovalRecord } = require("../../control/admin_control/postManage");
const { getNoticeList, deleteNotice, updateNotice, addNotice, getMessagesList, deleteMessages, getDynamicPostComments, deleteTeamActivityPostComments, getTeamActivityPostComments, deleteDynamicPostComments } = require("../../control/admin_control/messageManage");

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // 检测参数
    if (!username || !password) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }

    try {
        // 查询用户信息
        const { result: userResult } = await query(`SELECT * FROM ${ADMINS} WHERE username = ?`, [username]);

        // 检查用户是否存在
        if (userResult.length === 0) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }
        // 验证密码
        if (password !== userResult[0].password) {
            return res.status(401).json({ code: 401, msg: '密码错误' });
        }
        // 查询用户账号状态
        if (userResult[0].status === 0) {
            return res.status(403).json({ code: 403, msg: '账号已被禁用' });
        }

        const admin_id = userResult[0].admin_id;
        // 生成 JWT Token
        const token = jwt.sign({ admin_id: userResult[0].admin_id, username: userResult[0].username }, MY_JWT.SECRET_KEY, { expiresIn: MY_JWT.TIMEOUT });

        const { avatar_url, nickname, gender, birthday, created_at, role } = userResult[0];
        const userInfo = {
            user_id: admin_id,
            username: userResult[0].username,
            avatar_url,
            nickname,
            gender,

            birthday,
            created_at
        }

        // 返回登录成功的消息和 token
        res.status(200).json({
            code: 200,
            msg: '登录成功',
            data: {
                userInfo,
                token: token,
                role: [role],
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }

});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // 检测参数
    if (!username || !password) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }

    try {
        // 检查用户名是否已存在
        const { result: userExists } = await query(`SELECT * FROM ${ADMINS} WHERE username = ?`, [username]);

        if (userExists.length > 0) {
            return res.status(400).json({ code: 400, msg: '用户名已存在' });
        }
        const role = 'admin';
        // 插入新用户
        const insertUserQuery = `INSERT INTO ${ADMINS} (username, password, role) VALUES (?, ?, ?)`;
        await query(insertUserQuery, [username, password, role]);
        res.status(200).json({ code: 200, msg: '注册成功' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});


//---------------------用户管理--------------------------//
//#region 用户管理

// 获取用户列表
router.post('/getUserList', authenticateToken, getUserList)

// 删除用户
router.post('/deleteUser', authenticateToken, deleteUser)

// 修改用户信息
router.post('/updateUser', authenticateToken, updateUser)
// 添加用户
router.post('/addUser', authenticateToken, addUser)

// 获取管理员列表
router.post('/getAdminList', authenticateToken, getAdminList)

// 删除管理员
router.post('/deleteAdmin', authenticateToken, deleteAdmin)

// 修改管理员信息
router.post('/updateAdmin', authenticateToken, updateAdmin)
// 添加管理员
router.post('/addAdmin', authenticateToken, addAdmin)

// 获取标签列表
router.post('/getTagList', authenticateToken, getTagList)

// 删除标签
router.post('/deleteTag', authenticateToken, deleteTag)

// 修改标签信息
router.post('/updateTag', authenticateToken, updateTag)
// 添加标签
router.post('/addTag', authenticateToken, addTag)

//#endregion


//------------------- 帖子管理--------------------------//
//#region 帖子管理
// 获取帖子列表
router.post('/getPostList', authenticateToken, getTeamActivityPostList)
// 获取动态列表
router.post('/getDynamicList', authenticateToken, getDynamicPostList)

// 审核帖子
router.post('/passPost', authenticateToken, passTeamActivityPost)
router.post('/passDynamicPost', authenticateToken, passDynamicPost)

// 取消审核帖子
router.post('/unpassPost', authenticateToken, unpassTeamActivityPost)
router.post('/unpassDynamicPost', authenticateToken, unpassDynamicPost)

// 下架帖子
router.post('/offlinePost', authenticateToken, offlineTeamActivityPost)
router.post('/offlineDynamicPost', authenticateToken, offlineDynamicPost)


// 获取审批记录
router.post('/getApprovalRecord', authenticateToken, getApprovalRecord)
// 删除审批记录
router.post('/deleteApprovalRecord', authenticateToken, deleteApprovalRecord)

// 删除帖子
router.post('/deletePost', authenticateToken, deleteTeamActivityPost)
router.post('/deleteDynamicPost', authenticateToken, deleteDynamicPost)

//  获取推荐列表
router.post('/getRecommendList', authenticateToken, getRecommendList)
// 移除推荐
router.post('/removeFromRecommendTable', authenticateToken, removeFromRecommendTable)

// 添加推荐
router.post('/addToRecommendTable', authenticateToken, addToRecommendTable)

// 获取主题列表
router.post('/getThemeList', authenticateToken, getThemeList)

// 添加主题
router.post('/addTheme', authenticateToken, addTheme)

// 删除主题
router.post('/deleteTheme', authenticateToken, deleteTheme)

// 修改主题
router.post('/updateTheme', authenticateToken, updateTheme)


//#region  消息管理
// 获取公告列表
router.post('/getNoticeList', authenticateToken, getNoticeList)

// 删除公告
router.post('/deleteNotice', authenticateToken, deleteNotice)

// 修改公告
router.post('/updateNotice', authenticateToken, updateNotice)

// 添加公告
router.post('/addNotice', authenticateToken, addNotice)


// 获取消息列表
router.post('/getMessageList', authenticateToken, getMessagesList)
// 删除消息
router.post('/deleteMessage', authenticateToken, deleteMessages)


// 获取动态评论列表
router.post('/getDynamicCommentList', authenticateToken, getDynamicPostComments)

// 删除动态评论
router.post('/deleteDynamicComment', authenticateToken, deleteDynamicPostComments)

// 获取组队评论
router.post('/getTeamActivityCommentList', authenticateToken, getTeamActivityPostComments)

// 删除组队评论
router.post('/deleteTeamActivityComment', authenticateToken, deleteTeamActivityPostComments)

// 更新密码
router.post('/updatePassword', authenticateToken, updatePassword)

//#endregion
module.exports = router;