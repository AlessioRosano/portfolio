<?php
// Zählpunkt für die eigene Statistik: js/main.js meldet hier jeden Seitenaufruf (per sendBeacon).
// Angenommen werden nur die Seiten der Website; gespeichert nur Zahlen (siehe api/stats.php).
require __DIR__ . '/stats.php';

http_response_code(204);
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !shouldCount()) exit;

$in = json_decode((string) file_get_contents('php://input', false, null, 0, 2048), true);
$path = (string) ($in['p'] ?? '');
if (!preg_match('#^/((index\.html)?|arbeiten\.html|disziplin\.html\?d=[a-z0-9-]{1,60}|projekt\.html\?p=[a-z0-9-]{1,60})$#', $path)) exit;
if ($path === '/index.html') $path = '/';

// Herkunft nur als Domain, die eigene Website zählt nicht als Herkunft
$ref = strtolower((string) parse_url((string) ($in['r'] ?? ''), PHP_URL_HOST));
$ref = preg_replace('/^(www\.|m\.|l\.|lm\.)/', '', $ref);
$own = preg_replace(['/^www\./', '/:\d+$/'], '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')));
if (!preg_match('/^[a-z0-9.-]{1,80}$/', $ref) || $ref === $own) $ref = '';

ensureStorage();
countPageView($path, $ref, deviceOf((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), !empty($in['t'])));
