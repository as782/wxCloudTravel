const { query, pool } = require("../../db/index");
const { DYNAMIC_POST_LIKES, TEAM_ACTIVITY_POST_LIKES, TEAM_ACTIVITY_POSTS, USERS, DYNAMIC_POSTS, MESSAGE_TYPE } = require("../../db/config");
const isExistINTable = require("../utils/isExistUserAndPost");

/**
 * 点赞或取消点赞帖子
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 帖子 ID
 * @param {string} tableName 数据库表名
 */
const toggleLikePost = async (req, res, tableName, messageType) => {
    const { user_id, post_id } = req.body;
    const id_key = tableName === DYNAMIC_POST_LIKES ? 'dynamic_post_id' : 'post_id';
    try {
        // 检查用户是否已经点赞过该帖子
        const likeCheckSql = `SELECT * FROM ${tableName} WHERE user_id = ? AND ${id_key} = ?`;
        const { result: existingLike } = await query(likeCheckSql, [user_id, post_id]);

        if (existingLike.length > 0) {
            // 如果存在点赞记录，则执行取消点赞操作
            const deleteLikeSql = `DELETE FROM ${tableName} WHERE user_id = ? AND ${id_key} = ?`;
            await query(deleteLikeSql, [user_id, post_id]);

            res.status(200).json({ code: 200, msg: '取消点赞成功', data: -1 });
        } else {

            await new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                    if (err) {
                        console.error(err.message);
                        reject(err);
                        return;
                    }
                    connection.beginTransaction(async (beginErr) => {
                        if (beginErr) {
                            console.error(beginErr.message);
                            connection.release();
                            reject(beginErr);
                            return;
                        }
                        try {

                            // 如果不存在点赞记录，则执行点赞操作
                            const insertLikeSql = `INSERT INTO ${tableName} (user_id, ${id_key}) VALUES (?, ?)`;
                            await query(insertLikeSql, [user_id, post_id]);
                            const { result: likeIdResult } = await query('SELECT LAST_INSERT_ID() as insertId', []);
                            const likeId = likeIdResult[0].insertId;

                            // 获取帖子作者的用户ID
                            const { result: postAuthorIdResult } = await query(`SELECT user_id FROM ${tableName === DYNAMIC_POST_LIKES ? DYNAMIC_POSTS : TEAM_ACTIVITY_POSTS} WHERE ${id_key} = ?`, [post_id]);
                            const postAuthorId = postAuthorIdResult[0].user_id;


                            // 插入消息记录到消息表中
                            const insertMessageSql = `
                                INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, type, related_id, like_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;
                            await query(insertMessageSql, ['user', user_id, 'user', postAuthorId, messageType, post_id, likeId]);


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
                                console.error('点赞 rolled back:', error);
                                reject(error);
                            });
                        } finally {
                            // 释放连接
                            connection.release();
                        }
                    })
                })
            })

            res.status(200).json({ code: 200, msg: '点赞成功', data: 1 });
        }
    } catch (error) {
        console.error(`操作帖子失败:`, error);
        res.status(500).json({ code: 500, msg: '操作帖子失败' });
    }
}

/**
 * 点赞或取消点赞动态帖子
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 动态帖子 ID
 */
const toggleLikeDynamicPost = async (req, res) => {
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
    await toggleLikePost(req, res, DYNAMIC_POST_LIKES, MESSAGE_TYPE.DYNAMIC_POST_LIKE);
}

/**
 * 点赞或取消点赞组队帖子
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 组队帖子 ID
 */
const toggleLikeTeamPost = async (req, res) => {
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
        return res.status(400).json({ code: 400, msg: '点赞帖子不存在' });
    }
    await toggleLikePost(req, res, TEAM_ACTIVITY_POST_LIKES, MESSAGE_TYPE.TEAM_ACTIVITY_POST_LIKE);
}


/**
 * 获取点赞帖子的用户列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.params.post_id 帖子 ID
 * @param {string} tableName 数据库表名
 */
const getLikedUsers = async (req, res, tableName) => {
    const { post_id } = req.params;
    const id_key = tableName === DYNAMIC_POST_LIKES ? 'dynamic_post_id' : 'post_id';
    try {
        const sql = `SELECT user_id FROM ${tableName} WHERE ${id_key} = ?`;
        const { result: likedUsers } = await query(sql, [post_id]);
        res.status(200).json({ code: 200, msg: '获取成功', data: likedUsers });
    } catch (error) {
        console.error(`获取点赞帖子的用户列表失败:`, error);
        res.status(500).json({ code: 500, msg: '获取点赞帖子的用户列表失败' });
    }
}

/**
 * 获取点赞动态帖子的用户列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.params.post_id 动态帖子 ID
 */
const getLikedDynamicPostUsers = async (req, res) => {
    await getLikedUsers(req, res, DYNAMIC_POST_LIKES);
}

/**
 * 获取点赞组队帖子的用户列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.params.post_id 组队帖子 ID
 */
const getLikedTeamPostUsers = async (req, res) => {
    await getLikedUsers(req, res, TEAM_ACTIVITY_POST_LIKES);
}




/**
 * 查询用户点赞的动态
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.query.user_id 用户 ID
 */
const getUserLikedDynamicPosts = async (req, res) => {
    const { user_id } = req.params;

    try {
        const sql = `SELECT * FROM ${DYNAMIC_POST_LIKES} WHERE user_id = ? `;
        const { result: likedPosts } = await query(sql, [user_id]);
        // 对每个post_id 查询后返回那些status为1的记录
        const postIds = likedPosts.map((post) => post.dynamic_post_id);
        if (postIds.length === 0) {
            res.status(200).json({
                code: 200, msg: '查询用户点赞的帖子成功', data: {
                    list: []
                }
            }
            );
            return;
        }
        const postSql = `SELECT * FROM ${DYNAMIC_POSTS} WHERE dynamic_post_id IN (?) AND status = 1`;

        const { result: posts } = await query(postSql, [postIds]);
        const postID = posts.map((post) => post.dynamic_post_id);
        const newLikepost = likedPosts.filter((post) => {
            return postID.includes(post.dynamic_post_id);
        })

        res.status(200).json({
            code: 200, msg: '查询用户点赞的帖子成功', data: {
                list: newLikepost
            }
        });
    } catch (error) {
        console.error('查询用户点赞的帖子失败:', error);
        res.status(500).json({ code: 500, msg: '查询用户点赞的帖子失败' });
    }
}
/**
 * 查询用户点赞的组队
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.query.user_id 用户 ID
 */
const getUserLikedTeamPosts = async (req, res) => {
    const { user_id } = req.params;

    try {
        const sql = `SELECT * FROM ${TEAM_ACTIVITY_POST_LIKES} WHERE user_id = ?`;
        const { result: likedPosts } = await query(sql, [user_id]);
        // 对每个post_id 查询后返回那些status为1的记录
        const postIds = likedPosts.map((post) => post.post_id);
        if (postIds.length === 0) {
            res.status(200).json({
                code: 200, msg: '查询用户点赞的帖子成功', data: {
                    list: []
                }
            });
            return;
        }
        const postSql = `SELECT * FROM ${TEAM_ACTIVITY_POSTS} WHERE  post_id IN (?) AND status = 1`;

        const { result: posts } = await query(postSql, [postIds]);
        const postID = posts.map((post) => post.post_id);
        const newLikepost = likedPosts.filter((post) => {
            return postID.includes(post.post_id);
        })

        res.status(200).json({
            code: 200, msg: '查询用户点赞的帖子成功', data: {
                list: newLikepost
            }
        });
    } catch (error) {
        console.error('查询用户点赞的帖子失败:', error);
        res.status(500).json({ code: 500, msg: '查询用户点赞的帖子失败' });
    }
}

module.exports = {
    toggleLikeDynamicPost,
    toggleLikeTeamPost,
    getUserLikedDynamicPosts,
    getUserLikedTeamPosts,
    getLikedDynamicPostUsers,
    getLikedTeamPostUsers,
}