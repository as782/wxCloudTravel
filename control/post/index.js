const { USERS, DYNAMIC_POSTS, DYNAMIC_POST_IMAGES, TEAM_ACTIVITY_POSTS, TEAM_ACTIVITY_IMAGES, ITINERARIES, DYNAMIC_POST_COMMENTS, DYNAMIC_POST_LIKES, TEAM_ACTIVITY_POST_COMMENTS, TEAM_ACTIVITY_POST_LIKES, USER_FOLLOWS, TEAM_ACTIVITY_PARTICIPANTS, RECOMMENDATIONS } = require('../../db/config');
const { query } = require('../../db/index');
const getUserTagsInfo = require('../utils/getUserTags');
const isExistINTable = require('../utils/isExistUserAndPost');
const { insertDataToDatabase, associateImagesWithData, deleteImagesByDataId } = require('./postRelativeImage');



/**
 * 发布动态帖子
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const publishDynamicPost = async (req, res) => {
    try {
        const {
            user_id,
            content,
            image_urls
        } = req.body;
        // 检查必要字段是否存在
        if (!user_id) {
            return res.status(400).json({ code: 400, msg: '缺少必要字段' });
        }
        // 查询用户存在
        const { result: userResult } = await query(`SELECT * FROM ${USERS} WHERE user_id = ?`, [user_id]);
        if (userResult.length === 0) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }


        // 插入到数据库，返回post id
        const postId = await insertDataToDatabase(DYNAMIC_POSTS, {
            user_id,
            content
        });
        // 通过 关联图片和帖子 如果image_urls 为空数组就关联

        await associateImagesWithData(DYNAMIC_POST_IMAGES, postId, image_urls, ['dynamic_post_id', 'image_url'])

        res.status(200).json({ code: 200, msg: '发布动态成功' });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};

/**
 * 更新动态帖子
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 * @returns {Promise<void>}
 */
const updateDynamicPost = async (req, res) => {
    try {
        // 解构请求体
        const { user_id, dynamic_post_id, content, image_urls } = req.body;

        // 检查必要字段是否存在
        if (!user_id || !dynamic_post_id) {
            return res.status(400).json({ code: 400, msg: '缺少必要字段' });
        }

        // 更新动态帖子信息到数据库
        const updateFields = [];
        const values = [];

        // 构建需要更新的字段和对应的值
        if (content) {
            updateFields.push('content = ?');
            values.push(content);
        }

        // 执行更新操作
        if (updateFields.length > 0) {
            // 将status字段更新为2 待审核
            updateFields.push('status = ?');
            values.push(2);
            const sql = `UPDATE ${DYNAMIC_POSTS} SET ${updateFields.join(', ')} WHERE dynamic_post_id = ? AND user_id = ?`;

            values.push(dynamic_post_id, user_id);
            await query(sql, values);
        }

        // 删除之前所有动态帖子相关的的所有图片，以之后更新的数据为准
        // await deleteImagesByDataId(DYNAMIC_POST_IMAGES, dynamic_post_id, 'dynamic_post_id');

        // 更新动态帖子的图片
        if (image_urls && image_urls.length > 0) {
            await associateImagesWithData(DYNAMIC_POST_IMAGES, dynamic_post_id, image_urls, ['dynamic_post_id', 'image_url']);
        }

        // 返回成功消息
        res.status(200).json({ code: 200, msg: '更新动态帖子成功' });
    } catch (error) {
        // 捕获并返回错误信息
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};


/**
 * 发布组队帖子
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const publishTeamPost = async (req, res) => {
    try {
        const {
            user_id,
            title,
            description,
            start_location,
            end_location,
            duration_day,
            team_size,
            estimated_expense,
            gender_requirement,
            payment_method,
            theme_id,
            itinerary,
            image_urls
        } = req.body;

        // 查询用户存在
        const { result: userResult } = await query(`SELECT * FROM ${USERS} WHERE user_id = ?`, [user_id]);
        if (userResult.length === 0) {
            return res.status(400).json({ code: 400, msg: '用户不存在' });
        }


        // 检查必要字段是否存在
        if (!user_id || !title || !start_location || !end_location || !duration_day || !team_size || !payment_method || !theme_id || !image_urls.length) {
            return res.status(400).json({ code: 400, msg: '缺少必要字段' });
        }

        // 插入到数据库，返回post id
        const postId = await insertDataToDatabase(TEAM_ACTIVITY_POSTS, {
            user_id,
            title,
            description,
            start_location,
            end_location,
            duration_day,
            team_size,
            estimated_expense,
            gender_requirement,
            payment_method,
            theme_id,
        });
        // 通过 关联图片和帖子
        await associateImagesWithData(TEAM_ACTIVITY_IMAGES, postId, image_urls, ['post_id', 'image_url'])

        // 行程
        if (itinerary) {
            await associateImagesWithData(ITINERARIES, postId, [itinerary], ['post_id', 'image_url'])
        }
        res.status(200).json({ code: 200, msg: '发布组队帖子成功' });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};

/**
 * 更新组队帖子
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 * @returns {Promise<void>}
 */
const updateTeamPost = async (req, res) => {
    try {
        const {
            post_id,
            user_id,
            itinerary,
            image_urls
        } = req.body;
        if (!post_id || !user_id) {
            return res.status(400).json({ code: 400, msg: '缺少必要字段' });
        }

        // 检查帖子是否存在及权限
        const { result: postResult } = await query(`SELECT * FROM ${TEAM_ACTIVITY_POSTS} WHERE post_id = ? AND user_id = ?`, [post_id, user_id]);
        if (!postResult.length) {
            return res.status(400).json({ code: 400, msg: '帖子不存在或无权限' });
        }

        // 准备更新字段和值
        const updateFields = [];
        const values = [];

        const updateMap = {
            title: 'title = ?',
            description: 'description = ?',
            start_location: 'start_location = ?',
            end_location: 'end_location = ?',
            duration_day: 'duration_day = ?',
            team_size: 'team_size = ?',
            estimated_expense: 'estimated_expense = ?',
            gender_requirement: 'gender_requirement = ?',
            payment_method: 'payment_method = ?',
            theme_id: 'theme_id = ?'
        };

        Object.entries(updateMap).forEach(([key, value]) => {
            if (req.body[key]) {
                updateFields.push(value);
                values.push(req.body[key]);
            }
        });

        if (!updateFields.length) {
            return res.status(400).json({ code: 400, msg: '未提供要更新的字段' });
        }

        // 构建更新语句
        const tableName = TEAM_ACTIVITY_POSTS;
        // 将status字段更新为2 待审核
        updateFields.push('status = ?');
        values.push(2);

        const sql = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE post_id = ?`;
        values.push(post_id);

        // 执行更新
        await query(sql, values);


        // 删除之前所有帖子相关的的所有图片，以之后更新的数据为准
        // 更新图片和行程
        if (image_urls && image_urls.length) {
            // await deleteImagesByDataId(TEAM_ACTIVITY_IMAGES, post_id, 'post_id');
            await associateImagesWithData(TEAM_ACTIVITY_IMAGES, post_id, image_urls, ['post_id', 'image_url']);
        }
        if (itinerary) {
            // await deleteImagesByDataId(ITINERARIES, post_id, 'post_id');
            await associateImagesWithData(ITINERARIES, post_id, [itinerary], ['post_id', 'image_url']);
        }

        res.status(200).json({ code: 200, msg: '更新组队帖子成功' });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }

};

/**
 * 获取用户信息
 * @param {*} user_id 
 * @returns 
 */
async function getUserInfo(user_id) {
    const USERS = 'users';
    // 获取用户信息
    const sql = `SELECT * FROM ${USERS} WHERE user_id = ?`;
    const { result: userResult } = await query(sql, [user_id]);

    return userResult[0];
}

/**
 * // 查询动态
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function getDynamicPost(req, res) {
    const { dynamic_post_id } = req.params;


    try {
        // 查询动态帖子信息 status =1 审核通过的
        const postQuery = `SELECT dp.content, dp.user_id, dp.created_at,
                                u.nickname, u.avatar_url
                           FROM ${DYNAMIC_POSTS} dp
                                LEFT JOIN ${USERS} u ON dp.user_id = u.user_id
                          WHERE dp.dynamic_post_id = ? AND (dp.status = 1 or dp.status = 2 or dp.status = 0)`;

        const { result: postRows } = await query(postQuery, [dynamic_post_id]);
        if (!postRows.length) {
            return res.status(404).json({ code: 404, msg: '帖子不存在' });
        }

        const post = postRows[0];
        const { content, user_id, created_at, nickname, avatar_url } = post;

        // 查询帖子图片信息
        const imageQuery = `SELECT image_id, image_url
                                FROM ${DYNAMIC_POST_IMAGES}
                              WHERE dynamic_post_id = ?`;

        const { result: imageRows } = await query(imageQuery, [dynamic_post_id]);
        const images = imageRows.map(image => ({
            image_id: image.image_id,
            image_url: image.image_url
        }));

        // 查询评论
        const commentQuery = `SELECT dpc.comment_id, dpc.user_id, dpc.content, dpc.created_at,
                                    u.nickname, u.avatar_url
                               FROM ${DYNAMIC_POST_COMMENTS} dpc
                                    LEFT JOIN ${USERS} u ON dpc.user_id = u.user_id
                              WHERE dpc.dynamic_post_id = ?`;

        const { result: commentRows } = await query(commentQuery, [dynamic_post_id]);
        let comments = [];
        if (commentRows.length > 0) {
            comments = await Promise.all(commentRows.map(async (comment) => {
                const { nickname, avatar_url } = await getUserInfo(comment.user_id);
                return {
                    comment_id: comment.comment_id,
                    user_info: {
                        user_id: comment.user_id,
                        nickname,
                        avatar_url
                    },
                    content: comment.content,
                    created_at: comment.created_at
                };
            }));
        }

        // 查询点赞用户
        const likeQuery = `SELECT user_id FROM ${DYNAMIC_POST_LIKES} WHERE dynamic_post_id = ?`;
        const { result: likeRows } = await query(likeQuery, [dynamic_post_id]);
        const like_userIds = likeRows.map(row => row.user_id);

        res.status(200).json({
            code: 200, msg: '查询帖子成功', data: {

                user_id,
                dynamic_post_id,
                content,
                images,
                created_at,
                user_info: { user_id, nickname, avatar_url },
                comments,
                like_userIds

            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '查询失败' + error.message });
        throw error;
    }
}




/**
 * 查组队帖子
 * @param {*} req 
 * @param {*} res 
 */
const getTeamPost = async (req, res) => {
    const { post_id } = req.params;

    try {
        if (!post_id) {
            return res.status(400).json({ code: 400, msg: '参数错误' });
        }


        // 查询帖子信息
        const postQuery = `SELECT * FROM ${TEAM_ACTIVITY_POSTS} WHERE post_id = ? AND  (status = 1 or status = 2 or status = 0)`;
        const { result: postResult } = await query(postQuery, [post_id]);
        const post = postResult[0];

        if (!post) {
            return res.status(400).json({ code: 400, msg: '帖子不存在' });
        }

        // 获取用户信息
        const { user_id, created_at } = post;
        const { nickname, avatar_url } = await getUserInfo(user_id);

        // 获取帖子图片
        const imagesQuery = `SELECT image_id, image_url FROM ${TEAM_ACTIVITY_IMAGES} WHERE post_id = ?`;
        const { result: imagesResult } = await query(imagesQuery, [post_id]);
        const images = imagesResult.map(image => ({
            image_id: image.image_id,
            image_url: image.image_url
        }));

        // 获取行程图片
        const itineraryQuery = `SELECT image_url FROM ${ITINERARIES} WHERE post_id = ?`;
        const { result: itineraryResult } = await query(itineraryQuery, [post_id]);
        const itinerary = itineraryResult.length > 0 ? itineraryResult[0].image_url : '';

        // 获取帖子评论
        const commentsQuery = `SELECT * FROM ${TEAM_ACTIVITY_POST_COMMENTS} WHERE post_id = ?`;
        const { result: commentResult } = await query(commentsQuery, [post_id]);
        let comments = [];
        if (commentResult.length > 0) {
            comments = await Promise.all(commentResult.map(async (comment) => {
                const { nickname, avatar_url } = await getUserInfo(comment.user_id);
                return {
                    comment_id: comment.comment_id,
                    user_info: {
                        user_id: comment.user_id,
                        nickname,
                        avatar_url
                    },
                    content: comment.content,
                    created_at: comment.created_at
                };
            }));
        }


        // 获取帖子点赞
        const likesQuery = `SELECT user_id FROM ${TEAM_ACTIVITY_POST_LIKES} WHERE post_id = ?`;
        const { result: likeResult } = await query(likesQuery, [post_id]);
        const like_userIds = likeResult.map(row => row.user_id);

        res.status(200).json({
            code: 200, msg: '查询帖子成功', data: {

                ...post,
                user_info: { user_id, nickname, avatar_url },
                images,
                itinerary,
                created_at,
                like_userIds,
                comments

            }
        });
    } catch (error) {
        console.error('查询失败:', error);
        res.status(500).json({ code: 500, msg: '查询失败' });
    }
}




/**
 * 查询动态帖子列表（分页）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.body.page 当前页码，默认为1
 * @param {number} req.body.limit 每页条目数，默认为10
 * @param {number} req.body.user_id 当前用户的 ID 
 * @param {boolean} req.body.follow 是否查询关注用户的帖子
 */
const getDynamicPostsForPage = async (req, res) => {
    const { page = 1, limit = 10, user_id, follow } = req.body;

    if (!user_id) {
        return res.status(400).json({ code: 400, msg: '用户ID不能为空' });
    }

    try {
        let sql = `SELECT dp.*, u.nickname, u.avatar_url`;

        if (follow) {
            sql += `, CASE WHEN EXISTS (
                        SELECT * FROM ${USER_FOLLOWS} WHERE following_id = dp.user_id AND follower_id = ?
                    ) THEN 1 ELSE 0 END as isFollowed`;
        }

        sql += ` FROM ${DYNAMIC_POSTS} dp LEFT JOIN ${USERS} u ON dp.user_id = u.user_id WHERE  dp.status = 1 `;



        // 如果用户传入了用户ID且设置了 follow 为 true，则查询该用户关注的用户的动态，否则查询所有用户的动态
        if (follow) {
            // 查询用户关注的用户 ID 列表
            const followUserIdsQuery = `SELECT following_id FROM ${USER_FOLLOWS} WHERE follower_id = ?`;
            const { result: followUserIdsResult } = await query(followUserIdsQuery, [user_id]);
            const followUserIds = followUserIdsResult.map(item => item.following_id);
            if (followUserIds.length === 0) {
                res.status(200).json({
                    code: 200,
                    msg: '没有关注的用户帖子',
                    data: {
                        list: [],

                        pageSize: limit,
                        totalCount: 0,
                        totalPages: 0,
                        currentPage: parseInt(page)

                    }
                });
                return
            }
            sql += `AND dp.user_id IN (${followUserIds.join(',')})`;
        }

        sql += ` ORDER BY dp.created_at DESC LIMIT ? OFFSET ?`;

        const offset = (page - 1) * limit;
        const params = [parseInt(limit), offset];

        if (follow) {
            params.unshift(user_id);
        }

        const { result: postsResult } = await query(sql, params);

        const data = await Promise.all(postsResult.map(async post => {
            // 查关联图片
            const { result: imagesResult } = await query(`SELECT * FROM ${DYNAMIC_POST_IMAGES} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);
            // 查点赞人数
            const { result: likesResult } = await query(`SELECT COUNT(*) as total FROM ${DYNAMIC_POST_LIKES} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);
            // 查询评论人数
            const { result: commentsResult } = await query(`SELECT COUNT(*) as total FROM ${DYNAMIC_POST_COMMENTS} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);

            // 查询用户是否点赞了该动态
            const { result: isLikedResult } = await query(`SELECT * FROM ${DYNAMIC_POST_LIKES} WHERE user_id = ? AND dynamic_post_id = ?`, [user_id, post.dynamic_post_id]);
            // 查询用户是否关注了帖子发布用户
            const { result: isFollowedResult } = await query(`SELECT * FROM ${USER_FOLLOWS} WHERE follower_id = ? AND following_id = ?`, [user_id, post.user_id]);
            const commentCount = commentsResult[0].total || 0;
            const likeCount = likesResult[0].total || 0;
            const isLiked = isLikedResult.length > 0;
            const isFollowed = isFollowedResult.length > 0;
            const images = imagesResult.map(e => {
                return {
                    image_id: e.image_id,
                    image_url: e.image_url
                }
            });

            return {
                dynamic_post_id: post.dynamic_post_id,
                content: post.content,
                user_info: {
                    user_id: post.user_id,
                    nickname: post.nickname,
                    avatar_url: post.avatar_url,
                },
                isFollowed: isFollowed,
                isLiked,
                created_at: post.created_at,
                images: images,
                like_count: likeCount,
                comment_count: commentCount,
            }
        }));

        // 查询帖子总数 状态要为1
        let totalPostsQuery = `SELECT COUNT(*) as total FROM ${DYNAMIC_POSTS} WHERE status = 1`;
       
        if (follow) {
            totalPostsQuery += ` AND user_id IN (SELECT following_id FROM ${USER_FOLLOWS} WHERE follower_id = ?)`;

        }
        const { result: totalPostsResult } = await query(totalPostsQuery, follow ? [user_id] : []);
        const totalPosts = totalPostsResult[0].total;

        res.status(200).json({
            code: 200,
            msg: '查询动态帖子列表成功',
            data: {
                list: data,

                pageSize: limit,
                totalCount: totalPosts,
                totalPages: Math.ceil(totalPosts / limit),
                currentPage: parseInt(page)

            }
        });
    } catch (error) {
        console.error('查询动态帖子列表失败:', error);
        res.status(500).json({ code: 500, msg: '查询动态帖子列表失败' + error.message });
    }
}




/**
 * 查询组队帖子列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.query.page 当前页码，默认为1
 * @param {number} req.query.limit 每页条目数，默认为10
 * @param {number} req.query.theme_id 主题 ID，用于分类查询（可选）
 */
const getTeamPostsForPage = async (req, res) => {
    const { page = 1, limit = 10, theme_id } = req.body;

    try {
        let sql = `SELECT * FROM ${TEAM_ACTIVITY_POSTS} WHERE  status = 1 `;

        // 如果指定了主题 ID，则添加条件
        if (theme_id) {
            sql += ` AND theme_id = ?`;
        }

        // 添加分页逻辑
        const offset = (page - 1) * limit;
        sql += ` LIMIT ?, ?`;

        const params = theme_id ? [theme_id, offset, parseInt(limit)] : [offset, parseInt(limit)];
        const { result: postsResult } = await query(sql, params);

        // 查询帖子总数
        let totalPostsQuery = `SELECT COUNT(*) as total FROM ${TEAM_ACTIVITY_POSTS} WHERE  status = 1 `;
        let totalPostsParams = [];
        if (theme_id) {
            totalPostsQuery += ` AND theme_id = ?`;
            totalPostsParams = [theme_id];
        }
        const { result: totalPostsResult } = await query(totalPostsQuery, totalPostsParams);
        const totalPosts = totalPostsResult[0].total;



        const newpost = await Promise.all(postsResult.map(async (post) => {
            const { post_id, user_id } = post;
            // 获取用户信息
            const { nickname, avatar_url } = await getUserInfo(user_id);

            // 获取帖子图片
            const imagesQuery = `SELECT image_id, image_url FROM ${TEAM_ACTIVITY_IMAGES} WHERE post_id = ?`;
            const { result: imagesResult } = await query(imagesQuery, [post_id]);
            const images = imagesResult.map(image => ({
                image_id: image.image_id,
                image_url: image.image_url
            }));


            return {
                ...post,
                user_info: { user_id, nickname, avatar_url },
                images,


            }

        }))


        res.status(200).json({
            code: 200,
            msg: '查询组队帖子列表成功',
            data: {
                list: newpost,
                pageSize: limit,
                totalCount: totalPosts,
                totalPages: Math.ceil(totalPosts / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error('查询组队帖子列表失败:', error);
        res.status(500).json({ code: 500, msg: '查询组队帖子列表失败' + error.message });
    }
}


const getRecommendPosts = async (req, res) => {
    // 推荐表中获取全部数据

    try {
        const sql = `SELECT type,post_id FROM ${RECOMMENDATIONS}  `;
        const { result: postsResult } = await query(sql);
        const data = await Promise.all(postsResult.map(async post => {
            const { post_id, type } = post;
            let images = [];
            if (type == 'team') {
                // 查询图片
                const { result: imagesResult } = await query(`SELECT image_id, image_url FROM ${TEAM_ACTIVITY_IMAGES} WHERE post_id = ?`, [post_id]);
                images = imagesResult.map(e => {
                    return {
                        image_id: e.image_id,
                        image_url: e.image_url
                    }
                })
            } else {
                // 查询图片
                const { result: imagesResult } = await query(`SELECT image_id, image_url FROM ${DYNAMIC_POST_IMAGES} WHERE dynamic_post_id = ?`, [post_id]);
                images = imagesResult.map(e => {
                    return {
                        image_id: e.image_id,
                        image_url: e.image_url
                    }
                })
            }

            return {
                post_id,
                type,
                images,
            }
        }))
        res.status(200).json({
            code: 200,
            msg: '查询推荐帖子列表成功',
            data: data
        })
    } catch (error) {
        console.error('查询推荐帖子列表失败:', error);
        res.status(500).json({ code: 500, msg: '查询推荐帖子列表失败' + error.message });
    }
}

// 删除帖子

const deleteDynamicPost = async (req, res) => {
    const { dynamic_post_id } = req.body;
    if (!dynamic_post_id) {
        res.status(400).json({
            code: 400,
            msg: '参数错误'
        })
    }
    const { user_id } = req.user;
    try {
        // 删除表中的动态帖子
        const deleteDynamicPostSql = `DELETE FROM ${DYNAMIC_POSTS} WHERE dynamic_post_id = ? AND user_id = ?`;
        const { result: deleteDynamicPostResult } = await query(deleteDynamicPostSql, [dynamic_post_id, user_id]);
        if (deleteDynamicPostResult.affectedRows > 0) {

            res.status(200).json({
                code: 200,
                msg: '删除动态帖子成功'
            })
        }
    } catch (error) {
        console.error('删除动态帖子失败:', error);
        res.status(500).json({
            code: 500,
            msg: '删除帖子失败'
        })
    }
}

const deleteTeamPost = async (req, res) => {
    const { post_id } = req.body;
    if (!post_id) {
        res.status(400).json({
            code: 400,
            msg: '参数错误'
        })
    }
    const { user_id } = req.user;
    try {
        // 删除表中的动态帖子
        const deleteTeamPostSql = `DELETE FROM ${TEAM_ACTIVITY_POSTS} WHERE post_id = ? AND user_id = ?`;
        const { result: deleteTeamPostResult } = await query(deleteTeamPostSql, [post_id, user_id]);
        if (deleteTeamPostResult.affectedRows > 0) {

            res.status(200).json({
                code: 200,
                msg: '删除动态帖子成功'
            })
        }
    } catch (error) {
        console.error('删除动态帖子失败:', error);
        res.status(500).json({
            code: 500,
            msg: '删除帖子失败'

        }
        )
    }
}


/**
 * 获取已加入组队的用户列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {number} req.params.post_id 组队帖子 ID
 */
const getTeamMembers = async (req, res) => {
    const { post_id } = req.params;

    try {
        // 检验是否存在
        const isExist = await isExistINTable(TEAM_ACTIVITY_POSTS, { post_id: post_id })

        if (!isExist) {
            return res.status(400).json({ code: 400, msg: '帖子不存在' });
        }

        // 查询已加入小队的用户列表
        const sql = `
            SELECT u.user_id, u.nickname, u.avatar_url, p.joined_at
            FROM ${USERS} u
            INNER JOIN ${TEAM_ACTIVITY_PARTICIPANTS} p ON u.user_id = p.user_id
            WHERE p.post_id = ?
        `;
        const { result: teamMembers } = await query(sql, [post_id]);

        res.status(200).json({ code: 200, msg: '获取小队成员列表成功', data: teamMembers });
    } catch (error) {
        console.error('获取小队成员列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取小队成员列表失败' });
    }
}

module.exports = {
    publishDynamicPost, updateDynamicPost, deleteDynamicPost, getDynamicPost, getDynamicPostsForPage,
    publishTeamPost, updateTeamPost, deleteTeamPost, getTeamPost, getTeamPostsForPage,
    getTeamMembers, getRecommendPosts
}