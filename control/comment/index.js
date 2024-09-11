const { query, pool } = require("../../db/index");
const { DYNAMIC_POST_COMMENTS, TEAM_ACTIVITY_POST_COMMENTS, DYNAMIC_POSTS, USERS, TEAM_ACTIVITY_POSTS, MESSAGE_TYPE } = require("../../db/config");
const isExistINTable = require("../utils/isExistUserAndPost");

 
// 执行查询的辅助函数
const queryWithConnection = (connection, sql, values) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (qerr, result, fields) => {
            if (qerr) {
                reject(qerr);
                return;
            }
            resolve({ result, fields });
        });
    });
};



/**
 * 发表评论并插入消息
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 帖子 ID
 * @param {string} req.body.content 评论内容
 * @param {string} tableName 数据库表名
 * @param {string} messageType 消息类型
 */
const postComment = async (req, res, tableName, messageType) => {
    const { user_id, post_id, content } = req.body;
    const id_key = tableName === DYNAMIC_POST_COMMENTS ? 'dynamic_post_id' : 'post_id';
    try {
        await new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                    return;
                }

                // 开始事务
                connection.beginTransaction(async (beginErr) => {
                    if (beginErr) {
                        console.error(beginErr.message);
                        connection.release();
                        reject(beginErr);
                        return;
                    }

                    try {
                        // 插入评论记录到数据库
                        const insertCommentSql = `INSERT INTO ${tableName} (user_id, ${id_key}, content) VALUES (?, ?, ?)`;
                        await queryWithConnection(connection, insertCommentSql, [user_id, post_id, content]);


                        // 获取最新插入的评论 ID
                        const { result: commentIdResult } = await queryWithConnection(connection, 'SELECT LAST_INSERT_ID() as insertId', []);
                        const commentId = commentIdResult[0].insertId;


                        // 获取帖子作者的用户ID
                        const { result: postAuthorIdResult } = await queryWithConnection(connection, `SELECT user_id FROM ${tableName === DYNAMIC_POST_COMMENTS ? DYNAMIC_POSTS : TEAM_ACTIVITY_POSTS} WHERE ${id_key} = ?`, [post_id]);
                        const postAuthorId = postAuthorIdResult[0].user_id;
                        console.log(postAuthorId);

                        // 插入消息记录到消息表中
                        const insertMessageSql = `
                        INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, content, type, related_id, comment_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                        await queryWithConnection(connection, insertMessageSql, ['user', user_id, 'user', postAuthorId, content, messageType, post_id, commentId]);

                        // 提交事务
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                console.error(commitErr.message);
                                reject(commitErr);
                                return;
                            }

                            resolve();
                        });
                    } catch (error) {
                        // 回滚事务
                        connection.rollback(() => {
                            console.error('评论失败 rolled back:', error);
                            reject(error);
                        });
                    } finally {
                        // 释放连接
                        connection.release();
                    }
                });
            });
        })
        res.status(200).json({ code: 200, msg: '评论发表成功' });
    } catch (error) {
        console.error(`发表评论失败:`, error);

        res.status(500).json({ code: 500, msg: '发表评论失败' });
    }
}


/**
 * 删除评论
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.comment_id 评论 ID
 * @param {number} req.body.user_id 用户 ID
 * @param {string} tableName 数据库表名
 */
const deleteComment = async (req, res, tableName) => {
    const { comment_id, user_id } = req.body;

    try {
        // 检查评论是否存在且是否属于当前用户
        const commentCheckSql = `SELECT * FROM ${tableName} WHERE comment_id = ? AND user_id = ?`;
        const { result: existingComment } = await query(commentCheckSql, [comment_id, user_id]);

        if (existingComment.length === 0) {
            return res.status(403).json({ code: 403, msg: '评论不存在或您无权删除该评论' });
        }

        // 删除评论
        const deleteCommentSql = `DELETE FROM ${tableName} WHERE comment_id = ?`;
        await query(deleteCommentSql, [comment_id]);

        res.status(200).json({ code: 200, msg: '评论删除成功' });
    } catch (error) {
        console.error(`删除评论失败:`, error);
        res.status(500).json({ code: 500, msg: '删除评论失败' });
    }
}


/**
 * 发表动态帖子评论
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 动态帖子 ID
 * @param {string} req.body.content 评论内容
 */
const postDynamicPostComment = async (req, res) => {
    const { user_id, post_id } = req.body;
    // 检查用户和帖子是否存在
    const [userResult, postResult] = await Promise.all([
        isExistINTable(USERS, { user_id }),
        isExistINTable(DYNAMIC_POSTS, { dynamic_post_id: post_id })
    ]);

    if (!userResult) {
        return res.status(400).json({ code: 400, msg: '用户不存在' });
    }

    if (!postResult) {
        return res.status(400).json({ code: 400, msg: '点赞帖子不存在' });
    }
    await postComment(req, res, DYNAMIC_POST_COMMENTS, MESSAGE_TYPE.DYNAMIC_POST_COMMENT);
}

/**
 * 发表组队帖子评论
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 组队帖子 ID
 * @param {string} req.body.content 评论内容
 */
const postTeamPostComment = async (req, res) => {
    const { user_id, post_id } = req.body;
    // 检查用户和帖子是否存在
    const [userResult, postResult] = await Promise.all([
        isExistINTable(USERS, { user_id }),
        isExistINTable(TEAM_ACTIVITY_POSTS, { post_id })
    ]);

    if (!userResult) {
        return res.status(400).json({ code: 400, msg: '用户不存在' });
    }

    if (!postResult) {
        return res.status(400).json({ code: 400, msg: '帖子不存在' });
    }
    await postComment(req, res, TEAM_ACTIVITY_POST_COMMENTS, MESSAGE_TYPE.TEAM_ACTIVITY_POST_COMMENT);
}

/**
 * 删除动态帖子评论
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.comment_id 评论 ID
 * @param {number} req.body.user_id 用户 ID
 */
const deleteDynamicPostComment = async (req, res) => {
    await deleteComment(req, res, DYNAMIC_POST_COMMENTS);
}

/**
 * 删除组队帖子评论
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.comment_id 评论 ID
 * @param {number} req.body.user_id 用户 ID
 */
const deleteTeamPostComment = async (req, res) => {
    await deleteComment(req, res, TEAM_ACTIVITY_POST_COMMENTS);
}



/**
 * 查询动态帖子的评论（分页）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.post_id 帖子 ID
 * @param {number} req.body.page 页码
 * @param {number} req.body.limit 每页数量
 */
const getPostComments = async (req, res) => {
    const { post_id, page = 1, limit = 10 } = req.body;
    const offset = (page - 1) * limit;

    try {
        const countSql = `SELECT COUNT(*) AS total FROM ${DYNAMIC_POST_COMMENTS} WHERE dynamic_post_id = ?;`;
        const { result: countResult } = await query(countSql, [post_id]);
        const totalComment = countResult[0].total;

        const sql = `SELECT c.*, u.user_id, u.nickname, u.avatar_url
        FROM ${DYNAMIC_POST_COMMENTS} c
        JOIN ${USERS} u ON c.user_id = u.user_id
        WHERE c.dynamic_post_id = ?
        LIMIT ?, ?;`;
        const { result: comments } = await query(sql, [post_id, offset, limit]);
        const newComments = comments.map(e => {
            return {
                comment_id: e.comment_id,
                content: e.content,
                created_at: e.created_at,
                user_info: {
                    user_id: e.user_id,
                    nickname: e.nickname,
                    avatar_url: e.avatar_url
                },
            }
        });

        const responseData = {
            list: newComments,

            pageSize: limit,
            totalCount: totalComment,
            totalPages: Math.ceil(totalComment / limit),
            currentPage: parseInt(page)

        };

        res.status(200).json({
            code: 200, msg: '查询帖子评论成功', data: responseData
        });
    } catch (error) {
        console.error('查询帖子评论失败:', error);
        res.status(500).json({ code: 500, msg: '查询帖子评论失败' });
    }
}

/**
 * 查询用户动态的评论（分页）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.page 页码
 * @param {number} req.body.limit 每页数量
 */
const getUserComments = async (req, res) => {
    const { user_id, page = 1, limit = 10 } = req.body;
    const offset = (page - 1) * limit;

    try {
        const countSql = `SELECT COUNT(*) AS total FROM ${DYNAMIC_POST_COMMENTS} WHERE user_id = ?;`;
        const { result: countResult } = await query(countSql, [user_id]);
        const totalComment = countResult[0].total;

        const sql = `SELECT * FROM ${DYNAMIC_POST_COMMENTS} WHERE user_id = ? LIMIT ?, ?;`;
        const { result: comments } = await query(sql, [user_id, offset, limit]);

        const responseData = {
            list: comments,

            pageSize: limit,
            totalCount: totalComment,
            totalPages: Math.ceil(totalComment / limit),
            currentPage: parseInt(page)

        };

        res.status(200).json({ code: 200, msg: '查询用户评论成功', data: responseData });
    } catch (error) {
        console.error('查询用户评论失败:', error);
        res.status(500).json({ code: 500, msg: '查询用户评论失败' });
    }
}


module.exports = {
    getPostComments,
    getUserComments,
    postDynamicPostComment,
    postTeamPostComment,
    deleteDynamicPostComment,
    deleteTeamPostComment
}