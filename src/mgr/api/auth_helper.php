<?php
/**
 * 认证与权限守卫
 */

require_once __DIR__ . '/.config.php';
require_once __DIR__ . '/account.php';
require_once __DIR__ . '/db_helper.php';

/**
 * 统一JSON响应
 */
function jsonResponse($code, $message, $data = []) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'code' => $code,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 获取用户权限编码
 */
function getPermission($username) {
    return USER_PERMISSIONS[$username] ?? null;
}

function canCreate($username) {
    $perm = getPermission($username);
    return $perm !== null && $perm[0] === '1';
}

function canDelete($username) {
    $perm = getPermission($username);
    return $perm !== null && $perm[1] === '1';
}

function canView($username) {
    $perm = getPermission($username);
    return $perm !== null && $perm[2] === '1';
}

function canUpdate($username) {
    $perm = getPermission($username);
    return $perm !== null && $perm[3] === '1';
}

/**
 * 从Header提取Bearer Token
 */
function extractToken() {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return trim($m[1]);
    }
    return null;
}

/**
 * 验证Token有效性，返回用户名或false
 */
function verifyToken() {
    $token = extractToken();
    if (!$token) return false;

    $db = getAuthDb();
    $stmt = $db->prepare('SELECT username, deadline FROM tokens WHERE token = :token');
    $stmt->bindValue(':token', $token, SQLITE3_TEXT);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $db->close();

    if (!$row) return false;
    if (strtotime($row['deadline']) < time()) return false;
    return $row['username'];
}

/**
 * 要求认证
 */
function requireAuth() {
    $username = verifyToken();
    if ($username === false) {
        jsonResponse(2003, '未授权，请先登录');
    }
    return $username;
}

function requireView() {
    $username = requireAuth();
    if (!canView($username)) {
        jsonResponse(3002, '权限不足');
    }
    return $username;
}

function requireCreate() {
    $username = requireAuth();
    if (!canCreate($username)) {
        jsonResponse(3002, '权限不足');
    }
    return $username;
}

function requireUpdate() {
    $username = requireAuth();
    if (!canUpdate($username)) {
        jsonResponse(3002, '权限不足');
    }
    return $username;
}

function requireDelete() {
    $username = requireAuth();
    if (!canDelete($username)) {
        jsonResponse(3002, '权限不足');
    }
    return $username;
}
