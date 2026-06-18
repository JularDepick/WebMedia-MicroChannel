<?php
/**
 * 扫描同源服务端数据库目录
 * GET
 */

require_once __DIR__ . '/auth_helper.php';

requireView();

$baseDir = CHANNEL_DB_BASE_DIR;
if (!$baseDir || !is_dir($baseDir)) {
    jsonResponse(5001, '数据库目录不存在或未配置');
}

$files = [];
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $file) {
    if ($file->isFile() && strtolower($file->getExtension()) === 'db') {
        $relativePath = str_replace('\\', '/', substr($file->getPathname(), strlen($baseDir) + 1));
        $files[] = [
            'name' => $file->getFilename(),
            'path' => $relativePath,
            'size' => $file->getSize(),
            'mtime' => date('Y-m-d H:i:s', $file->getMTime())
        ];
    }
}

usort($files, function ($a, $b) { return strcmp($a['name'], $b['name']); });

jsonResponse(0, 'success', ['files' => $files]);
