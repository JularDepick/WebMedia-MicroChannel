<?php
/**
 * 管理端站点配置常量
 */

/* Token 有效期（秒） */
define('TOKEN_TTL', 86400);

/* 允许的频道数据库目录（相对于服务端api目录） */
define('CHANNEL_DB_BASE_DIR', realpath(__DIR__ . '/../../api/sqlitedb'));
