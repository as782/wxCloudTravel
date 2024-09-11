const { query } = require('../../db/index')
/**
 * 查询某个id 是否在数据表中
 * @param {string} tableName 
 * @param {object} keyMap 查询根据的字段和值 
 */
async function isExistINTable(tableName, keyMap) {
    Object.keys(keyMap).forEach(key => {
        if (!keyMap[key]) {
            throw new Error(`${key}不能为空`)
        }
    })
    const fileds = Object.keys(keyMap).map(key => {
        return `${key} = ?`
    }).join(' AND ');
    const sql = `SELECT * FROM ${tableName} WHERE ${fileds}`;
    const { result } = await query(sql, Object.values(keyMap));
 
    return result.length > 0;
}

module.exports = isExistINTable;
