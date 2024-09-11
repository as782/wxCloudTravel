const { query } = require('../../db/index');
const {
    USERS,
    DYNAMIC_POSTS,
    TEAM_ACTIVITY_POSTS,
    DYNAMIC_POST_IMAGES,
    DYNAMIC_POST_LIKES,
    DYNAMIC_POST_COMMENTS,
    USER_FOLLOWS,
    TEAM_ACTIVITY_IMAGES,
    TEAM_ACTIVITY_PARTICIPANTS,
} = require('../../db/config');

/**
 * 获取用户信息
 * @param {*} user_id 
 * @returns 
 */
async function getUserInfo(user_id) {
    // 获取用户信息
    const sql = `SELECT * FROM ${USERS} WHERE user_id = ?`;
    const { result: userResult } = await query(sql, [user_id]);

    return userResult[0];
}

// 通过关键字搜索帖子（组队、动态）和用户
// 对于组队帖: 需要匹配出发地，目的地地名、付费方式payment_method、标题、内容
// 动态: 需要匹配标题、内容
// 用户：需要匹配id、用户名、个性签名、地区（region_name）

const searchPostAndUserWithRealtiveKeyWord = async (req, res) => {
    const { keyword } = req.query;
    const { user_id: request_userId } = req.user|| {use_id:-1}
    try {
        // 模糊匹配动态帖子
        const dynamicPostsResult = await query(`
            SELECT * FROM ${DYNAMIC_POSTS}
            WHERE content LIKE ? AND status = 1
        `, [`%${keyword}%`]);

        // 模糊匹配组队活动帖子
        const teamActivityPostsResult = await query(`
            SELECT * FROM ${TEAM_ACTIVITY_POSTS}
            WHERE (title LIKE ?
            OR description LIKE ?
            OR start_location LIKE ?
            OR end_location LIKE ?
            OR payment_method LIKE ?) AND status = 1
        `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

        // 模糊匹配用户
        const usersResult = await query(`
            SELECT * FROM ${USERS}
            WHERE username LIKE ?
            OR nickname LIKE ?
            OR user_id LIKE ?
            OR bio LIKE ?
            OR region_name LIKE ?
        `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

        let dynamicData = [], teamPostData = [], userData = [];
        // 修饰返回结果
        if (dynamicPostsResult.result.length !== 0) {
            dynamicData = await Promise.all(dynamicPostsResult.result.map(async post => {
                //  用户信息
                const { nickname, avatar_url } = await getUserInfo(post.user_id);

                // 查关联图片
                const { result: imagesResult } = await query(`SELECT * FROM ${DYNAMIC_POST_IMAGES} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);
                // 查点赞人数
                const { result: likesResult } = await query(`SELECT COUNT(*) as total FROM ${DYNAMIC_POST_LIKES} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);
                // 查询评论人数
                const { result: commentsResult } = await query(`SELECT COUNT(*) as total FROM ${DYNAMIC_POST_COMMENTS} WHERE dynamic_post_id = ?`, [post.dynamic_post_id]);

                // 查询用户是否点赞了该动态
                const { result: isLikedResult } = await query(`SELECT * FROM ${DYNAMIC_POST_LIKES} WHERE user_id = ? AND dynamic_post_id = ?`, [request_userId, post.dynamic_post_id]);
                // 查询用户是否关注了帖子发布用户
                const { result: isFollowedResult } = await query(`SELECT * FROM ${USER_FOLLOWS} WHERE follower_id = ? AND following_id = ?`, [request_userId, post.user_id]);
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
                        nickname,
                        avatar_url
                    },
                    isFollowed: isFollowed,
                    isLiked,
                    created_at: post.created_at,
                    images: images,
                    like_count: likeCount,
                    comment_count: commentCount,
                }
            }));
        }
        if (teamActivityPostsResult.result.length !== 0) {
            teamPostData = await Promise.all(teamActivityPostsResult.result.map(async (post) => {
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

                // 查询已加入小队的用户列表
                const sql = `
                    SELECT u.user_id, u.nickname, u.avatar_url, p.joined_at
                    FROM ${USERS} u
                    INNER JOIN ${TEAM_ACTIVITY_PARTICIPANTS} p ON u.user_id = p.user_id
                    WHERE p.post_id = ?
                `;
                const { result: teamMembers } = await query(sql, [post_id]);

                return {
                    ...post,
                    user_info: { user_id, nickname, avatar_url },
                    images,
                    joinMans: teamMembers
                }

            }))
        }
        if (usersResult.result.length !== 0) {
            request_userId
            userData = await Promise.all(usersResult.result.map(async (user) => {
                const { user_id, nickname, avatar_url, birthday, gender } = user
                // 查询用户是否关注了用户
                const { result: isFollowedResult } = await query(`SELECT * FROM ${USER_FOLLOWS} WHERE follower_id = ? AND following_id = ?`, [request_userId, user_id]);
                const isFollow = isFollowedResult.length > 0;
                return {
                    user_id,
                    nickname,
                    avatar_url,
                    birthday,
                    gender,
                    isFollow
                }
            }))

        }

        res.status(200).json({ code: 200, msg: "搜索成功", data: { dynamicPosts: dynamicData, teamActivityPosts: teamPostData, users: userData } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, msg: 'Internal server error' });
    }
}


module.exports = {
    searchPostAndUserWithRealtiveKeyWord,
}