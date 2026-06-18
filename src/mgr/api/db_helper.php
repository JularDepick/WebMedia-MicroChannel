<?php
/**
 * 管理端数据库连接与自动初始化
 */

define('DB_DIR', __DIR__ . '/sqlite-db');

function ensureDbDir() {
    if (!is_dir(DB_DIR)) {
        mkdir(DB_DIR, 0755, true);
    }
}

/**
 * 获取认证数据库连接（管理端专用）
 */
function getAuthDb() {
    ensureDbDir();
    $db = new SQLite3(DB_DIR . '/auth.db');
    $db->busyTimeout(5000);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username CHAR(32) UNIQUE NOT NULL,
        deadline TIMESTAMP NOT NULL,
        token CHAR(128) NOT NULL
    )');
    return $db;
}

/**
 * 获取频道数据库连接（指向服务端的数据库文件）
 * @param string $dbPath 已解析的文件系统绝对路径（由调用方通过CHANNEL_DB_BASE_DIR拼接相对路径后realpath得到）
 * @return SQLite3
 */
function getChannelDb($dbPath) {
    if (!file_exists($dbPath)) {
        jsonResponse(4001, '数据库文件不存在');
    }
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READWRITE);
    $db->busyTimeout(5000);
    $db->exec('PRAGMA journal_mode=WAL');
    return $db;
}
