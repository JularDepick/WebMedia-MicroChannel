<?php
/**
 * SQLite 数据库初始化与连接
 * 接受数据库名称参数，支持多配置切换
 *
 * 表1: media_stats   — 编号,{浏览量,点赞量,收藏量}
 * 表2: media_extra   — 编号,{下载量,分享量,屏蔽量}
 * 表3: media_labels  — 编号,{标签JSON数组}
 */

/**
 * 校验并解析数据库路径
 * @param string $dbPath 相对于PHP脚本目录的路径（空字符串=PHP同目录）
 * @return string 解析后的绝对目录路径
 * @throws Exception 路径不合法时抛出异常
 */
function resolveDBPath($dbPath = '') {
    $baseDir = __DIR__;

    if ($dbPath === '' || $dbPath === null) {
        return $baseDir;
    }

    // 禁止绝对路径
    if ($dbPath[0] === '/' || preg_match('/^[A-Za-z]:\\\\/', $dbPath)) {
        throw new Exception('dbPath must be a relative path, not absolute');
    }

    // 禁止向上遍历
    if (strpos($dbPath, '..') !== false) {
        throw new Exception('dbPath must not contain ".." traversal');
    }

    $targetDir = $baseDir . DIRECTORY_SEPARATOR . $dbPath;

    // 目录不存在时自动创建
    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            throw new Exception('Failed to create directory: ' . $dbPath);
        }
    }

    // 解析为绝对路径
    $resolved = realpath($targetDir);
    if ($resolved === false) {
        throw new Exception('dbPath does not exist: ' . $dbPath);
    }

    // 确保解析后仍在 baseDir 下
    if ($resolved !== $baseDir && strpos($resolved, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
        throw new Exception('dbPath escapes base directory');
    }

    return $resolved;
}

function getDB($dbName = 'media-cls0.db', $dbPath = '') {
    $dir = resolveDBPath($dbPath);
    $baseName = basename($dbName);
    if (pathinfo($baseName, PATHINFO_EXTENSION) !== 'db') {
        throw new Exception('dbName must have .db extension');
    }
    $dbFullPath = $dir . DIRECTORY_SEPARATOR . $baseName;
    $db = new SQLite3($dbFullPath);
    $db->busyTimeout(5000);
    $db->exec('PRAGMA journal_mode=WAL');
    return $db;
}

function initDB($dbName = 'media-cls0.db', $dbPath = '') {
    $dir = resolveDBPath($dbPath);
    $baseName = basename($dbName);
    if (pathinfo($baseName, PATHINFO_EXTENSION) !== 'db') {
        throw new Exception('dbName must have .db extension');
    }
    $dbFullPath = $dir . DIRECTORY_SEPARATOR . $baseName;
    $db = new SQLite3($dbFullPath);

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

    $db->close();
}
