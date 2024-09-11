



const { query } = require("../../../db");
const { NOTICES, MESSAGES, DYNAMIC_POST_COMMENTS, TEAM_ACTIVITY_POST_COMMENTS } = require("../../../db/config");
const { queryWithConditionsAndPaging } = require("../common");


/** 获取公告列表 */
const getNoticeList = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            notice_id: req.body.id,
            admin_id: req.body.admin_id,
            content: req.body.content,

            created_at: req.body.created_at,
        };
        const { data: notices, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(NOTICES, conditionKeys, paging);

        // 构建查询 senderInfo 的 SQL
        const senderInfoSql = `
            SELECT admin_id,  avatar_url, nickname
            FROM admins
            WHERE  admin_id IN (?)
        `;

        // 提取所有的 admin_id
        const adminIds = notices.map(notice => notice.admin_id);

        if (!adminIds.length) {
            return res.status(200).json({
                code: 200,
                msg: '获取公告列表成功',
                data: {
                    list: [],
                    pageSize: limit,
                    totalCount: totalCount,
                    totalPages: totalPages,
                    currentPage: currentPage
                }
            });
        }
        // 查询 senderInfo
        const { result: senderInfoResults } = await query(senderInfoSql, [adminIds]);

        // 构建 senderInfo 的映射关系对象
        const senderInfoMap = {};
        senderInfoResults.forEach(senderInfo => {
            senderInfoMap[senderInfo.admin_id] = senderInfo;
        });

        // 将 senderInfo 添加到公告列表中
        const noticeList = notices.map(notice => ({
            id: notice.notice_id,
            content: notice.content,
            created_at: notice.created_at,
            userInfo: senderInfoMap[notice.admin_id] || {}
        }));

        res.status(200).json({
            code: 200,
            msg: '获取公告列表成功',
            data: {
                list: noticeList,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取公告列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取公告列表失败' });
    }
};

/** 添加公告 */
const addNotice = async (req, res) => {
    try {
        const { admin_id, content } = req.body;
        if (!admin_id || !content) {
            return res.status(400).json({ code: 400, msg: '参数错误' });
        }
        const sql = `INSERT INTO ${NOTICES} (admin_id, content) VALUES (?, ?)`;
        const values = [admin_id, content];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '公告添加成功' });
    } catch (error) {
        console.error('添加公告失败:', error);
        res.status(500).json({ code: 500, msg: '公告添加失败' });
    }
};

/** 删除公告 */
const deleteNotice = async (req, res) => {
    try {
        const { ids } = req.body;
        const noticeIds = ids
        const sql = `DELETE FROM ${NOTICES} WHERE notice_id IN (?)`;
        const values = [noticeIds];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '公告删除成功' });
    } catch (error) {
        console.error('删除公告失败:', error);
        res.status(500).json({ code: 500, msg: '公告删除失败' });
    }
};

/** 修改公告信息 */
const updateNotice = async (req, res) => {
    try {
        const { notice_id, content } = req.body;
        const sql = `UPDATE ${NOTICES} SET content = ? WHERE notice_id = ?`;
        const values = [content, notice_id];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '公告信息修改成功' });
    } catch (error) {
        console.error('修改公告信息失败:', error);
        res.status(500).json({ code: 500, msg: '公告信息修改失败' });
    }
};


// --------------------------------------------

// 获取消息列表
const getMessagesList = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            id: req.body.id,
            sender_type: req.body.sender_type,
            sender_id: req.body.senderInfo?req.body.senderInfo.user_id:undefined,
            receiver_type: req.body.receiver_type,
            receiver_id: req.body.receiverInfo?req.body.receiverInfo.user_id:undefined,
            type: req.body.type,
            related_id: req.body.related_id,
            comment_id: req.body.comment_id,
            like_id: req.body.like_id,
            created_at: req.body.created_at,
        };
 
        const { data: messages, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(MESSAGES, conditionKeys, paging);

        // 从用户和管理员表中查询发送者和接收者的相关信息
        const senderPromises = messages.map(message => {
            if (message.sender_type === 'user') {
                return query('SELECT user_id, nickname, avatar_url FROM users WHERE user_id = ?', [message.sender_id]);
            } else {
                return query('SELECT admin_id AS user_id,  nickname, avatar_url FROM admins WHERE admin_id = ?', [message.sender_id]);
            }
        });

        const receiverPromises = messages.map(message => {
            if (message.receiver_type === 'user') {
                return query('SELECT user_id, nickname, avatar_url FROM users WHERE user_id = ?', [message.receiver_id]);
            } else {
                return query('SELECT admin_id AS user_id,  nickname, avatar_url FROM admins WHERE admin_id = ?', [message.receiver_id]);
            }
        });

        const senderResults = await Promise.all(senderPromises);
        const receiverResults = await Promise.all(receiverPromises);

        // 构造消息列表格式
        const formattedMessages = messages.map((message, index) => ({
            id: message.id,
            senderInfo: {
                user_id: message.sender_id,
                nickname: senderResults[index].result[0].nickname,
                avatar_url: senderResults[index].result[0].avatar_url,
                type: message.sender_type
            },
            receiverInfo: {
                user_id: message.receiver_id,
                nickname: receiverResults[index].result[0].nickname,
                avatar_url: receiverResults[index].result[0].avatar_url,
                type: message.receiver_type
            },
            content: message.content,
            type: message.type,
            related_id: message.related_id,
            comment_id: message.comment_id,
            like_id: message.like_id,
            created_at: message.created_at
        }));

        res.status(200).json({
            code: 200,
            msg: '获取消息列表成功',
            data: {
                list: formattedMessages,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取消息列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取消息列表失败' });
    }
};

// 删除消息
const deleteMessages = async (req, res) => {
    try {
        const { ids } = req.body;
        const sql = `DELETE FROM messages WHERE id IN (?)`;
        const values = [ids];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '删除消息成功' });
    } catch (error) {
        console.error('删除消息失败:', error);
        res.status(500).json({ code: 500, msg: '删除消息失败' });
    }
};


// ---------------------------------------------------------------------------------------
// 评论
/**
 * 查询帖子评论列表并包含发布用户信息
 * @param {string} tableName - 表名
 * @param {object} conditionKeys - 查询条件
 * @param {object} paging - 分页信息
 * @returns {Promise} 返回查询结果的 Promise
 */
const getPostCommentsWithUserInfo = async (tableName, conditionKeys, paging) => {
    try {
        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(tableName, conditionKeys, paging);
        // 获取发布用户信息
        const userInfoPromises = data.map(async (comment) => {
            const userInfoQuery = `SELECT user_id, avatar_url, nickname FROM users WHERE user_id = ?`;
            const {result:userInfoResult} = await query(userInfoQuery, [comment.user_id]);
            return userInfoResult[0];
        });
        const userInfoList = await Promise.all(userInfoPromises);
       
        // 将用户信息添加到评论信息中
        const commentsWithUserInfo = data.map((comment, index) => {
            return {
                ...comment,
                userInfo: userInfoList[index]
            };
        });
        return { data: commentsWithUserInfo, totalCount, totalPages, currentPage };
    } catch (error) {
        throw new Error(`查询${tableName}评论列表失败: ${error}`);
    }
};

const getDynamicPostComments = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            dynamic_post_id: req.body.dynamic_post_id,
            user_id: req.body.user_id,
            created_at: req.body.created_at,
        };
        const { data, totalCount, totalPages, currentPage } = await getPostCommentsWithUserInfo('dynamic_post_comments', conditionKeys, paging);

        res.status(200).json({
            code: 200,
            msg: '获取动态帖子评论列表成功',
            data: {
                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取动态帖子评论列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取动态帖子评论列表失败' });
    }
};

const getTeamActivityPostComments = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            post_id: req.body.post_id,
            user_id: req.body.user_id,
            created_at: req.body.created_at,
        };
        const { data, totalCount, totalPages, currentPage } = await getPostCommentsWithUserInfo('team_activity_post_comments', conditionKeys, paging);
 
        res.status(200).json({
            code: 200,
            msg: '获取组队活动帖子评论列表成功',
            data: {
                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取组队活动帖子评论列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取组队活动帖子评论列表失败' });
    }
};

// 删除动态评论
const deleteDynamicPostComments = async (req, res) => {
    try {
        const { ids } = req.body;
        const sql = `DELETE FROM ${DYNAMIC_POST_COMMENTS} WHERE comment_id IN (?)`;
        const values = [ids];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '删除动态帖子评论成功' });
    } catch (error) {
        console.error('删除动态帖子评论失败:', error);
        res.status(500).json({ code: 500, msg: '删除动态帖子评论失败' });

    }
}

const deleteTeamActivityPostComments = async (req, res) => {
    try {
        const { ids } = req.body;
        const sql = `DELETE FROM ${TEAM_ACTIVITY_POST_COMMENTS} WHERE comment_id IN (?)`;
        const values = [ids];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '删除组队活动帖子评论成功' });

    } catch (error) {
        console.error('删除组队活动帖子评论失败:', error);
        res.status(500).json({ code: 500, msg: '删除组队活动帖子评论失败' });
    }
}
module.exports = {
    getNoticeList,
    addNotice,
    deleteNotice,
    updateNotice,
    getMessagesList,
    deleteMessages,
    getDynamicPostComments,
    getTeamActivityPostComments,
    deleteDynamicPostComments,
    deleteTeamActivityPostComments
};

