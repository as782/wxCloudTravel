/**
 * mysql数据库连接池
 **/
const mysql = require('mysql');
const { config } = require('./config');

const pool = mysql.createPool(config);


/**
 * 
 * @param {*} sql 语句
 * @param {*} values 查询参数
 * @returns promise  {result,fields}
 */
const query = (sql, values) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error(err.message);
                reject(err);
                return;
            }

            connection.query(sql, values, (qerr, result, fields) => {
                connection.release();

                if (qerr) {
                    reject(qerr);
                    return;
                }
                resolve({ result, fields });
            });
        });
    });
};



module.exports = { pool, query };
