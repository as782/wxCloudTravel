const { query } = require("../../../db");
const { TEAM_ACTIVITY_IMAGES, TEAM_ACTIVITY_POST_COMMENTS, TEAM_ACTIVITY_POST_LIKES, TEAM_ACTIVITY_PARTICIPANTS, ITINERARIES, DYNAMIC_POSTS, DYNAMIC_POST_IMAGES, DYNAMIC_POST_COMMENTS, TEAM_ACTIVITY_POSTS, APPROVAL_RECORDS, TEAM_ACTIVITY_THEMES, RECOMMENDATIONS, ADMINS } = require("../../../db/config");
const { queryWithConditionsAndPaging } = require("../common");
/**
 * 获取帖子相关信息
 * @param {array} posts - 帖子列表
 * @param {string} postIdKey - 帖子ID字段名 post_id,dynamic_post_id
 * @param {array} joinTables - 联表查询的表名列表 {imageTable, commentTable, likeTable, joinTable, itineraryTable}
 * @returns {Promise} 如果查询成功则解析，如果发生错误则拒绝的 Promise。
 */
function getPostRelativeInfo(posts, postIdKey, joinTables) {
    const { imageTable, commentTable, likeTable, joinTable, itineraryTable } = joinTables;
    return Promise.all(posts.map(async (post) => {
        const { [postIdKey]: postId } = post;

        // 获取帖子图片
        const imagesQuery = `SELECT image_id, image_url FROM ${imageTable} WHERE ${postIdKey} = ?`;
        const { result: imagesResult } = await query(imagesQuery, [postId]);
        const images = imagesResult.map(image => image.image_url);

        // 只有传入的表名列表不为空时，才进行联表查询
        let itineraryImages = [];
        if (itineraryTable) {
            // 获取行程图片 （组队帖才有）
            const itineraryImagesQuery = `SELECT itinerary_id, image_url FROM ${itineraryTable} WHERE ${postIdKey} = ?`;
            const { result: itineraryImagesResult } = await query(itineraryImagesQuery, [postId]);
            itineraryImages = itineraryImagesResult.map(image => image.image_url);
        }

        // 获取评论数
        const commentsCountQuery = `SELECT COUNT(*) AS comment_count FROM ${commentTable} WHERE ${postIdKey} = ?`;

        const { result: commentsCountResult } = await query(commentsCountQuery, [postId]);
        const commentCount = commentsCountResult[0].comment_count;

        // 获取点赞数
        const likesCountQuery = `SELECT COUNT(*) AS like_count FROM ${likeTable} WHERE ${postIdKey} = ?`;
        const { result: likesCountResult } = await query(likesCountQuery, [postId]);
        const likeCount = likesCountResult[0].like_count;

        // 获取加入数
        let joinCount = 0;
        if (joinTable) {
            const joinCountQuery = `SELECT COUNT(*) AS join_count FROM ${joinTable} WHERE  post_id = ?`;
            const { result: joinCountResult } = await query(joinCountQuery, [postId]);
            joinCount = joinCountResult[0].join_count;
        }

        return {
            ...post,
            images,
            comment_count: commentCount,
            like_count: likeCount,
            join_count: joinCount >= 0 ? joinCount : undefined,
            itinerary_images: itineraryImages.length === 0 ? undefined : itineraryImages[0]
        };
    }));
}
/** 
 * 获取组队活动帖子列表
 */
const getTeamActivityPostList = async (req, res) => {
    try {
        let page = req.body.page || 1;
        let limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        // 其他查询条件参数
        const post_id = req.body.post_id || undefined;
        const userId = req.body.user_id || undefined;
        const title = req.body.title || undefined;
        const status = req.body.status || undefined;
        const theme_id = req.body.theme_id || undefined;
        const start_location = req.body.start_location || undefined;
        const end_location = req.body.end_location || undefined;
        const gender_requirement = req.body.gender_requirement || undefined;
        const conditions = {
            user_id: userId,
            title: title,
            status: status,
            theme_id: theme_id,
            start_location: start_location,
            end_location: end_location,
            gender_requirement: gender_requirement,
            post_id: post_id
        };

        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging('team_activity_posts', conditions, paging);


        // // 组队帖会用到的
        // TEAM_ACTIVITY_POSTS
        // TEAM_ACTIVITY_IMAGES
        // ITINERARIES
        // TEAM_ACTIVITY_POST_COMMENTS
        // TEAM_ACTIVITY_POST_LIKES
        // TEAM_ACTIVITY_PARTICIPANTS


        const newpost = await getPostRelativeInfo(data, 'post_id', {
            imageTable: TEAM_ACTIVITY_IMAGES,
            commentTable: TEAM_ACTIVITY_POST_COMMENTS,
            likeTable: TEAM_ACTIVITY_POST_LIKES,
            joinTable: TEAM_ACTIVITY_PARTICIPANTS,
            itineraryTable: ITINERARIES
        })

        res.status(200).json({
            code: 200,
            msg: '获取组队活动帖子列表成功',
            data: {
                list: newpost,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取组队活动帖子列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取组队活动帖子列表失败' });
    }
};

/** 获取动态列表 */
const getDynamicPostList = async (req, res) => {
    try {
        let page = req.body.page || 1;
        let limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        // 其他查询条件参数
        const post_id = req.body.dynamic_post_id || undefined;
        const userId = req.body.user_id || undefined;
        const status = req.body.status || undefined;

        const conditions = {
            user_id: userId,
            status: status,
            dynamic_post_id: post_id
        };
        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(DYNAMIC_POSTS, conditions, paging);

        // //   动态帖会用到的表
        // DYNAMIC_POST_LIKES
        // DYNAMIC_POST_COMMENTS
        // DYNAMIC_POST_IMAGES
        const newpost = await getPostRelativeInfo(data, 'dynamic_post_id', {
            imageTable: DYNAMIC_POST_IMAGES,
            commentTable: DYNAMIC_POST_COMMENTS,
            likeTable: DYNAMIC_POST_IMAGES,

        })

        res.status(200).json({
            code: 200,
            msg: '获取动态列表成功',
            data: {
                list: newpost,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    }

    catch (error) {
        console.error('获取动态帖子列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取动态帖子列表失败' });
    }
}

/** 审核 、 不通过、下架 **/
// 通过修改status 0 未通过 ，1 通过 ， 2 下架审核中
// 都是可以批量和单个处理 ， 动态 和组队都有status 只不过表不同 id key 不同 post_id /dynamic_post_id
// 需要一个通用的函数处理，然后完成 组队帖的审核 、 不通过、下架， 和动态的审核 、 不通过、下架

/**
 * 批量处理帖子状态
 * @param {string} tableName - 帖子表名
 * @param {string} idKey - 帖子ID字段名 post_id /dynamic_post_id
 * @param {array} ids - 要处理的帖子ID列表
 * @param {number} status - 要设置的状态值 0 未通过 ，1 通过 ， 2 下架审核中
 * @param {number} adminId - 管理员ID
 * @returns {Promise} 如果操作成功则解析，如果发生错误则拒绝的 Promise。
 */
async function batchProcessPostsStatus(tableName, idKey, ids, status, adminId) {
    try {
        const sql = `UPDATE ${tableName} SET status = ? WHERE ${idKey} IN (?)`;
        const values = [status, ids];
        await query(sql, values);

        // 记录审核操作到 approval_records 表中
        const approvalRecordsSql = `INSERT INTO ${APPROVAL_RECORDS} (post_id, admin_id, type, status) VALUES ?`;
        const approvalRecordsValues = ids.map(id => [id, adminId, tableName === TEAM_ACTIVITY_POSTS ? 'team' : 'moment', status]);
        await query(approvalRecordsSql, [approvalRecordsValues]);

        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// 审核通过
const passTeamActivityPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(TEAM_ACTIVITY_POSTS, 'post_id', ids, 1, adminId);
        res.status(200).json({ code: 200, msg: '组队帖审核通过成功' });
    } catch (error) {
        console.error('组队帖审核通过失败:', error);
        res.status(500).json({ code: 500, msg: '组队帖审核通过失败' });
    }
};

// 动态帖审核通过
const passDynamicPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(DYNAMIC_POSTS, 'dynamic_post_id', ids, 1, adminId);
        res.status(200).json({ code: 200, msg: '动态帖审核通过成功' });
    } catch (error) {
        console.error('动态帖审核通过失败:', error);
        res.status(500).json({ code: 500, msg: '动态帖审核通过失败' });
    }
};

// 组队帖审核不通过
const unpassTeamActivityPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(TEAM_ACTIVITY_POSTS, 'post_id', ids, 0, adminId);
        res.status(200).json({ code: 200, msg: '组队帖审核不通过成功' });
    } catch (error) {
        console.error('组队帖审核不通过失败:', error);
        res.status(500).json({ code: 500, msg: '组队帖审核不通过失败' });
    }
};

// 动态帖审核不通过
const unpassDynamicPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(DYNAMIC_POSTS, 'dynamic_post_id', ids, 0, adminId);
        res.status(200).json({ code: 200, msg: '动态帖审核不通过成功' });
    } catch (error) {
        console.error('动态帖审核不通过失败:', error);
        res.status(500).json({ code: 500, msg: '动态帖审核不通过失败' });
    }
};

// 组队帖下架
const offlineTeamActivityPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(TEAM_ACTIVITY_POSTS, 'post_id', ids, 2, adminId);
        res.status(200).json({ code: 200, msg: '组队帖下架成功' });
    } catch (error) {
        console.error('组队帖下架失败:', error);
        res.status(500).json({ code: 500, msg: '组队帖下架失败' });
    }
};

// 动态帖下架
const offlineDynamicPost = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user.admin_id; // 假设管理员ID从请求中获取，根据实际情况修改
        await batchProcessPostsStatus(DYNAMIC_POSTS, 'dynamic_post_id', ids, 2, adminId);
        res.status(200).json({ code: 200, msg: '动态帖下架成功' });
    } catch (error) {
        console.error('动态帖下架失败:', error);
        res.status(500).json({ code: 500, msg: '动态帖下架失败' });
    }
};

//----------------------------------------------------------------------------------

/**
 * 批量删除帖子
 * 
 * @param {string} tableName - 要删除的表名
 * @param {string} idKey - 帖子ID的字段名
 * @param {array} ids - 要删除的帖子ID数组
 * @returns {Promise} 如果删除成功则解析，如果发生错误则拒绝的 Promise。
 */
const batchDeletePosts = async (tableName, idKey, ids) => {
    try {
        const sql = `DELETE FROM ${tableName} WHERE ${idKey} IN (?)`;
        const values = [ids];
        await query(sql, values);
    } catch (error) {
        throw new Error(`Error deleting posts: ${error.message}`);
    }
};

//删除帖子  批量支持
const deleteTeamActivityPost = async (req, res) => {
    try {
        const { ids } = req.body;
        await batchDeletePosts(TEAM_ACTIVITY_POSTS, 'post_id', ids);
        res.status(200).json({ code: 200, msg: '组队帖删除成功' });
    } catch (error) {
        console.error('组队帖删除失败:', error);
        res.status(500).json({ code: 500, msg: '组队帖删除失败' });
    }
};
// 删除动态帖子 批量支持
const deleteDynamicPost = async (req, res) => {
    try {
        const { ids } = req.body;
        await batchDeletePosts(DYNAMIC_POSTS, 'dynamic_post_id', ids);
        res.status(200).json({ code: 200, msg: '动态帖删除成功' });
    } catch (error) {
        console.error('动态帖删除失败:', error);
        res.status(500).json({ code: 500, msg: '动态帖删除失败' });
    }
};

// -----------------------------------------------------------------------------------------



/**
 * 添加帖子到推荐表
 * 
 * @param {number} postId - 帖子ID
 * @param {string} type - 帖子类型，'moment' 或 'team'
 * @param {number} userId - 用户ID
 * @returns {Promise} 如果添加成功则解析，如果发生错误则拒绝的 Promise。
 */
const addToRecommend = async (postId, type, userId, ...rgs) => {

    const insetFiled = {
        post_id: postId,
        type: type,
        user_id: userId,
        status: 1,
        comment_count: rgs[0],
        like_count: rgs[1],
        join_count: rgs[2]
    }

    try {
        const sql = `INSERT INTO ${RECOMMENDATIONS} SET ?`;
        const values = [insetFiled];
        await query(sql, values);

    } catch (error) {
        throw new Error(`Error adding post to recommend: ${error.message}`);
    }
};

/**
 * 从推荐表移除帖子
 * 
 * @param {Array} items - 包含帖子ID和类型的对象数组
 * @returns {Promise} 如果移除成功则解析，如果发生错误则拒绝的 Promise。
 */
const removeFromRecommend = async (items) => {
    try {
        const sql = `DELETE FROM ${RECOMMENDATIONS} WHERE id = ? AND type = ?`;

        const promise = Promise.all(items.map(async item => {
            const { id, type } = item;
            const values = [id, type];

            await query(sql, values);
        }))
        return promise;
    } catch (error) {
        throw new Error(`Error removing post from recommend: ${error.message}`);
    }
};

// 获取推荐列表
const getRecommendList = async (req, res) => {
    try {
        const { page, limit } = req.body;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            id: req.body.id,
            post_id: req.body.post_id,
            type: req.body.type,
        }
        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(RECOMMENDATIONS, conditionKeys, paging);

        res.status(200).json({
            code: 200, msg: '获取推荐列表成功', data: {

                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        })
    }
    catch (error) {
        console.error('获取推荐列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取推荐列表失败' });
    }
}


// 从推荐表移除 批量 body { id: number; type: 'moment' | 'team' }[]
const removeFromRecommendTable = async (req, res) => {
    try {
        const items = req.body;
        await removeFromRecommend(items);
        res.status(200).json({ code: 200, msg: 'Removed from recommendation table successfully' });
    } catch (error) {
        console.error('Error removing from recommendation table:', error);
        res.status(500).json({ code: 500, msg: 'Failed to remove from recommendation table' });
    }
};
// 添加到推荐表 批量 body { id: number; type: 'moment' | 'team' }
const addToRecommendTable = async (req, res) => {
    try {
        const item = req.body;

        const { id, type } = item;

        // 查 帖子中的用户user_id
        if (type == 'moment') {
            // 查询帖子是否已经推荐
            const sql = `SELECT * FROM ${RECOMMENDATIONS} WHERE post_id = ? AND type = ?`;
            const values = [id, type];
            const { result: result1 } = await query(sql, values);
            if (result1.length > 0) {

                res.status(400).json({ code: 400, msg: 'Post is already in the recommendation table' });
                return
            }
            const sql2 = `SELECT user_id FROM ${DYNAMIC_POSTS} WHERE dynamic_post_id = ?`;
            const values2 = [id];
            const { result: result2 } = await query(sql2, values2);
            const userId = result2[0].user_id;

            const results = await getPostRelativeInfo([{ post_id: id }], 'dynamic_post_id', {
                imageTable: DYNAMIC_POST_IMAGES,
                commentTable: DYNAMIC_POST_COMMENTS,
                likeTable: DYNAMIC_POST_IMAGES,

            })

            await addToRecommend(id, type, userId, results[0].comment_count, results[0].like_count);
        } else {
            // 查询帖子是否已经推荐
            const sql = `SELECT * FROM ${RECOMMENDATIONS} WHERE post_id = ? AND type = ?`;
            const values = [id, type];
            const { result } = await query(sql, values);
            if (result.length > 0) {

                res.status(400).json({ code: 400, msg: 'Post is already in the recommendation table' });
                return
            }

            const sql2 = `SELECT user_id FROM ${TEAM_ACTIVITY_POSTS} WHERE post_id = ?`;
            const values2 = [id];
            const { result: result2 } = await query(sql2, values2);
            const userId = result2[0].user_id;
            const results = await getPostRelativeInfo([{ post_id: id }], 'post_id', {
                imageTable: TEAM_ACTIVITY_IMAGES,
                commentTable: TEAM_ACTIVITY_POST_COMMENTS,
                likeTable: TEAM_ACTIVITY_POST_LIKES,
                joinTable: TEAM_ACTIVITY_PARTICIPANTS,
                itineraryTable: ITINERARIES
            })
            console.log(results);
            await addToRecommend(id, type, userId, results[0].comment_count,
                results[0].like_count,
                results[0].join_count);
        }


        res.status(200).json({ code: 200, msg: 'Added to recommendation table successfully' });
    } catch (error) {
        console.error('Error adding to recommendation table:', error);
        res.status(500).json({ code: 500, msg: 'Failed to add to recommendation table' });
    }
};

// -----------------------------------------------------------------------------

// 获取审批记录
const getApprovalRecord = async (req, res) => {
    try {
        const { page, limit } = req.body;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            post_id: req.body.post_id,
            type: req.body.type,
            status: req.body.status,
            admin_id: req.body.admin_id,
            id: req.body.id,
        }

        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(APPROVAL_RECORDS, conditionKeys, paging);
        res.status(200).json({
            code: 200, msg: '获取审批记录成功', data: {
                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }

        })
    } catch (error) {
        console.error('获取审批记录失败:', error);
        res.status(500).json({ code: 500, msg: '获取审批记录失败' });
    }
}
// 删除记录
const deleteApprovalRecord = async (req, res) => {
    try {
        const { ids } = req.body;
        // 获取当前用户权限
        const { admin_id } = req.user
        // 查询管理员表获取role
        const s = `SELECT role FROM ${ADMINS} WHERE admin_id = ?`;
        const v = [admin_id];
        const { result } = await query(s, v);
        const role = result[0].role;
        if (role !== 'superAdmin') {
            res.status(404).json({ code: 404, msg: '无权限删除审批记录' });
            return
        }

        const sql = `DELETE FROM ${APPROVAL_RECORDS} WHERE id IN (?)`;
        const values = [ids];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '删除审批记录成功' });

    } catch (error) {
        console.error('删除审批记录失败:', error);
        res.status(500).json({ code: 500, msg: '删除审批记录失败' });
    }
}


// -----------------------------------------------------------------------------

//  主题

/** 获取主题列表 */
const getThemeList = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            theme_id: req.body.theme_id,
            theme_name: req.body.theme_name,
        };
        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(TEAM_ACTIVITY_THEMES, conditionKeys, paging);
        res.status(200).json({
            code: 200, msg: '获取主题列表成功', data: {
                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取主题列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取主题列表失败' });
    }
};

/** 添加主题 */
const addTheme = async (req, res) => {
    try {
        const { name } = req.body;
        const sql = `INSERT INTO ${TEAM_ACTIVITY_THEMES} (theme_name) VALUES (?)`;
        const values = [name];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '主题添加成功' });
    } catch (error) {
        console.error('添加主题失败:', error);
        res.status(500).json({ code: 500, msg: '主题添加失败' });
    }
};

/** 删除主题 */
const deleteTheme = async (req, res) => {
    try {
        const { ids } = req.body;
        const themeIds = ids
        const sql = `DELETE FROM ${TEAM_ACTIVITY_THEMES} WHERE theme_id IN (?)`;
        const values = [themeIds];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '主题删除成功' });
    } catch (error) {
        console.error('删除主题失败:', error);
        res.status(500).json({ code: 500, msg: '主题删除失败' });
    }
};

/** 修改主题信息 */
const updateTheme = async (req, res) => {
    try {
        const { theme_id, theme_name } = req.body;
        const sql = `UPDATE ${TEAM_ACTIVITY_THEMES} SET theme_name = ? WHERE theme_id = ?`;
        const values = [theme_name, theme_id];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '主题信息修改成功' });
    } catch (error) {
        console.error('修改主题信息失败:', error);
        res.status(500).json({ code: 500, msg: '主题信息修改失败' });
    }
};




module.exports = {
    getTeamActivityPostList,
    getDynamicPostList,
    passTeamActivityPost,
    passDynamicPost,
    unpassTeamActivityPost,
    unpassDynamicPost,
    offlineTeamActivityPost,
    offlineDynamicPost,
    deleteTeamActivityPost,
    deleteDynamicPost,
    getRecommendList,
    removeFromRecommendTable,
    addToRecommendTable,
    getThemeList,
    addTheme,
    deleteTheme,
    updateTheme,
    getApprovalRecord,
    deleteApprovalRecord

}