<?php
/**
 * 账户硬编码配置
 */

/* 密码哈希盐值 */
define('PASSWORD_SALT', 'wmmc-mgr-2026');

/* 管理员账户：用户名 => 密码哈希结果（使用 pwd.html 生成） */
define('ADMIN_ACCOUNTS', [
    'root' => '95318fb39d657f4499bf5e9d1a7d79726821deb10138d0a4da3919c04eb24971dddd3a0bcb643d27283417d749111fcd53a6beeadb77ea36414cd60510c30048',
    'xjh' => 'f4c66c95ddf3c4df084989d9e23c3b655e6f61a0624a0b17353e64dc4d597e46d625f31162fc95ef69c116eedd40992cba93aa0e0017395c37fae38e738f5d5b'
]);

/* 权限映射：用户名 => 4位权限编码 (C D R U) */
define('USER_PERMISSIONS', [
    'root' => '1111',
    'xjh' => '1111'
]);
