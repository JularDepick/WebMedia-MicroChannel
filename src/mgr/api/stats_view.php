<?php
/**
 * 查看频道统计数据（只读）
 * GET ?dbPath=xxx&dbName=xxx&min=1&max=100
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(1001, '请求方法不允许');
}

requireView();

$dbPath = str_replace('\\', '/', trim($_GET['dbPath'] ?? ''));
$dbName = trim($_GET['dbName'] ?? '');
$min = isset($_GET['min']) ? intval($_GET['min']) : 0;
$max = isset($_GET['max']) ? min(intval($_GET['max']), 10000) : 0;

if (empty($dbName)) {
    jsonResponse(1005, '参数不完整');
}

if (strpos($dbPath, '..') !== false || strpos($dbName, '..') !== false) {
    jsonResponse(1006, '路径不合法');
}

/* 去掉 sqlitedb/ 前缀（CHANNEL_DB_BASE_DIR 已指向该目录） */
$dbPath = preg_replace('#^sqlitedb/?#', '', $dbPath);

$baseDir = CHANNEL_DB_BASE_DIR;

/* local 模式: dbName 包含子目录如 cait/xxx.db，需要拆分 */
/* config 模式: dbPath=cait/, dbName=xxx.db */
if (empty($dbPath) && strpos($dbName, '/') !== false) {
    $parts = pathinfo($dbName);
    $dbPath = $parts['dirname'] === '.' ? '' : $parts['dirname'];
    $dbName = $parts['basename'];
}

$fullDir = $dbPath ? realpath($baseDir . DIRECTORY_SEPARATOR . $dbPath) : $baseDir;
if ($fullDir === false || strpos($fullDir, $baseDir) !== 0) {
    jsonResponse(1006, '路径不合法');
}

$dbFile = $fullDir . DIRECTORY_SEPARATOR . basename($dbName);
if (!file_exists($dbFile)) {
    jsonResponse(4001, '数据库文件不存在');
}

$db = new SQLite3($dbFile, SQLITE3_OPEN_READONLY);
$db->busyTimeout(5000);

$whereClause = ($min > 0 && $max >= $min) ? sprintf(' WHERE media_id BETWEEN %d AND %d', $min, $max) : '';

$stats = [];
$result = $db->query('SELECT media_id AS id, views, likes, favorites FROM media_stats' . $whereClause);
if ($result) {
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $stats[] = $row;
    }
}

$extra = [];
$result = $db->query('SELECT media_id AS id, downloads, shares, blocks FROM media_extra' . $whereClause);
if ($result) {
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $extra[] = $row;
    }
}

$labels = [];
$result = $db->query('SELECT media_id AS id, labels FROM media_labels' . $whereClause);
if ($result) {
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $row['labels'] = json_decode($row['labels'], true) ?: [];
        $labels[] = $row;
    }
}

$db->close();

jsonResponse(0, 'success', [
    'stats' => $stats,
    'extra' => $extra,
    'labels' => $labels
]);
