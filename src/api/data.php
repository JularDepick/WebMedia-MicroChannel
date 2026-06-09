<?php
/**
 * 统一数据接口
 *
 * GET  ?dbPath=&db=xxx&min=1&max=100
 *   → 返回 { stats: [{id,views,likes,favorites},...], extra: [{id,downloads,shares,blocks},...] }
 *
 * POST { dbPath, db, table, action, id }
 *   table: "stats" / "extra"
 *   stats  action: "view" / "like" / "favorite"
 *   extra  action: "download" / "share" / "block"
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

// 跨域配置：false=同源策略（默认），true=允许跨域
$ALLOW_CORS = false;

if ($ALLOW_CORS) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

try {
    if (!class_exists('SQLite3')) {
        throw new Exception('SQLite3 extension not loaded on this PHP installation');
    }

    require_once __DIR__ . '/db.php';

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $dbPath = isset($_GET['dbPath']) ? $_GET['dbPath'] : '';
        $db     = isset($_GET['db'])     ? $_GET['db']     : 'media-cls0.db';
        $min    = isset($_GET['min'])    ? intval($_GET['min']) : 0;
        $max    = isset($_GET['max'])    ? min(intval($_GET['max']), 10000) : 0;
        $min    = min($min, 10000);

        initDB($db, $dbPath);
        $conn = getDB($db, $dbPath);

        // 数据库最大行数上限
        $MAX_ROWS = 100000;

        if ($min > 0 && $max >= $min) {
            // 限制上限，必要时扩容
            $maxExisting = 0;
            $r = $conn->query('SELECT MAX(media_id) AS m FROM media_stats');
            if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); if ($rr && $rr['m'] > $maxExisting) $maxExisting = $rr['m']; }
            $r = $conn->query('SELECT MAX(media_id) AS m FROM media_extra');
            if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); if ($rr && $rr['m'] > $maxExisting) $maxExisting = $rr['m']; }

            if ($max > $MAX_ROWS) $max = $MAX_ROWS;
            if ($min > $max) $min = $max;

            $expandTo = ($max > $maxExisting) ? $max : 0;

            if ($expandTo > 0) {
                $existingStats = [];
                $result = $conn->query('SELECT media_id FROM media_stats');
                while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                    $existingStats[$row['media_id']] = true;
                }
                $stmt = $conn->prepare('INSERT OR IGNORE INTO media_stats (media_id, views, likes, favorites) VALUES (:id, 0, 0, 0)');
                for ($i = $maxExisting + 1; $i <= $expandTo; $i++) {
                    $stmt->bindValue(':id', $i, SQLITE3_INTEGER);
                    $stmt->execute();
                }

                $existingExtra = [];
                $result = $conn->query('SELECT media_id FROM media_extra');
                while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                    $existingExtra[$row['media_id']] = true;
                }
                $stmt2 = $conn->prepare('INSERT OR IGNORE INTO media_extra (media_id, downloads, shares, blocks) VALUES (:id, 0, 0, 0)');
                for ($i = $maxExisting + 1; $i <= $expandTo; $i++) {
                    $stmt2->bindValue(':id', $i, SQLITE3_INTEGER);
                    $stmt2->execute();
                }
            }
        }

        $stats = [];
        $whereClause = ($min > 0 && $max >= $min) ? sprintf(' WHERE media_id BETWEEN %d AND %d', $min, $max) : '';
        $result = $conn->query('SELECT media_id AS id, views, likes, favorites FROM media_stats' . $whereClause);
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $stats[] = $row;
        }

        $extra = [];
        $result = $conn->query('SELECT media_id AS id, downloads, shares, blocks FROM media_extra' . $whereClause);
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $extra[] = $row;
        }

        $conn->close();
        echo json_encode(['stats' => $stats, 'extra' => $extra]);
        exit;
    }

    if ($method === 'POST') {
        $input  = json_decode(file_get_contents('php://input'), true);
        $dbPath = isset($input['dbPath']) ? $input['dbPath'] : '';
        $db     = isset($input['db'])     ? $input['db']     : 'media-cls0.db';
        $table  = isset($input['table'])  ? $input['table']  : 'stats';
        $action = isset($input['action']) ? $input['action'] : '';
        $id     = isset($input['id'])     ? intval($input['id']) : 0;

        // getData: 通过POST获取数据（避免GET参数被浏览器捕获）
        if ($action === 'getData') {
            $min = isset($input['min']) ? min(intval($input['min']), 10000) : 0;
            $max = isset($input['max']) ? min(intval($input['max']), 10000) : 0;

            initDB($db, $dbPath);
            $conn = getDB($db, $dbPath);

            // 数据库最大行数上限
            $MAX_ROWS = 100000;

            if ($min > 0 && $max >= $min) {
                // 限制上限，必要时扩容
                $maxExisting = 0;
                $r = $conn->query('SELECT MAX(media_id) AS m FROM media_stats');
                if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); if ($rr && $rr['m'] > $maxExisting) $maxExisting = $rr['m']; }
                $r = $conn->query('SELECT MAX(media_id) AS m FROM media_extra');
                if ($r) { $rr = $r->fetchArray(SQLITE3_ASSOC); if ($rr && $rr['m'] > $maxExisting) $maxExisting = $rr['m']; }

                if ($max > $MAX_ROWS) $max = $MAX_ROWS;
                if ($min > $max) $min = $max;

                $expandTo = ($max > $maxExisting) ? $max : 0;

                if ($expandTo > 0) {
                    $existingStats = [];
                    $result = $conn->query('SELECT media_id FROM media_stats');
                    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                        $existingStats[$row['media_id']] = true;
                    }
                    $stmt = $conn->prepare('INSERT OR IGNORE INTO media_stats (media_id, views, likes, favorites) VALUES (:id, 0, 0, 0)');
                    for ($i = $maxExisting + 1; $i <= $expandTo; $i++) {
                        $stmt->bindValue(':id', $i, SQLITE3_INTEGER);
                        $stmt->execute();
                    }

                    $existingExtra = [];
                    $result = $conn->query('SELECT media_id FROM media_extra');
                    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                        $existingExtra[$row['media_id']] = true;
                    }
                    $stmt2 = $conn->prepare('INSERT OR IGNORE INTO media_extra (media_id, downloads, shares, blocks) VALUES (:id, 0, 0, 0)');
                    for ($i = $maxExisting + 1; $i <= $expandTo; $i++) {
                        $stmt2->bindValue(':id', $i, SQLITE3_INTEGER);
                        $stmt2->execute();
                    }
                }
            }

            $stats = [];
            $whereClause = ($min > 0 && $max >= $min) ? sprintf(' WHERE media_id BETWEEN %d AND %d', $min, $max) : '';
            $result = $conn->query('SELECT media_id AS id, views, likes, favorites FROM media_stats' . $whereClause);
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $stats[] = $row;
            }

            $extra = [];
            $result = $conn->query('SELECT media_id AS id, downloads, shares, blocks FROM media_extra' . $whereClause);
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $extra[] = $row;
            }

            $conn->close();
            echo json_encode(['stats' => $stats, 'extra' => $extra]);
            exit;
        }

        $statsCols = ['view' => 'views', 'like' => 'likes', 'favorite' => 'favorites'];
        $extraCols = ['download' => 'downloads', 'share' => 'shares', 'block' => 'blocks'];

        if ($id < 1) {
            echo json_encode(['ok' => false, 'error' => 'invalid id']);
            exit;
        }

        if ($table === 'stats' && isset($statsCols[$action])) {
            $col = $statsCols[$action];
            $tbl = 'media_stats';
        } elseif ($table === 'extra' && isset($extraCols[$action])) {
            $col = $extraCols[$action];
            $tbl = 'media_extra';
        } else {
            echo json_encode(['ok' => false, 'error' => 'invalid table/action']);
            exit;
        }

        initDB($db, $dbPath);
        $conn = getDB($db, $dbPath);

        $stmt = $conn->prepare("INSERT INTO $tbl (media_id, $col) VALUES (:id, 1)
            ON CONFLICT(media_id) DO UPDATE SET $col = $col + 1");
        $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
        $stmt->execute();

        $stmt2 = $conn->prepare("SELECT $col FROM $tbl WHERE media_id = :id");
        $stmt2->bindValue(':id', $id, SQLITE3_INTEGER);
        $result = $stmt2->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);

        $conn->close();

        echo json_encode([
            'ok' => true,
            'id' => $id,
            'count' => $row ? $row[$col] : 1
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'unsupported method']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'internal server error']);
}
