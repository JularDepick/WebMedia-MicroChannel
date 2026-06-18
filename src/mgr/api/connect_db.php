<?php
/**
 * 连接频道数据库
 * POST { dbPath }  dbPath: 相对于CHANNEL_DB_BASE_DIR的路径
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(1001, '请求方法不允许');
}

requireView();

$input = json_decode(file_get_contents('php://input'), true);
$dbPath = str_replace('\\', '/', trim($input['dbPath'] ?? ''));

if (empty($dbPath)) {
    jsonResponse(1005, '数据库路径不能为空');
}

/* 安全校验：禁止路径遍历 */
if (strpos($dbPath, '..') !== false) {
    jsonResponse(1006, '路径不合法');
}

$baseDir = CHANNEL_DB_BASE_DIR;
if (!$baseDir || !is_dir($baseDir)) {
    jsonResponse(5001, '数据库目录不存在或未配置');
}

$fullPath = realpath($baseDir . DIRECTORY_SEPARATOR . $dbPath);
if ($fullPath === false || strpos($fullPath, $baseDir) !== 0) {
    jsonResponse(1006, '路径不合法');
}

if (!file_exists($fullPath)) {
    jsonResponse(4001, '数据库文件不存在');
}

/* 验证是否为SQLite数据库 */
$db = new SQLite3($fullPath, SQLITE3_OPEN_READONLY);
$result = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
$tables = [];
while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
    $tables[] = $row['name'];
}
$db->close();

jsonResponse(0, '连接成功', [
    'dbPath' => $dbPath,
    'tables' => $tables
]);
