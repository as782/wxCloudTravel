const { TEAM_ACTIVITY_PARTICIPANTS, TEAM_ACTIVITY_POSTS, USERS, USER_FOLLOWS, DYNAMIC_POSTS, DYNAMIC_POST_IMAGES, TEAM_ACTIVITY_IMAGES, DYNAMIC_POST_COMMENTS, DYNAMIC_POST_LIKES, TEAM_ACTIVITY_POST_LIKES, TEAM_ACTIVITY_POST_COMMENTS, MESSAGE_TYPE, USER_TAGS, TAGS } = require('../../db/config');
const { query, pool } = require('../../db/index');
const getUserTagsInfo = require('../utils/getUserTags');
const isExistINTable = require('../utils/isExistUserAndPost');
// API handle function

function executeTransaction(pool, callback) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err)
                return
            }
            //开启事务
            connection.beginTransaction(async (beginErr) => {
                if (beginErr) {
                    console.error(beginErr.message);
                    connection.release();
                    reject(beginErr);
                    return;
                }

                try {
                    await callback(connection)
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
                        console.error('失败 rolled back:', error);
                        reject(error);
                    });
                } finally {
                    // 释放连接
                    connection.release();
                }

            })

        })
    })
}
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
 * 关注或取消关注用户
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {string} action 动作，1 表示关注，0 表示取消关注
 */
const followOrUnfollowUser = async (req, res) => {
    const { follower_id, following_id, action } = req.body;
    if (!follower_id || !following_id) {
        res.status(400).json({ code: 400, msg: '参数错误' });
        return
    }

    try {
        let sql, message;
        if (action === 1) {
            // 检查是否已经关注了目标用户
            const isFollowing = await isUserFollowing(follower_id, following_id);
            if (isFollowing) {
                return res.status(400).json({ code: 400, msg: '您已经关注了该用户' });
            }
            // 执行关注操作
            sql = `INSERT INTO ${USER_FOLLOWS} (follower_id, following_id) VALUES (?, ?)`;
            message = '关注成功';
        } else if (action === 0) {
            // 执行取消关注操作
            sql = `DELETE FROM ${USER_FOLLOWS} WHERE follower_id = ? AND following_id = ?`;
            message = '取消关注成功';
        } else {
            return res.status(400).json({ code: 400, msg: '无效的操作' });
        }

        const sqlFunc = async (connection) => {
            // 执行关注或取消关注操作
            await queryWithConnection(connection, sql, [follower_id, following_id]);

            // 插入消息记录到消息表中
            const insertMessageSql = `
             INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, content, type)
             VALUES (?, ?, ?, ?, ?, ?)
         `;
            const content = action === 1 ? '关注' : '取消关注';
            await queryWithConnection(connection, insertMessageSql, ['user', follower_id, 'user', following_id, content, MESSAGE_TYPE.FOLLOW_NOTIFICATION]);
        }
        await executeTransaction(pool, async (connct) => await sqlFunc(connct))
        res.status(200).json({ code: 200, msg: message });
    } catch (error) {
        console.error(`${action === 1 ? '关注' : '取消关注'}用户失败:`, error);
        res.status(500).json({ code: 500, msg: `${action === 1 ? '关注' : '取消关注'}用户失败` });
    }
}

/**
 * 检查用户是否已关注目标用户
 * @param {number} follower_id 粉丝用户的 ID
 * @param {number} following_id 目标用户的 ID
 * @returns {Promise<boolean>} 如果已经关注则返回 true，否则返回 false
 */
const isUserFollowing = async (follower_id, following_id) => {
    const sql = `SELECT COUNT(*) AS count FROM ${USER_FOLLOWS} WHERE follower_id = ? AND following_id = ?`;
    const { result } = await query(sql, [follower_id, following_id]);
    return result[0].count > 0;
}

module.exports = {
    followOrUnfollowUser
};

/**
 * 获取关注
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const getFollowers = async (req, res) => {
    const userId = req.params.user_id;
    if (!userId) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }
    try {

        const { result: followResult } = await query('SELECT * FROM user_follows WHERE follower_id = ?', [userId]);

        const followUserIds = followResult.map(follow => follow.following_id);

        if (!followUserIds.length) {
            return res.status(200).json({
                code: 200, msg: '暂无关注用户', data: {
                    list: []
                }
            });
        }
        // 关注用户的info
        const { result: followUserResults } = await query('SELECT * FROM users WHERE user_id IN (?)', [followUserIds]);
        // 每个用户的标签信息
        const followersUserTagsInfoList = await getUserTagsInfo(followUserIds);


        // 整合关注用户信息
        const fansUserInfoList = followUserResults.map((fansUserInfo) => {
            const { user_id, username, avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, created_at } = fansUserInfo;
            const tags = followersUserTagsInfoList.find(e => {
                return e.user_id === user_id;
            }).tags;

            const user_info = {
                user_id,
                username,
                avatar_url,
                nickname,
                gender,
                bio,
                birthday,
                tags,
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
            return user_info
        });

        res.status(200).json(
            {
                code: 200,
                msg: '关注列表信息获取成功',
                data: {
                    list: fansUserInfoList
                }
            }
        )
    } catch (error) {
        console.log('关注列表信息获取失败', error);
        res.status(500).json({
            code: 500,
            msg: '关注列表信息获取失败' + error,
            data: null
        })
    }
}
/**
 * 获取粉丝
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const getFans = async (req, res) => {
    const userId = req.params.user_id;
    if (!userId) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }
    try {

        const { result: fansResult } = await query('SELECT * FROM user_follows WHERE following_id = ?', [userId]);
        const fansUserIds = fansResult.map(follow => follow.follower_id);

        if (!fansUserIds.length) {
            return res.status(200).json({
                code: 200, msg: '暂无粉丝', data: {
                    list: []
                }
            });
        }
        // 关注用户的info
        const { result: fansUserResult } = await query('SELECT * FROM users WHERE user_id IN (?)', [fansUserIds]);

        // 每个用户的标签信息
        const fansUserTagsInfoList = await getUserTagsInfo(fansUserIds);

        // 整合粉丝用户信息
        const fansUserInfoList = fansUserResult.map((fansUserInfo) => {
            const { user_id, username, avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, created_at } = fansUserInfo;
            const tags = fansUserTagsInfoList.find(e => {
                return e.user_id === user_id;
            }).tags;
            const user_info = {
                user_id,
                username,
                avatar_url,
                nickname,
                gender,
                bio,
                birthday,
                tags,
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
            return user_info
        });

        res.status(200).json(
            {
                code: 200,
                msg: '粉丝列表信息获取成功',
                data: {
                    list: fansUserInfoList
                }
            }
        )
    } catch (error) {

        res.status(500).json({
            code: 500,
            msg: '粉丝列表信息获取失败' + error,
            data: null
        })
    }
}
/**
 * 获取用户信息
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const getUserInfo = async function (req, res, next) {
    let userId = req.params.id;
    if (!userId) {
        return res.status(400).json({ code: 400, msg: '参数错误' });
    }
    let sql = 'SELECT * FROM users WHERE user_id = ?';
    try {
        let { result: userResult } = await query(sql, [userId]);
        if (!userResult.length) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }
        const user_id = userResult[0].user_id;
        // 每个用户的标签信息
        const userTagsInfoList = await getUserTagsInfo([user_id]);
        const tags = userTagsInfoList.find(e => {
            return e.user_id === user_id;
        }).tags;

        const { avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, created_at } = userResult[0];
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
        res.status(200).json({
            code: 200,
            msg: '获取用户信息成功',
            data: user_info
        });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
}
/**
 * 更新用户信息
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const updateUserInfo = async (req, res, next) => {
    try {
        const { user_id, avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, tags } = req.body;
        console.log(birthday);
        let birthdayObj = new Date(birthday);

        // 检查用户是否存在
        const { result: userExists } = await query('SELECT COUNT(*) AS count FROM users WHERE user_id = ?', [user_id]);
        if (userExists[0].count === 0) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }

        // 更新用户信息
        const updateSql = `
            UPDATE users 
            SET avatar_url = ?, nickname = ?, gender = ?, bio = ?, birthday = ?, region_name = ?, region_code = ?, contact_phone = ?, contact_email = ?
            WHERE user_id = ?;
        `;
        await query(updateSql, [avatar_url, nickname, gender, bio, birthdayObj, region_name, region_code, contact_phone, contact_email, user_id]);

        // 检查是否存在标签并更新用户标签信息
        if (Array.isArray(tags) && tags.length > 0) {
            // 检查标签是否存在
            const invalidTags = [];
            for (const tagId of tags) {
                const { result: tagExists } = await query('SELECT COUNT(*) AS count FROM tags WHERE tag_id = ?', [tagId]);
                if (tagExists[0].count === 0) {
                    invalidTags.push(tagId);
                }
            }
            if (invalidTags.length > 0) {
                return res.status(400).json({ code: 400, msg: `标签 ${invalidTags.join(', ')} 不存在` });
            }

            // 更新用户标签信息
            const deleteTagsSql = 'DELETE FROM user_tags WHERE user_id = ?';
            await query(deleteTagsSql, [user_id]);

            const insertTagsSql = 'INSERT INTO user_tags (user_id, tag_id) VALUES ?';
            const tagValues = tags.map(tagId => [user_id, tagId]);
            await query(insertTagsSql, [tagValues]);
        }

        res.status(200).json({ code: 200, msg: '用户信息更新成功' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};

/**
 * 加入小队
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.user_id 用户 ID
 * @param {number} req.body.post_id 组队帖子 ID
 */
const joinTeam = async (req, res) => {
    const { user_id, post_id } = req.body;

    try {
        // 检查用户和帖子是否存在
        const [userResult, postResult] = await Promise.all([
            isExistINTable(USERS, { user_id }),
            isExistINTable(TEAM_ACTIVITY_POSTS, { post_id })
        ]);

        if (!userResult) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }

        if (!postResult) {
            return res.status(400).json({ code: 400, msg: '组队帖子不存在' });
        }

        // 检查用户是否已经加入小队
        const joinCheckSql = `SELECT * FROM ${TEAM_ACTIVITY_PARTICIPANTS} WHERE user_id = ? AND post_id = ?`;
        const { result: existingJoin } = await query(joinCheckSql, [user_id, post_id]);

        if (existingJoin.length > 0) {
            return res.status(400).json({ code: 400, msg: '用户已经加入小队' });
        }

        // 将加入小队记录插入数据库
        const insertJoinSql = `INSERT INTO ${TEAM_ACTIVITY_PARTICIPANTS} (post_id, user_id) VALUES (?, ?)`;
        await query(insertJoinSql, [post_id, user_id]);

        res.status(200).json({ code: 200, msg: '加入小队成功' });
    } catch (error) {
        console.error('加入小队失败:', error);
        res.status(500).json({ code: 500, msg: '加入小队失败' });
    }
}

/**
 * 获取用户加入的小队信息
 * @param {*} req 
 * @param {*} res 
 * @param {number} req.body.page 请求页码
 * @param {number} req.body.limit 每页大小
 * @param {number} req.body.user_id 用户ID
 */
const getUserTeams = async (req, res) => {
    const { user_id, page = 1, limit = 10 } = req.body;
    try {
        // 查询总数
        const totalTeamsCountSql = `
            SELECT COUNT(*) AS count
            FROM ${TEAM_ACTIVITY_PARTICIPANTS}
            WHERE user_id = ?`;
        const { result: totalTeamsCount } = (await query(totalTeamsCountSql, [user_id]));

        // 计算分页偏移量
        const offset = (page - 1) * limit;

        // 查询小队信息及其相关图片
        const teamsSql = `
        SELECT t.*, JSON_ARRAYAGG(JSON_OBJECT('image_id', ti.image_id, 'image_url', ti.image_url)) AS images
        FROM ${TEAM_ACTIVITY_POSTS} t
        LEFT JOIN ${TEAM_ACTIVITY_IMAGES} ti ON t.post_id = ti.post_id
        WHERE t.post_id IN (
            SELECT post_id
            FROM ${TEAM_ACTIVITY_PARTICIPANTS}
            WHERE user_id = ?
        ) AND t.status = 1
        GROUP BY t.post_id
        ORDER BY t.created_at ASC
        LIMIT ? OFFSET ?`;
        const { result: userTeams } = await query(teamsSql, [user_id, limit, offset]);

        // 处理帖子图片
        userTeams.forEach(team => {
            team.images = team.images ? JSON.parse(team.images) : [];
        });

        for (const item of userTeams) {
            const { result } = await query(`SELECT * FROM ${USERS} WHERE user_id = ?`, [item.user_id]);
            item.user_info = {
                user_id: result[0].user_id,
                nickname: result[0].nickname,
                avatar_url: result[0].avatar_url
            };
        }

        res.status(200).json({
            code: 200,
            data: {
                list: userTeams,
                pageSize: limit,
                totalCount: totalTeamsCount[0].count,
                totalPages: Math.ceil(totalTeamsCount[0].count / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error('Error fetching user teams:', error);
        res.status(500).json({ code: 500, msg: 'Failed to fetch user teams' });
    }
};


/**
 * 获取我的发布
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.page 请求页码
 * @param {number} req.body.limit 每页大小
 * @param {number} req.body.user_id 用户ID
 */
const getMyPosts = async (req, res) => {
    try {
        const { user_id, page = 1, limit = 10 } = req.body;

        // 查询总数
        const teamPostsCountSql = `
            SELECT COUNT(*) AS count
            FROM ${TEAM_ACTIVITY_POSTS}
            WHERE user_id = ?`;
        const dynamicPostsCountSql = `
            SELECT COUNT(*) AS count
            FROM ${DYNAMIC_POSTS}
            WHERE user_id = ?`;

        const { result: teamPostsCount } = await query(teamPostsCountSql, [user_id]);
        const { result: dynamicPostsCount } = await query(dynamicPostsCountSql, [user_id]);

        const totalCount = teamPostsCount[0].count + dynamicPostsCount[0].count;

        // 计算分页偏移量
        const offset = (page - 1) * limit;

        // 查询组队帖子及其相关图片
        const teamPostsSql = `
            SELECT t.*, JSON_ARRAYAGG(JSON_OBJECT('image_id', ti.image_id, 'image_url', ti.image_url)) AS images
            FROM ${TEAM_ACTIVITY_POSTS} t
            LEFT JOIN ${TEAM_ACTIVITY_IMAGES} ti ON t.post_id = ti.post_id
            WHERE t.user_id = ?
            GROUP BY t.post_id 
            ORDER BY t.created_at ASC
            LIMIT ? OFFSET ?`;
        const { result: teamPosts } = await query(teamPostsSql, [user_id, limit, offset]);

        // 查询动态帖子及其相关图片
        const dynamicPostsSql = `
        SELECT d.*,
               JSON_ARRAYAGG(JSON_OBJECT('image_id', di.image_id, 'image_url', di.image_url)) AS images
        FROM ${DYNAMIC_POSTS} d
        LEFT JOIN ${DYNAMIC_POST_IMAGES} di ON d.dynamic_post_id = di.dynamic_post_id
        WHERE d.user_id = ?
        GROUP BY d.dynamic_post_id
        ORDER BY d.created_at ASC
        LIMIT ? OFFSET ?`;


        const { result: dynamicPosts } = await query(dynamicPostsSql, [user_id, limit, offset]);
        // 处理帖子图片
        teamPosts.forEach(post => {
            post.images = post.images ? JSON.parse(post.images) : [];
            if (post.images[0].image_id === null) {
                post.images = [];
            }
        });
        dynamicPosts.forEach(post => {
            post.images = post.images ? JSON.parse(post.images) : [];
            if (post.images[0].image_id === null) {
                post.images = [];
            }
        });

        // 遍历组队帖子并查询评论数和点赞数
        for (const item of teamPosts) {
            const postId = item.post_id;
            const commentCountSql = `SELECT COUNT(*) AS comment_count FROM ${TEAM_ACTIVITY_POST_COMMENTS} WHERE post_id = ?`;
            const likeCountSql = `SELECT COUNT(*) AS like_count FROM ${TEAM_ACTIVITY_POST_LIKES} WHERE post_id = ?`;

            const { result: commentResult } = await query(commentCountSql, [postId]);
            const { result: likeResult } = await query(likeCountSql, [postId]);

            const commentCount = commentResult[0].comment_count || 0;
            const likeCount = likeResult[0].like_count || 0;

            // 将评论数和点赞数合并到原始帖子对象中
            item.comment_count = commentCount;
            item.like_count = likeCount;
        }

        // 遍历动态帖子并查询评论数和点赞数
        for (const item of dynamicPosts) {
            const postId = item.dynamic_post_id;
            const commentCountSql = `SELECT COUNT(*) AS comment_count FROM ${DYNAMIC_POST_COMMENTS} WHERE dynamic_post_id = ?`;
            const likeCountSql = `SELECT COUNT(*) AS like_count FROM ${DYNAMIC_POST_LIKES} WHERE dynamic_post_id = ?`;

            const { result: commentResult } = await query(commentCountSql, [postId]);
            const { result: likeResult } = await query(likeCountSql, [postId]);

            const commentCount = commentResult[0].comment_count || 0;
            const likeCount = likeResult[0].like_count || 0;

            // 将评论数和点赞数合并到原始帖子对象中
            item.comment_count = commentCount;
            item.like_count = likeCount;
        }


        // 合并结果并返回
        const myPosts = [...teamPosts, ...dynamicPosts];
        res.status(200).json({
            code: 200, msg: '获取我的发布成功', data: {
                list: myPosts,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error('获取我的发布失败:', error);
        res.status(500).json({ code: 500, msg: '获取我的发布失败' });
    }
}

/**
 * 获取用户卡片信息
 * @param {*} req 
 * @param {*} res 
 */
const getUserCardInfo = async (req, res) => {
    try {
        const { user_id } = req.params;

        // 查询用户信息
        const sqlUserInfo = `
            SELECT 
                user_id,
                nickname,
                avatar_url,
                bio,
                created_at
            FROM 
                ${USERS}
            WHERE 
                user_id = ?;
        `;
        const { result: userInfoResult } = await query(sqlUserInfo, [user_id]);

        // 查询用户标签
        const sqlUserTags = `
            SELECT 
                t.tag_name
            FROM 
                ${USER_TAGS} ut
            LEFT JOIN 
                ${TAGS} t
            ON 
                ut.tag_id = t.tag_id
            WHERE 
                ut.user_id = ?;
        `;
        const { result: userTagsResult } = await query(sqlUserTags, [user_id]);

        // 查询用户点赞数
        const sqlTeamLikes = `
            SELECT 
                user_id
            FROM 
                ${TEAM_ACTIVITY_POST_LIKES}
            WHERE 
                user_id = ?;
        `;
        const { result: teamLikesResult } = await query(sqlTeamLikes, [user_id]);

        const sqlDynamicLikes = `
            SELECT 
                user_id
            FROM 
                ${DYNAMIC_POST_LIKES}
            WHERE 
                user_id = ?;
        `;
        const { result: dynamicLikesResult } = await query(sqlDynamicLikes, [user_id]);

        // 查询用户关注数
        const sqlFollows = `
            SELECT 
                follower_id
            FROM 
                ${USER_FOLLOWS}
            WHERE 
                following_id = ?;
        `;
        const { result: followsResult } = await query(sqlFollows, [user_id]);

        // 查询用户粉丝数
        const sqlFans = `
            SELECT 
                following_id
            FROM 
                ${USER_FOLLOWS}
            WHERE 
                follower_id = ?;
        `;
        const { result: fansResult } = await query(sqlFans, [user_id]);

        // 构造返回对象
        const userCardInfo = {
            user_info: {
                user_id: userInfoResult[0].user_id,
                nickname: userInfoResult[0].nickname,
                avatar_url: userInfoResult[0].avatar_url
            },
            bio: userInfoResult[0].bio,
            tags: userTagsResult.map(row => (row)),
            created_at: userInfoResult[0].created_at,
            likeCount: teamLikesResult.length + dynamicLikesResult.length,
            followCount: followsResult.length,
            fansCount: fansResult.length
        };

        // 发送响应
        res.status(200).json({
            code: 200,
            msg: '获取卡片信息成功',
            data: userCardInfo
        });
    } catch (error) {
        console.error("Error fetching user card info:", error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error"
        });
    }
};


/** 修改密码 */
const updatePassword = async (req, res) => {
    try {
        const { user_id, old_password, new_password } = req.body;
        // 检查原始密码是否正确
        const sql = `SELECT password FROM users WHERE user_id = ?`;

        const values = [user_id];
        const {result:sresult} = await query(sql, values);
        const stored_password = sresult[0].password;
        
        if (stored_password !== old_password) {
            return res.status(400).json({ code: 400, msg: '原始密码错误' });
        }

        // 更新密码
        const updateSql = `UPDATE users SET password = ? WHERE user_id = ?`;
        const updateValues = [new_password, user_id];
        await query(updateSql, updateValues);
        res.status(200).json({ code: 200, msg: '密码修改成功' });
    } catch (error) {
        console.error('密码修改失败:', error);
        res.status(500).json({ code: 500, msg: '密码修改失败' });
    }

}

module.exports = {
    getUserInfo,
    getUserCardInfo,
    getFollowers,
    getFans,
    updateUserInfo,
    joinTeam,
    followOrUnfollowUser,
    getMyPosts,
    getUserTeams,
    updatePassword
}