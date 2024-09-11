const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = '' } = process.env;
const [host, port] = MYSQL_ADDRESS.split(':');

// let host = '127.0.0.1';// 数据库地址
// let port = '3306';// 端口
// let user = 'root';// 用户名称
// let password = '123456';// 用户密码
let user = MYSQL_USERNAME;// 用户名称
let password = MYSQL_PASSWORD;// 用户密码

let database = 'travel';// 要链接的数据库名称     
let connectionLimit = 10;// 连接数限制

const config = {
    connectionLimit,
    host,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4' // 设置连接字符集为 utf8mb4
}

// 数据库表
const USERS = 'users';
const TAGS = 'tags';
const USER_TAGS = 'user_tags';
const ADMINS = 'admins';
const USER_FOLLOWS = 'user_follows';
const DYNAMIC_POSTS = 'dynamic_posts';
const DYNAMIC_POST_IMAGES = 'dynamic_post_images';
const DYNAMIC_POST_COMMENTS = 'dynamic_post_comments';
const DYNAMIC_POST_LIKES = 'dynamic_post_likes';

const TEAM_ACTIVITY_POSTS = 'team_activity_posts';
const TEAM_ACTIVITY_IMAGES = 'team_activity_images';
const TEAM_ACTIVITY_THEMES = 'team_activity_themes';
const TEAM_ACTIVITY_POST_COMMENTS = 'team_activity_post_comments';
const TEAM_ACTIVITY_POST_LIKES = 'team_activity_post_likes';
const ITINERARIES = 'itineraries';
const TEAM_ACTIVITY_PARTICIPANTS = "team_activity_participants"


// 消息通知表
const MESSAGES = 'messages';

// 审批记录表
const APPROVAL_RECORDS = 'approval_records';
// 推荐表
const RECOMMENDATIONS = 'recommend_posts_or_moments';

// 公告表
const NOTICES = 'notices';

const MESSAGE_TYPE = {
    /** 私人消息 */
    PRIVATE_MESSAGE: 'private_message',
    /** 动态评论消息 */
    DYNAMIC_POST_COMMENT: 'dynamic_post_comment',
    /** 动态点赞消息 */
    DYNAMIC_POST_LIKE: 'dynamic_post_like',
    /** 组队评论消息 */
    TEAM_ACTIVITY_POST_COMMENT: 'team_activity_post_comment',
    /** 组队点赞消息 */
    TEAM_ACTIVITY_POST_LIKE: 'team_activity_post_like',
    /** 管理员消息 */
    ADMIN_NOTIFICATION: 'admin_notification',
    /** 关注消息 */
    FOLLOW_NOTIFICATION: 'follow_notification'
}


module.exports = {
    config,
    USERS,
    TAGS,
    USER_TAGS,
    ADMINS,
    USER_FOLLOWS,
    DYNAMIC_POSTS,
    DYNAMIC_POST_IMAGES,
    DYNAMIC_POST_COMMENTS,
    DYNAMIC_POST_LIKES,
    TEAM_ACTIVITY_POSTS,
    TEAM_ACTIVITY_IMAGES,
    TEAM_ACTIVITY_THEMES,
    TEAM_ACTIVITY_POST_COMMENTS,
    TEAM_ACTIVITY_POST_LIKES,
    ITINERARIES,
    TEAM_ACTIVITY_PARTICIPANTS,
    MESSAGES,
    APPROVAL_RECORDS,
    RECOMMENDATIONS,
    MESSAGE_TYPE,
    NOTICES
};