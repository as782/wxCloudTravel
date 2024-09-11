const { query } = require("../../../db");
const { USERS, ADMINS, TAGS } = require("../../../db/config");
const { queryWithConditionsAndPaging } = require("../common");

/** 获取用户列表 */
const getUserList = async (req, res) => {
    let page, limit;
    page = req.body.page || 1;
    limit = req.body.limit || 10;
    const paging = {
        page: page,
        limit: limit
    }
    // 其他查询条件参数
    // 用户id , 用户名 , 用户状态,昵称，性别 ，邮箱、电话 地区 等 可能传了也可能没
    const conditionKeys = {
        user_id: req.body.user_id,
        username: req.body.username,
        status: req.body.status,
        nickname: req.body.nickname,
        gender: req.body.gender,
        contact_email: req.body.contact_email,
        contact_phone: req.body.contact_phone,
        region_name: req.body.region_name,

    }
    const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(USERS, conditionKeys, paging)
    res.status(200).json({
        code: 200, msg: '获取用户列表成功', data: {
            list: data,
            pageSize: limit,
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: currentPage
        }
    });
}

/** 添加用户 */
const addUser = async (req, res) => {
    try {
        const {
            username,
            password,
            avatar_url,
            nickname,
            gender,
            bio,
            birthday,
            region_name,
            region_code,
            contact_phone,
            contact_email,
            status
        } = req.body;

        const sql = `INSERT INTO users (username, password, avatar_url, nickname, gender, bio, birthday, region_name, region_code, contact_phone, contact_email, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
            username,
            password,
            avatar_url,
            nickname,
            gender,
            bio,
            birthday,
            region_name,
            region_code,
            contact_phone,
            contact_email,
            status
        ];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '用户添加成功' });
    } catch (error) {
        console.error('添加用户失败:', error);
        res.status(500).json({ code: 500, msg: '用户添加失败' });
    }
};

/** 删除用户 */
const deleteUser = async (req, res) => {
    try {
        const { ids } = req.body;
        const userIds = ids
        // 构建 SQL 语句和参数
        const sql = `DELETE FROM users WHERE user_id IN (?)`;
        const values = [userIds];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '用户删除成功' });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ code: 500, msg: '用户删除失败' });
    }
};

/** 修改用户信息 */
const updateUser = async (req, res) => {
    try {
        const {
            user_id,
            username,
            password,
            avatar_url,
            nickname,
            gender,
            bio,
            birthday,
            region_name,
            region_code,
            contact_phone,
            contact_email,
            status
        } = req.body;

        const sql = `UPDATE users SET 
                     username = ?,
                     password = ?,
                     
                     nickname = ?,
                     gender = ?,
                     bio = ?,
                     birthday = ?,
                     region_name = ?,
                     region_code = ?,
                     contact_phone = ?,
                     contact_email = ?,
                     status = ?
                     WHERE user_id = ?`;
        const values = [
            username,
            password,

            nickname,
            gender,
            bio,
            new Date(birthday),
            region_name,
            region_code,
            contact_phone,
            contact_email,
            status,
            user_id
        ];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '用户信息修改成功' });
    } catch (error) {
        console.error('修改用户信息失败:', error);
        res.status(500).json({ code: 500, msg: '用户信息修改失败' });
    }
};


/** 获取管理员列表 */
const getAdminList = async (req, res) => {
    let page, limit;
    page = req.body.page || 1;
    limit = req.body.limit || 10;
    const paging = {
        page: page,
        limit: limit
    }
    const conditionKeys = {
        admin_id: req.body.admin_id,
        username: req.body.username,
        status: req.body.status,
        nickname: req.body.nickname,
        gender: req.body.gender,
        role: req.body.role,
    }
    const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(ADMINS, conditionKeys, paging)
    res.status(200).json({
        code: 200, msg: '获取管理员列表成功', data: {
            list: data,
            pageSize: limit,
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: currentPage
        }
    });
}

/** 添加管理员 */
const addAdmin = async (req, res) => {
    try {
        const {
            username,
            password,
            avatar_url,
            nickname,
            gender,
            birthday,
            role,
            status
        } = req.body;

        const sql = `INSERT INTO admins (username, password, avatar_url, nickname, gender, birthday, role, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
            username,
            password,
            avatar_url,
            nickname,
            gender,
            new Date(birthday),
            role,
            status
        ];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '管理员添加成功' });
    } catch (error) {
        console.error('添加管理员失败:', error);
        res.status(500).json({ code: 500, msg: '管理员添加失败' });
    }
};

/** 删除管理员 */
const deleteAdmin = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminIds = ids
        const sql = `DELETE FROM admins WHERE admin_id IN (?)`;
        const values = [adminIds];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '管理员删除成功' });
    } catch (error) {
        console.error('删除管理员失败:', error);
        res.status(500).json({ code: 500, msg: '管理员删除失败' });
    }
};

/** 修改密码 */
const updatePassword = async (req, res) => {
    try {
        const { admin_id, old_password, new_password } = req.body;
        // 检查原始密码是否正确
        const sql = `SELECT password FROM admins WHERE admin_id = ?`;
        const values = [admin_id];
        const {result:sresult} = await query(sql, values);
        const stored_password = sresult[0].password;
        if (stored_password !== old_password) {
            return res.status(400).json({ code: 400, msg: '原始密码错误' });
        }

        // 更新密码
        const updateSql = `UPDATE admins SET password = ? WHERE admin_id = ?`;
        const updateValues = [new_password, admin_id];
        await query(updateSql, updateValues);
        res.status(200).json({ code: 200, msg: '密码修改成功' });
    } catch (error) {
        console.error('密码修改失败:', error);
        res.status(500).json({ code: 500, msg: '密码修改失败' });
    }

}

/** 修改管理员信息 */
const updateAdmin = async (req, res) => {
    try {
        const {
            admin_id,
            username,
            password,
            avatar_url,
            nickname,
            gender,
            birthday,
            role,
            status
        } = req.body;

        const sql = `UPDATE admins SET 
                     username = ?,
                     password = ?,
                     
                     nickname = ?,
                     gender = ?,
                     
                     role = ?,
                     status = ?
                     WHERE admin_id = ?`;
        const values = [
            username,
            password,

            nickname,
            gender,

            role,
            status,
            admin_id
        ];

        await query(sql, values);

        res.status(200).json({ code: 200, msg: '管理员信息修改成功' });
    } catch (error) {
        console.error('修改管理员信息失败:', error);
        res.status(500).json({ code: 500, msg: '管理员信息修改失败' });
    }
};

//标签
/** 获取标签列表 */
const getTagList = async (req, res) => {
    try {
        let page, limit;
        page = req.body.page || 1;
        limit = req.body.limit || 10;
        const paging = {
            page: page,
            limit: limit
        };
        const conditionKeys = {
            tag_id: req.body.tag_id,
            tag_name: req.body.tag_name,
        };
        const { data, totalCount, totalPages, currentPage } = await queryWithConditionsAndPaging(TAGS, conditionKeys, paging);
        res.status(200).json({
            code: 200, msg: '获取标签列表成功', data: {
                list: data,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: currentPage
            }
        });
    } catch (error) {
        console.error('获取标签列表失败:', error);
        res.status(500).json({ code: 500, msg: '获取标签列表失败' });
    }
};

/** 添加标签 */
const addTag = async (req, res) => {
    try {
        const { tag_name } = req.body;
        const sql = `INSERT INTO tags (tag_name) VALUES (?)`;
        const values = [tag_name];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '标签添加成功' });
    } catch (error) {
        console.error('添加标签失败:', error);
        res.status(500).json({ code: 500, msg: '标签添加失败' });
    }
};

/** 删除标签 */
const deleteTag = async (req, res) => {
    try {
        const { ids } = req.body;
        const tagIds = ids
        const sql = `DELETE FROM tags WHERE tag_id IN (?)`;
        const values = [tagIds];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '标签删除成功' });
    } catch (error) {
        console.error('删除标签失败:', error);
        res.status(500).json({ code: 500, msg: '标签删除失败' });
    }
};

/** 修改标签信息 */
const updateTag = async (req, res) => {
    try {
        const { tag_id, tag_name } = req.body;
        const sql = `UPDATE tags SET tag_name = ? WHERE tag_id = ?`;
        const values = [tag_name, tag_id];
        await query(sql, values);
        res.status(200).json({ code: 200, msg: '标签信息修改成功' });
    } catch (error) {
        console.error('修改标签信息失败:', error);
        res.status(500).json({ code: 500, msg: '标签信息修改失败' });
    }
};



module.exports = {
    getUserList,
    addUser,
    deleteUser,
    updateUser,
    getAdminList,
    addAdmin,
    deleteAdmin,
    updateAdmin,
    getTagList,
    addTag,
    deleteTag,
    updateTag,
    updatePassword
}