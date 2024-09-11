const { query } = require("../../db")
const { TAGS } = require('../../db/config')
/** 请求标签列表 */
const getTags = async (req, res) => {

    try {
        const { result } = await query(`SELECT * FROM ${TAGS}`);
        res.status(200).json({
            code: 200,
            data: {
                list: result
            }
        })
    } catch (error) {
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}
/** 添加标签 */
const addTag = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400).json({
            code: 400,
            msg: '标签名称不能为空'
        })
        return;
    }
    try {
        // 判断标签是否存在
        const { result } = await query(`SELECT * FROM ${TAGS} WHERE tag_name = ?`, [name]);
        if (result.length) {
            res.status(400).json({
                code: 400,
                msg: '标签已存在'
            })
            return;
        }
        await query(`INSERT INTO ${TAGS} (tag_name) VALUES (?)`, [name]);

        res.status(200).json({
            code: 200,
            msg: '添加成功'
        })
    } catch (error) {
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

module.exports = {
    getTags,
    addTag
}