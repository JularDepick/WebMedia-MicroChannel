<?php
/**
 * 用户登出
 * POST (需Bearer Token)
 */

require_once __DIR__ . '/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(1001, '请求方法不允许');
}

$username = requireAuth();

$db = getAuthDb();
$stmt = $db->prepare('DELETE FROM tokens WHERE username = :user');
$stmt->bindValue(':user', $username, SQLITE3_TEXT);
$stmt->execute();
$db->close();

jsonResponse(0, '已登出');
