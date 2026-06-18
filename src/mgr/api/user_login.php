<?php
/**
 * 用户登录
 * POST { username, password }
 */

require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/.config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(1001, '请求方法不允许');
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($username) || empty($password)) {
    jsonResponse(1005, '用户名和密码不能为空');
}

if (!isset(ADMIN_ACCOUNTS[$username])) {
    jsonResponse(2001, '用户名或密码错误');
}

$hash = hash('sha512', PASSWORD_SALT . '|' . $username . '|' . $password);
if ($hash !== ADMIN_ACCOUNTS[$username]) {
    jsonResponse(2001, '用户名或密码错误');
}

$deadline = date('Y-m-d H:i:s', time() + TOKEN_TTL);
$token = hash('sha512', $username . '|' . time() . '|' . $deadline . '|' . bin2hex(random_bytes(16)));

$db = getAuthDb();
$stmt = $db->prepare('INSERT OR REPLACE INTO tokens (username, deadline, token) VALUES (:user, :deadline, :token)');
$stmt->bindValue(':user', $username, SQLITE3_TEXT);
$stmt->bindValue(':deadline', $deadline, SQLITE3_TEXT);
$stmt->bindValue(':token', $token, SQLITE3_TEXT);
$stmt->execute();
$db->close();

jsonResponse(0, '登录成功', [
    'token' => $token,
    'deadline' => $deadline,
    'username' => $username
]);
