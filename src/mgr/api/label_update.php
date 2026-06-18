<?php
/**
 * 更新标签
 * POST { dbPath, id, labels }
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(1001, '请求方法不允许');
}

requireUpdate();

$input = json_decode(file_get_contents('php://input'), true);
$dbPath = str_replace('\\', '/', trim($input['dbPath'] ?? ''));
$id = isset($input['id']) ? intval($input['id']) : 0;
$labels = isset($input['labels']) ? $input['labels'] : [];

if (empty($dbPath)) {
    jsonResponse(1005, '数据库路径不能为空');
}

if (strpos($dbPath, '..') !== false) {
    jsonResponse(1006, '路径不合法');
}

if ($id < 1) {
    jsonResponse(1005, '无效的媒体ID');
}

if (!is_array($labels)) {
    jsonResponse(1005, '标签必须为数组');
}

/* 清理标签：去空值、去重、限制长度 */
$cleanLabels = [];
foreach ($labels as $label) {
    $label = trim(strval($label));
    if ($label !== '' && mb_strlen($label) <= 20 && !in_array($label, $cleanLabels)) {
        $cleanLabels[] = $label;
    }
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

$db->exec('CREATE TABLE IF NOT EXISTS media_labels (
    media_id INTEGER PRIMARY KEY,
    labels TEXT NOT NULL DEFAULT \'[]\'
)');

$labelsJson = json_encode($cleanLabels, JSON_UNESCAPED_UNICODE);
$stmt = $db->prepare('INSERT INTO media_labels (media_id, labels) VALUES (:id, :labels)
    ON CONFLICT(media_id) DO UPDATE SET labels = :labels2');
$stmt->bindValue(':id', $id, SQLITE3_INTEGER);
$stmt->bindValue(':labels', $labelsJson, SQLITE3_TEXT);
$stmt->bindValue(':labels2', $labelsJson, SQLITE3_TEXT);
$stmt->execute();
$db->close();

jsonResponse(0, '更新成功', ['id' => $id, 'labels' => $cleanLabels]);
