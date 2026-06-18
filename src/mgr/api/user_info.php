<?php
/**
 * 获取当前用户信息和权限
 * GET (需Bearer Token)
 */

require_once __DIR__ . '/auth_helper.php';

$username = requireView();

jsonResponse(0, 'success', [
    'username' => $username,
    'permission' => getPermission($username)
]);
