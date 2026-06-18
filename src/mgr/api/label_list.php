<?php
/**
 * 获取标签列表
 * GET ?dbPath=xxx&min=1&max=100
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(1001, '请求方法不允许');
}

requireView();

$dbPath = str_replace('\\', '/', trim($_GET['dbPath'] ?? ''));
$min = isset($_GET['min']) ? intval($_GET['min']) : 0;
$max = isset($_GET['max']) ? min(intval($_GET['max']), 10000) : 0;

if (empty($dbPath)) {
    jsonResponse(1005, '数据库路径不能为空');
}

if (strpos($dbPath, '..') !== false) {
    jsonResponse(1006, '路径不合法');
}

/* dbPath 包含完整相对路径如 cait/cait20260609-0.db，需拆分目录和文件名 */
$baseDir = CHANNEL_DB_BASE_DIR;
$parts = pathinfo($dbPath);
$dirPart = $parts['dirname'] === '.' ? '' : $parts['dirname'];
$filePart = $parts['basename'];

/* 去掉 sqlitedb/ 前缀 */
$dirPart = preg_replace('#^sqlitedb/?#', '', $dirPart);

$fullDir = $dirPart ? realpath($baseDir . DIRECTORY_SEPARATOR . $dirPart) : $baseDir;
if ($fullDir === false || strpos($fullDir, $baseDir) !== 0) {
    jsonResponse(1006, '路径不合法');
}

$fullPath = $fullDir . DIRECTORY_SEPARATOR . $filePart;

$db = getChannelDb($fullPath);

/* 确保media_labels表存在 */
$db->exec('CREATE TABLE IF NOT EXISTS media_labels (
    media_id INTEGER PRIMARY KEY,
    labels TEXT NOT NULL DEFAULT \'[]\'
)');

$whereClause = ($min > 0 && $max >= $min) ? sprintf(' WHERE media_id BETWEEN %d AND %d', $min, $max) : '';
$result = $db->query('SELECT media_id AS id, labels FROM media_labels' . $whereClause);
$labels = [];
while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
    $row['labels'] = json_decode($row['labels'], true) ?: [];
    $labels[] = $row;
}
$db->close();

jsonResponse(0, 'success', ['labels' => $labels]);
