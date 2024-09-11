const { query } = require('../../db/index')
/**
 * 插入数据到数据库表中
 * @param {string} tableName - 数据库表名
 * @param {object} data - 要插入的数据，键值对形式表示字段名和对应的值
 * @returns {Promise<number>} - 返回插入数据的ID
 */
const insertDataToDatabase = async (tableName, data) => {
    // 参数data必须为对象且非空
    if (typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error('参数data必须为对象且非空');
    }
    
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');

    const sql = `
        INSERT INTO ${tableName} (${columns})
        VALUES (${placeholders})
    `;
    const values = Object.values(data);

    const { result } = await query(sql, values);
    return result.insertId;

};

/**
 * 将图片信息与数据ID关联并保存到数据库
 * @param {string} tableName - 数据库表名，插入图片 
 * @param {number} postId - 数据ID，与图片关联
 * @param {string[]} imageUrls - 图片URL数组
 * @param {string[]} keys - 插入的字段名 (关联id ,关联数据)
 * @returns {Promise<void>}
 */
const associateImagesWithData = async (tableName, postId, imageUrls, keys) => {
    if(!imageUrls.length) return
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const insertPromises = imageUrls.map(async (imageUrl) => {
        const sql = `
            INSERT INTO ${tableName} (${columns})
            VALUES (${placeholders})
        `;
        const values = [postId, imageUrl];
        await query(sql, values);
    });
    await Promise.all(insertPromises);

};
/**
 * 
 * @param {*} tableName  对应的关联图片表
 * @param {*} dataId id值
 * @param {*} keyName  post_id | dynamic_post_id
 */
const deleteImagesByDataId =async (tableName, dataId,keyName)=>{
    const sql = `DELETE FROM ${tableName} WHERE ${keyName} = ?`;
    await query(sql, [dataId]);
}
module.exports = {
    insertDataToDatabase,
    associateImagesWithData,
    deleteImagesByDataId
};
