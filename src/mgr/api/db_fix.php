<?php
/**
 * 修复频道数据库（兼容v1.4）
 * POST { dbPath }
 * 功能：检查并修复三个表行数对齐，空行有id索引和空/零值
 * 不依赖前端范围，以三个表最大ID为准
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(1001, '请求方法不允许');
}

requireUpdate();

$input = json_decode(file_get_contents('php://input'), true);
$dbPath = str_replace('\\', '/', trim($input['dbPath'] ?? ''));

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

if (!file_exists($fullPath)) {
    jsonResponse(4001, '数据库文件不存在');
}

$db = new SQLite3($fullPath, SQLITE3_OPEN_READWRITE);
$db->busyTimeout(5000);
$db->exec('PRAGMA journal_mode=WAL');

/* 确保三个表都存在 */
$db->exec('CREATE TABLE IF NOT EXISTS media_stats (
    media_id INTEGER PRIMARY KEY,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    favorites INTEGER NOT NULL DEFAULT 0
)');

$db->exec('CREATE TABLE IF NOT EXISTS media_extra (
    media_id INTEGER PRIMARY KEY,
    downloads INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    blocks INTEGER NOT NULL DEFAULT 0
)');

$db->exec('CREATE TABLE IF NOT EXISTS media_labels (
    media_id INTEGER PRIMARY KEY,
    labels TEXT NOT NULL DEFAULT \'[]\'
)');

/* 获取各表的行数和最大ID */
$statsCount = 0; $maxStats = 0;
$r = $db->query('SELECT COUNT(*) AS c, MAX(media_id) AS m FROM media_stats');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $statsCount = $rr['c']; $maxStats = $rr['m'] ?? 0; }

$extraCount = 0; $maxExtra = 0;
$r = $db->query('SELECT COUNT(*) AS c, MAX(media_id) AS m FROM media_extra');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $extraCount = $rr['c']; $maxExtra = $rr['m'] ?? 0; }

$labelsCount = 0; $maxLabels = 0;
$r = $db->query('SELECT COUNT(*) AS c, MAX(media_id) AS m FROM media_labels');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $labelsCount = $rr['c']; $maxLabels = $rr['m'] ?? 0; }

/* 以三个表最大ID为准，保证行数只增对齐 */
$maxTarget = max($maxStats, $maxExtra, $maxLabels);
$filledStats = 0;
$filledExtra = 0;
$filledLabels = 0;

/* 补充缺失的行（INSERT OR IGNORE 已存在的行不会重复插入） */
if ($maxTarget > 0) {
    $stmtStats = $db->prepare('INSERT OR IGNORE INTO media_stats (media_id, views, likes, favorites) VALUES (:id, 0, 0, 0)');
    $stmtExtra = $db->prepare('INSERT OR IGNORE INTO media_extra (media_id, downloads, shares, blocks) VALUES (:id, 0, 0, 0)');
    $stmtLabels = $db->prepare('INSERT OR IGNORE INTO media_labels (media_id, labels) VALUES (:id, \'[]\')');

    for ($i = 1; $i <= $maxTarget; $i++) {
        $stmtStats->bindValue(':id', $i, SQLITE3_INTEGER);
        $stmtStats->execute();
        if ($db->changes() > 0) $filledStats++;

        $stmtExtra->bindValue(':id', $i, SQLITE3_INTEGER);
        $stmtExtra->execute();
        if ($db->changes() > 0) $filledExtra++;

        $stmtLabels->bindValue(':id', $i, SQLITE3_INTEGER);
        $stmtLabels->execute();
        if ($db->changes() > 0) $filledLabels++;
    }
}

/* 获取修复后的行数 */
$newStatsCount = 0;
$r = $db->query('SELECT COUNT(*) AS c FROM media_stats');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $newStatsCount = $rr['c']; }

$newExtraCount = 0;
$r = $db->query('SELECT COUNT(*) AS c FROM media_extra');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $newExtraCount = $rr['c']; }

$newLabelsCount = 0;
$r = $db->query('SELECT COUNT(*) AS c FROM media_labels');
if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); $newLabelsCount = $rr['c']; }

$db->close();

jsonResponse(0, '修复完成', [
    'before' => ['stats' => $statsCount, 'extra' => $extraCount, 'labels' => $labelsCount],
    'after' => ['stats' => $newStatsCount, 'extra' => $newExtraCount, 'labels' => $newLabelsCount],
    'filled' => ['stats' => $filledStats, 'extra' => $filledExtra, 'labels' => $filledLabels],
    'maxId' => $maxTarget
]);