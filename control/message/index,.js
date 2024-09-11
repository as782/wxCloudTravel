const { MESSAGES, USERS, ADMINS, MESSAGE_TYPE, DYNAMIC_POSTS, TEAM_ACTIVITY_POSTS, DYNAMIC_POST_IMAGES, TEAM_ACTIVITY_IMAGES, NOTICES } = require('../../db/config');
const { query } = require('../../db/index');
const { queryWithConditionsAndPaging } = require('../admin_control/common');

/**
 * 发送消息函数
 * @param {*} req 请求对象，包含消息发送者和接收者信息以及消息内容和类型
 * @param {*} res 响应对象，用于向客户端发送响应结果
 * @param {string} req.body.sender_type 发送者类型，可以是'user'或'admin'
 * @param {number} req.body.sender_id 发送者ID
 * @param {string} req.body.receiver_type 接收者类型，可以是'user'或'admin'
 * @param {number} req.body.receiver_id 接收者ID
 * @param {string} req.body.content 消息内容
 * @param {string} req.body.type 消息类型，可以是'private_message', 'dynamic_post_comment', 'dynamic_post_like', 'team_activity_post_comment', 'team_activity_post_like', 'admin_notification', 'follow_notification'
 */
const sendMessage = async (req, res) => {
    try {
        const { sender_type, sender_id, receiver_type, receiver_id, content, type } = req.body; // 假设请求体中包含发送者类型、发送者ID、接收者类型、接收者ID、内容和类型

        // 在数据库中插入消息数据
        const sql = `INSERT INTO ${MESSAGES} (sender_type, sender_id, receiver_type, receiver_id, content, type) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [sender_type, sender_id, receiver_type, receiver_id, content, type];

        const { result, fields } = await query(sql, values);
        console.log(result, fields);
        res.status(200).json({ code: 200, msg: '发送成功' });
    } catch (error) {
        console.error('Error inserting message: ', error);
        res.status(500).json({ code: 500, msg: '消息发送失败' });
    }
}

/**
 * 获取相关通知
 * @param {*} req 
 * @param {*} res 
 * @param {*} req.params.user_id 用户id
 */
const getNotification = async (req, res) => {
    try {
        const user_id = req.params.user_id; // 假设从查询参数中获取用户ID

        // 查询用户有关的所有消息，并包含发送者和接收者的基本信息， 如果是私信，就不是发送的还是接受的都要， 其他类型的只要接收的

        const sql = `
        SELECT 
            m.*,
            CASE
                WHEN m.type = '*' THEN s.avatar_url
                ELSE   s.avatar_url 
            END AS sender_avatar,
            CASE
                WHEN m.type = '*' THEN s.nickname
                ELSE  s.nickname 
            END AS sender_nickname,
            r.avatar_url AS receiver_avatar,
            r.nickname AS receiver_nickname
        FROM 
            ${MESSAGES} m
        LEFT JOIN 
            ${USERS} s ON m.sender_id = s.user_id
        LEFT JOIN 
            ${USERS} r ON m.receiver_id = r.user_id
        WHERE 
            (m.type = 'private_message' AND (m.sender_id = ? OR m.receiver_id = ?))
            OR (m.type = 'admin_notification' AND m.receiver_id = ?)
            OR (m.type != 'private_message' AND m.type != 'admin_notification' AND (m.receiver_id = ? ))
        ORDER BY 
            m.created_at DESC`;
        const values = [user_id, user_id, user_id, user_id];
        const { result: notifyResult } = await query(sql, values);

        // 定义用于存储不同类型通知的对象
        const notifications = {
            messages: {
                send: [], // 发送给其他用户的私信
                received: [], // 接收到的其他用户的私信
            },
            admin_notifications: [], // 管理员通知
            interactive: {}, // 其他互动通知，如点赞、评论等
        };

        // 对查询结果进行分类处理
        notifyResult.forEach(notification => {
            if (notification.type === 'private_message') {
                if (notification.sender_id === 1 * user_id) {
                    // 发送给其他用户的私信
                    notifications.messages.send.push(notification);
                } else {
                    // 接收到的其他用户的私信
                    notifications.messages.received.push(notification);
                }
            } else if (notification.type === 'admin_notification') {
                // 管理员通知
                notifications.admin_notifications.push(notification);
            } else {

                // 其他互动通知
                if (notification.receiver_id === user_id && !notifications.interactive[notification.type]) {
                    notifications.interactive[notification.type] = [];
                }
                notification.receiver_id === user_id && notifications.interactive[notification.type].push(notification);

                // 同类型最新
                if (!notifications.interactive[notification.type] || notification.created_at > notifications.interactive[notification.type].created_at) {
                    notifications.interactive[notification.type] = [notification];
                }
            }
        });
        // 仅保留最新的一种类型的消息
        let latestInteractiveNotification = null;
        for (const type in notifications.interactive) {
            if (notifications.interactive.hasOwnProperty(type)) {
                const interaction = notifications.interactive[type];
                if (!latestInteractiveNotification || interaction.created_at > latestInteractiveNotification.created_at) {
                    latestInteractiveNotification = interaction;
                }
            }
        }
        notifications.interactive = latestInteractiveNotification ? latestInteractiveNotification : [];




        res.status(200).json({ code: 200, msg: '获取成功', data: { ...notifications } });
    } catch (error) {
        console.error('Error retrieving notifications: ', error);
        res.status(500).json({ code: 500, msg: '获取通知失败' });
    }
};


// 获取全部公告
const getNotice = async (req, res) => {
    try {

        // 查询公告
        const sql = `SELECT * FROM ${NOTICES}`;
        const { result: notices } = await query(sql);



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
               
            }
        });
    } catch (error) {
        console.error('获取公告列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取公告列表失败' });
    }
};

/**
 * 获取两人之间消息记录函数，支持分页查询
 * @param {*} req 请求对象，包含用户1和用户2的ID以及分页信息
 * @param {*} res 响应对象，用于向客户端发送响应结果
 * @param {number} req.body.user1_id 用户1的ID
 * @param {number} req.body.user2_id 用户2的ID
 * @param {number} req.body.page 页码，默认为1
 * @param {number} req.body.limit 每页记录数，默认为10
 */
const getMessagesBetweenUsers = async (req, res) => {
    try {
        const { user1_id, user2_id, page = 1, limit = 10 } = req.body; // 从POST请求的body中获取用户1的ID、用户2的ID、页码和每页记录数

        // 计算偏移量
        const offset = (page - 1) * limit;

        // 查询两人之间的消息记录，按时间倒序排列，限制返回指定页的记录
        const sql = `
            SELECT id, content, sender_id, receiver_id,created_at ,type
            FROM ${MESSAGES}
            WHERE (sender_id = ? AND receiver_id = ? AND type ='private_message' ) OR (sender_id = ? AND receiver_id = ? AND type ='private_message' ) 
            ORDER BY created_at DESC
            LIMIT ?, ?`;
        const values = [user1_id, user2_id, user2_id, user1_id, offset, limit];

        const { result } = await query(sql, values);

        // 统计总数
        const sql2 = `
        SELECT COUNT(*) AS total_count
        FROM ${MESSAGES}
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`;
        const values1 = [user1_id, user2_id, user2_id, user1_id];

        const { result: countResult } = await query(sql2, values1);

        const totalCount = countResult[0].total_count;

        // 计算总页数
        const totalPages = Math.ceil(totalCount / limit);

        // 构造分页信息
        const pagination = {
            pageSize: limit,
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: parseInt(page)
        };

        res.status(200).json({ code: 200, msg: '获取成功', data: { list: result, ...pagination } });
    } catch (error) {
        console.error('Error retrieving messages between users: ', error.message);
        res.status(500).json({ code: 500, msg: '获取消息记录失败' });
    }
}


/**
 * 获取用户所有的管理员通知函数，支持分页查询
 * @param {*} req 请求对象，包含用户ID以及分页信息
 * @param {*} res 响应对象，用于向客户端发送响应结果
 * @param {number} req.body.user_id 用户ID
 * @param {number} req.body.page 页码，默认为1
 * @param {number} req.body.limit 每页记录数，默认为10
 */
const getUserAdminNotifications = async (req, res) => {
    try {
        const { user_id, page = 1, limit = 10 } = req.body; // 从POST请求的body中获取用户ID、页码和每页记录数

        // 查询总数
        const totalAdminNotificationsSql = `SELECT COUNT(*) AS total FROM ${MESSAGES} WHERE receiver_id = ? AND type = "admin_notification"`;
        const totalAdminNotificationsValues = [user_id];
        const { result: totalAdminNotificationsResult } = await query(totalAdminNotificationsSql, totalAdminNotificationsValues);
        const totalAdminNotifications = totalAdminNotificationsResult[0].total;

        // 计算总页数
        const totalPages = Math.ceil(totalAdminNotifications / limit);

        // 计算偏移量
        const offset = (page - 1) * limit;

        // 查询用户的管理员通知，按时间倒序排列，限制返回指定页的记录
        const sql = `
            SELECT *
            FROM ${MESSAGES}
            WHERE receiver_id = ? AND type = 'admin_notification'
            ORDER BY created_at DESC
            LIMIT ?, ?`;
        const values = [user_id, offset, limit];

        const { result } = await query(sql, values);

        // 构造分页信息
        const pagination = {
            pageSize: limit,
            totalCount: totalAdminNotifications,
            totalPages: totalPages,
            currentPage: parseInt(page)
        };

        res.status(200).json({
            code: 200, msg: '获取管理员通知成功', data: {
                list: result, ...pagination
            }
        });
    } catch (error) {
        console.error('Error retrieving user admin notifications: ', error);
        res.status(500).json({ code: 500, msg: '获取管理员通知失败' });
    }
}

/**
 * 获取用户的互动通知函数，支持分页查询
 * @param {*} req 请求对象，包含用户ID以及分页信息
 * @param {*} res 响应对象，用于向客户端发送响应结果
 * @param {number} req.body.user_id 用户ID
 * @param {number} req.body.page 页码，默认为1  
 * @param {number} req.body.limit 每页记录数，默认为10
 */
const getUserInteractiveNotifications = async (req, res) => {
    try {
        const { user_id, page = 1, limit = 10 } = req.body; // 从POST请求的body中获取用户ID、页码和每页记录数

        // 查询总数
        const totalInteractiveNotificationsSql = `SELECT COUNT(*) AS total FROM ${MESSAGES} WHERE receiver_id = ? AND type != "admin_notification"  AND type !="private_message"`;
        const totalInteractiveNotificationsValues = [user_id];
        const { result: totalInteractiveNotificationsResult } = await query(totalInteractiveNotificationsSql, totalInteractiveNotificationsValues);
        const totalInteractiveNotifications = totalInteractiveNotificationsResult[0].total;

        // 计算总页数
        const totalPages = Math.ceil(totalInteractiveNotifications / limit);

        // 计算偏移量
        const offset = (page - 1) * limit;

        // 查询用户的互动通知，按时间倒序排列，限制返回指定页的记录
        const sql = `
            SELECT *
            FROM ${MESSAGES}
            WHERE receiver_id = ? AND type != 'admin_notification' AND type !="private_message"
            ORDER BY created_at DESC
            LIMIT ?, ?`;
        const values = [user_id, offset, limit];

        const { result } = await query(sql, values);


        let newresult = await Promise.all(result.map(async (item) => {
            let { type, related_id, sender_id, content } = item
            let tablename = '', postId_key = ''
            // sender_id 查出发送者的 nickname , avatar_url
            const senderSql = `SELECT user_id,nickname,avatar_url FROM ${USERS} WHERE user_id = ?`;
            const senderValues = [sender_id];
            const { result: senderResult } = await query(senderSql, senderValues);
            item.senderInfo = senderResult[0]
            if (type === MESSAGE_TYPE.DYNAMIC_POST_COMMENT || type === MESSAGE_TYPE.DYNAMIC_POST_LIKE) {
                tablename = DYNAMIC_POST_IMAGES
                postId_key = 'dynamic_post_id'
            } else if (type == MESSAGE_TYPE.TEAM_ACTIVITY_POST_COMMENT || type === MESSAGE_TYPE.TEAM_ACTIVITY_POST_LIKE) {
                tablename = TEAM_ACTIVITY_IMAGES
                postId_key = 'post_id'
            } else {
                return item
            }
            // 通过related_id 查询一张帖子相关的最新的图片image
            const sql = `SELECT image_url FROM ${tablename} WHERE ${postId_key} = ? ORDER BY created_at DESC LIMIT 1`;
            const values = [related_id];
            const { result: imageResult } = await query(sql, values);
            item.image = imageResult.map(item => item.image_url)[0]


            return item
        }))



        // 处理查询结果

        // 构造分页信息
        const pagination = {
            pageSize: limit,
            totalCount: totalInteractiveNotifications,
            totalPages: totalPages,
            currentPage: parseInt(page)
        };

        res.status(200).json({
            code: 200, msg: '获取互动通知成功', data: {
                list: newresult, ...pagination
            }
        });
    } catch (error) {
        console.error('Error retrieving user interactive notifications: ', error);
        res.status(500).json({ code: 500, msg: '获取互动通知失败' });
    }
}



// 导出函数以便在其他文件中使用
module.exports = {
    sendMessage, getNotification, getMessagesBetweenUsers,
    getUserAdminNotifications, getUserInteractiveNotifications,
    getNotice
};
