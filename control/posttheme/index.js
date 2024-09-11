const { query } = require('../../db/index');
// 添加主题
const addTheme = async (req, res) => {
    try {
        const { theme_name } = req.body;

        // 检查主题是否已存在
        const { result: existingTheme } = await query('SELECT * FROM team_activity_themes WHERE theme_name = ?', [theme_name]);
        if (existingTheme.length > 0) {
            return res.status(400).json({ code: 400, msg: '主题已存在' });
        }

        // 添加主题
        const { result } = await query('INSERT INTO team_activity_themes (theme_name) VALUES (?)', [theme_name]);
        const theme_id = result.insertId;

        res.status(201).json({ code: 201, msg: '主题添加成功', data: { theme_id, theme_name } });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};

// 删除主题
const deleteTheme = async (req, res) => {
    try {
        const theme_id = req.params.theme_id;
        console.log(req.params);
        // 检查主题是否存在
        const { result: existingTheme } = await query('SELECT * FROM team_activity_themes WHERE theme_id = ?', [theme_id]);
        if (existingTheme.length === 0) {
            return res.status(400).json({ code: 400, msg: '主题不存在' });
        }

        // 删除主题
        await query('DELETE FROM team_activity_themes WHERE theme_id = ?', [theme_id]);

        res.status(200).json({ code: 200, msg: '主题删除成功' });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
};


const getThemes = async (req, res) => {
    try {
        const { result: themes } = await query('SELECT * FROM team_activity_themes');

        res.status(200).json({ code: 200, msg: '获取主题列表成功', data: themes });
    } catch (error) {
        res.status(500).json({ code: 500, msg: '服务器错误 ' + error.message });
    }
}
module.exports = {
    getThemes,
    addTheme,
    deleteTheme
}
