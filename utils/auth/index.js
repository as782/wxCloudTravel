const jwt = require('jsonwebtoken');
const { MY_JWT } = require('../../config');
// 鉴权中间件
const authenticateToken = (req, res, next) => {
    // console.log(req.headers);
    const token = req.headers['authorization'];
    if (token == null) return res.status(401).json({ code: 401, msg: '请登录' });;

    jwt.verify(token, MY_JWT.SECRET_KEY, (err, user) => {

        if (err) return res.status(403).json({ code: 403, msg: 'Forbidden/ 登录过期或身份错误' });

        req.user = user;
        next();
    });
};

module.exports = authenticateToken;