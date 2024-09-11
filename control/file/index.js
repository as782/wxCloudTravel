const { query } = require("../../db/index");
const { ITINERARIES, DYNAMIC_POST_IMAGES, TEAM_ACTIVITY_IMAGES } = require("../../db/config");

// 通过id删除对应表中的图片
const deleteImage = async (req, res, tableName) => {
    // 传入一个id数组
    const { image_ids } = req.body;
    if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
        return res.status(400).json({ code: 400, msg: '缺少必要字段' });
    }

    const id_key = tableName === ITINERARIES ? 'post_id' : 'image_id';
    try {
        // 构建SQL语句，使用IN子句删除对应表中的图片
        const sql = `DELETE FROM ${tableName} WHERE ${id_key} IN (?)`;
        // 执行SQL语句，传入image_ids作为参数
        const { result } = await query(sql, [image_ids]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, msg: '图片不存在' });
        }

        // 返回成功信息
        res.status(200).json({ code: 200, msg: "图片删除成功" });
    } catch (error) {
        console.error(error);
        // 如果发生错误，返回错误信息
        res.status(500).json({ code: 200, msg: error.message });
    }
}

const deleteItinerary = async (req, res) => {
    await deleteImage(req, res, ITINERARIES);
}

const deleteDynamicPostImage = async (req, res) => {
    await deleteImage(req, res, DYNAMIC_POST_IMAGES);
}

const deleteTeamActivityImage = async (req, res) => {
    await deleteImage(req, res, TEAM_ACTIVITY_IMAGES);
}

module.exports = { deleteItinerary, deleteDynamicPostImage, deleteTeamActivityImage };