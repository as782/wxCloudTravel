var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var usersRouter = require('./routes/users');
var loginAndRegister = require('./routes/login');
var themeRouter = require('./routes/theme');
var postRouter = require('./routes/post');
var commentRouter = require('./routes/comment');
var likeRouter = require('./routes/like');
var uploadRouter = require('./routes/upload');
var msgRouter = require('./routes/message');
var tagsRouter = require('./routes/tags');
var fileRouter = require('./routes/file');
var searchRouter = require('./routes/search');


// 后台管理系统路由
var adminRouter = require('./routes/admin_route/index');

var app = express();
// 配置允许跨域的域名和方法
var corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false
}
app.use(cors(corsOptions));


// use swagger
var swaggerInstall = require("./utils/swagger");
const authenticateToken = require('./utils/auth');
swaggerInstall(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'user_resources')));


app.use('/', loginAndRegister);
app.use('/users', usersRouter);
app.use('/theme', themeRouter);
app.use('/post', postRouter);
app.use('/comment', commentRouter);
app.use('/like', likeRouter);
app.use('/upload', authenticateToken, uploadRouter);
app.use('/msg', authenticateToken, msgRouter);
app.use('/tags', authenticateToken, tagsRouter);
app.use('/file', authenticateToken, fileRouter);
app.use('/search', searchRouter);


// 后台管理系统
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
