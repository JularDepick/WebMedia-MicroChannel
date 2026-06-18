<?php
/**
 * 从服务端 main.js 读取频道配置
 * 逐个提取字段，避免复杂正则回溯
 */

require_once __DIR__ . '/auth_helper.php';

requireView();

$mainJsPath = realpath(__DIR__ . '/../../main.js');
if (!$mainJsPath || !file_exists($mainJsPath)) {
    jsonResponse(5001, '服务端 main.js 不存在');
}

$content = file_get_contents($mainJsPath);

/* 定位 CHANNEL_CONFIGS 数组 */
$start = strpos($content, 'const CHANNEL_CONFIGS = [');
if ($start === false) {
    jsonResponse(5001, '未找到 CHANNEL_CONFIGS');
}

/* 提取每个频道对象块（以 { 开始，以 } 结束） */
$channels = [];
$arrEnd = strpos($content, '];', $start);
$searchFrom = $start;

while (true) {
    $objStart = strpos($content, '{', $searchFrom);
    if ($objStart === false || $objStart > $arrEnd) break;

    /* 找到匹配的 }（跳过字符串内的括号） */
    $depth = 0;
    $inStr = false;
    $escChar = false;
    $strChar = '';
    $objEnd = -1;

    for ($i = $objStart; $i < strlen($content); $i++) {
        $c = $content[$i];
        if ($escChar) { $escChar = false; continue; }
        if ($c === '\\') { $escChar = true; continue; }
        if ($inStr) { if ($c === $strChar) $inStr = false; continue; }
        if ($c === "'" || $c === '"') { $inStr = true; $strChar = $c; continue; }
        if ($c === '{') $depth++;
        if ($c === '}') { $depth--; if ($depth === 0) { $objEnd = $i; break; } }
    }

    if ($objEnd === -1) break;

    $objStr = substr($content, $objStart, $objEnd - $objStart + 1);

    /* 检查是否包含频道配置特征字段 */
    if (strpos($objStr, 'dbName') === false) {
        $searchFrom = $objEnd + 1;
        continue;
    }

    /* 提取简单字段 */
    $ch = [];
    $fields = ['id', 'name', 'dbPath', 'dbName', 'mediaType', 'mediaPrefix', 'mediaExt'];
    foreach ($fields as $key) {
        /* 匹配 key: 'value' 或 key: "value" */
        if (preg_match("/['\"]?" . preg_quote($key, '/') . "['\"]?\s*:\s*['\"]([^'\"]*)['\"]/", $objStr, $m)) {
            $ch[$key] = $m[1];
        } else {
            $ch[$key] = '';
        }
    }

    /* 提取数字字段 */
    $numFields = ['mediaIdMin', 'mediaIdMax', 'mediaIdLength'];
    foreach ($numFields as $key) {
        if (preg_match("/['\"]?" . preg_quote($key, '/') . "['\"]?\s*:\s*(\d+)/", $objStr, $m)) {
            $ch[$key] = intval($m[1]);
        } else {
            $ch[$key] = 0;
        }
    }

    $channels[] = $ch;
    $searchFrom = $objEnd + 1;
}

jsonResponse(0, 'success', ['channels' => $channels]);
