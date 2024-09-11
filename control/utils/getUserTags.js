const {query} = require('../../db/index');
/**
 * 获取用户tags
 * @param {[]} userIds 用户ids
 * @returns 
 */
const getUserTagsInfo = async (userIds) => {
    const TagMap = new Map();

    const getTaginfo = async (tag_id) => {
        if (TagMap.has(tag_id)) {
            return TagMap.get(tag_id);
        }
        const { result: tagResult } = await query('SELECT * FROM tags WHERE tag_id = ?', [tag_id]);

        TagMap.set(tag_id, tagResult[0]);
        return tagResult[0];
    }

    const getUserTagIds = async (user_id) => {
        const { result: userTagsResult } = await query('SELECT * FROM user_tags WHERE user_id = ?', [user_id]);

        const userTagIds = userTagsResult.map(userTag => userTag.tag_id);
        return userTagIds;
    }

    const usersTagsInfo = await Promise.all(userIds.map(async (user_id) => {
        const userTagIds = await getUserTagIds(user_id);
        const userTagsInfo = await Promise.all(userTagIds.map(async (tag_id) => {
            const tagInfo = await getTaginfo(tag_id);
            return tagInfo;
        }))
        return {
            user_id,
            tags: userTagsInfo
        };
    }))

    return usersTagsInfo;
}

module.exports = getUserTagsInfo