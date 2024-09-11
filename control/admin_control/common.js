const { query } = require("../../db/index");

/**
 * 使用提供的 MySQL 连接池执行事务。
 * 
 * @param {Pool} pool - MySQL 连接池。
 * @param {Function} callback - 包含事务逻辑的回调函数。
 * @returns {Promise} 如果事务成功则解析，如果发生错误则拒绝的 Promise。
 */
function executeTransaction(pool, callback) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err)
                return
            }
            //开启事务
            connection.beginTransaction(async (beginErr) => {
                if (beginErr) {
                    console.error(beginErr.message);
                    connection.release();
                    reject(beginErr);
                    return;
                }

                try {
                    await callback(connection)
                    // 提交事务
                    connection.commit((commitErr) => {
                        if (commitErr) {
                            console.error(commitErr.message);
                            reject(commitErr);
                            return;
                        }

                        resolve();
                    });
                } catch (error) {
                    // 回滚事务
                    connection.rollback(() => {
                        console.error('失败 rolled back:', error);
                        reject(error);
                    });
                } finally {
                    // 释放连接
                    connection.release();
                }

            })

        })
    })
}
/**
 * 使用提供的连接执行查询。
 * 
 * @param {Connection} connection - MySQL 连接。
 * @param {string} sql - 要执行的 SQL 查询语句。
 * @param {Array} values - 查询参数值。
 * @returns {Promise} 如果查询成功则解析，如果发生错误则拒绝的 Promise。
 */
function queryWithConnection(connection, sql, values) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (qerr, result, fields) => {
            if (qerr) {
                reject(qerr);
                return;
            }
            resolve({ result, fields });
        });
    });
};


/**
 * 通用多条件分页查询函数
 * @param {string} tableName - 要查询的表名
 * @param {object} conditions - 查询条件，键为字段名，值为条件值
 * @param {object} paging - 分页参数，包含page和limit
 * @param {array} selectFields - 要查询的字段列表，默认为所有字段
 */
const queryWithConditionsAndPaging = async (tableName, conditions, paging, selectFields = ['*']) => {
    let { page = 1, limit = 10 } = paging;
    let conditionValues = [];
    let conditionClauses = [];

    // 构建查询条件
    for (const field in conditions) {
        if (conditions[field]) {

            conditionClauses.push(`${field} = ?`);
            conditionValues.push(conditions[field]);
        }
    }

    try {
        // 构建 SQL 查询语句
        let countSql = `SELECT COUNT(*) AS total FROM ${tableName}`;
        let sql = `SELECT ${selectFields.join(',')} FROM ${tableName}`;

        if (conditionClauses.length > 0) {
            countSql += ` WHERE ${conditionClauses.join(' AND ')}`;
            sql += ` WHERE ${conditionClauses.join(' AND ')}`;
        }
        // 按创建时间
        sql += ` ORDER BY created_at DESC`;
        // 查询总数
        const { result: countResult } = await query(countSql, conditionValues);
        const totalCount = countResult[0].total;

        // 执行分页查询
        sql += ` LIMIT ? OFFSET ?`;
        conditionValues.push(parseInt(limit));
        conditionValues.push((parseInt(page) - 1) * parseInt(limit));

        const { result } = await query(sql, conditionValues);

        return {
            data: result,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: parseInt(page)
        };
    } catch (error) {
        throw new Error(`Error executing query: ${error.message}`);
    }
};

module.exports = {
    queryWithConditionsAndPaging,
    executeTransaction,
    queryWithConnection
};


