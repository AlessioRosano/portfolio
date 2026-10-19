<?php
/* ==========================================================================
   Gemeinsame Basis für CMS, Inhalte und Galerien.

   Code (dieser Ordner, HTML, CSS, JS) kommt per Git auf den Server.
   Inhalte entstehen nur auf dem Server und werden von Git nie angefasst:
     content/   öffentlich — data.json und Projektbilder
     storage/   gesperrt   — Galerien, Backups, Login-Sperren
   ========================================================================== */

declare(strict_types=1);

const ROOT = __DIR__ . '/..';
const CONTENT = ROOT . '/content';
const STORAGE = ROOT . '/storage';
const GALLERIES = STORAGE . '/galleries';

// Erlaubte Dateien: Endung → Content-Type, mit dem sie ausgeliefert werden.
// Der echte Inhalt muss ebenfalls passen (MIME_OK) — sonst wird die Datei abgelehnt.
// Bewusst kein SVG/HTML: die könnten Script enthalten.
const IMAGE_TYPES = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
const GALLERY_TYPES = IMAGE_TYPES + [
    'heic' => 'image/heic', 'mp4' => 'video/mp4', 'mov' => 'video/quicktime', 'm4v' => 'video/x-m4v', 'webm' => 'video/webm',
];
const MIME_OK = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm', 'video/x-matroska', 'application/mp4',
];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_GALLERY_BYTES = 8 * 1024 * 1024 * 1024;
const SESSION_IDLE = 8 * 3600;

// Grösstes Upload-Stück, das der Server annimmt (php.ini: upload_max_filesize / post_max_size)
function uploadLimit(): int
{
    $bytes = function (string $v): int {
        $n = (int) $v;
        return match (strtolower(substr(trim($v), -1))) { 'g' => $n << 30, 'm' => $n << 20, 'k' => $n << 10, default => $n };
    };
    return min($bytes((string) ini_get('upload_max_filesize')), $bytes((string) ini_get('post_max_size')));
}

function config(): array
{
    static $config = null;
    $file = __DIR__ . '/config.local.php';
    return $config ??= is_file($file) ? (array) require $file : [];
}

/* ── Ordner beim ersten Aufruf anlegen ──────────────────────── */
function ensureStorage(): void
{
    foreach ([CONTENT . '/img', GALLERIES, STORAGE . '/tmp', STORAGE . '/backups'] as $dir) {
        if (!is_dir($dir)) mkdir($dir, 0755, true);
    }
    if (!is_file(STORAGE . '/.htaccess')) file_put_contents(STORAGE . '/.htaccess', "Require all denied\n");
    // Keine Ordner-Listen, auch falls der Server sie erlauben würde
    foreach ([CONTENT, CONTENT . '/img', STORAGE] as $dir) if (!is_file("$dir/index.html")) touch("$dir/index.html");
    // Hochgeladene Dateien dürfen nie als Script laufen
    if (!is_file(CONTENT . '/.htaccess')) {
        file_put_contents(CONTENT . '/.htaccess', "<FilesMatch \"\\.(php\\d?|phtml|phar|pl|py|cgi|sh|htaccess)$\">\n  Require all denied\n</FilesMatch>\n");
    }
    // Erster Start: Inhalte aus setup/ übernehmen
    if (!is_file(CONTENT . '/data.json')) {
        copy(ROOT . '/setup/data.json', CONTENT . '/data.json');
        foreach (glob(ROOT . '/setup/img/*') ?: [] as $file) copy($file, CONTENT . '/img/' . basename($file));
    }
    migrateContent();
}

// Einmalige Umstellung älterer Inhalte (erkennbar am fehlenden «Wer»-Bereich):
// neue Disziplinen Video, Branding/Web, Kampagnen, Architektur und der Wer-Bereich fürs CMS.
// Vorher wird ein Backup in storage/backups/ abgelegt.
function migrateContent(): void
{
    $file = CONTENT . '/data.json';
    $d = readJson($file, null);
    if (!is_array($d) || isset($d['ABOUT'])) return;
    $lock = fopen(STORAGE . '/migrate.lock', 'c');
    flock($lock, LOCK_EX);
    $d = readJson($file, null);
    if (!is_array($d) || isset($d['ABOUT'])) return;   // ein paralleler Aufruf war schneller

    // Während eines Deploys kann setup/ noch alt sein — dann erst beim nächsten Aufruf umstellen
    $setup = readJson(ROOT . '/setup/data.json');
    if (!is_array($setup['ABOUT'] ?? null)) return;
    copy($file, STORAGE . '/backups/data-vor-umstellung-' . date('Ymd-His') . '.json');

    $d['CATS'] = $setup['CATS'];
    $old = array_column($d['DISCIPLINES'] ?? [], null, 'cat');
    $new = array_column($setup['DISCIPLINES'], null, 'cat');
    // Bestehende Texte behalten; Branding heisst neu Branding/Web, Kampagnen ersetzt Gestaltung
    $d['DISCIPLINES'] = array_map(fn ($cat) => $old[$cat] ?? $new[$cat], array_keys($d['CATS']));
    foreach ($d['PROJECTS'] as &$p) {
        if (($p['cat'] ?? '') === 'gestaltung' || !isset($d['CATS'][$p['cat'] ?? ''])) $p['cat'] = 'kampagnen';
    }
    unset($p);

    $d['ABOUT'] = $setup['ABOUT'];
    foreach (glob(ROOT . '/setup/img/*') ?: [] as $img) {
        if (!is_file(CONTENT . '/img/' . basename($img))) copy($img, CONTENT . '/img/' . basename($img));
    }
    $d['SOCIAL'] ??= [];
    writeJson($file, $d);
    flock($lock, LOCK_UN);
}

/* ── JSON-Dateien und Antworten ─────────────────────────────── */
function readJson(string $file, mixed $default = []): mixed
{
    if (!is_file($file)) return $default;
    return json_decode((string) file_get_contents($file), true) ?? $default;
}

// Erst in eine Temp-Datei, dann umbenennen — so ist eine Datei nie halb geschrieben
function writeJson(string $file, mixed $data): void
{
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, $file);
}

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never
{
    respond(['error' => $message], $status);
}

function jsonBody(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

/* ── Session, CSRF, Login ───────────────────────────────────── */
function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('ar_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => isHttps(),
    ]);
    ini_set('session.use_strict_mode', '1');   // keine vom Angreifer vorgegebenen Sitzungs-IDs
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function isHttps(): bool
{
    return ($_SERVER['HTTPS'] ?? 'off') !== 'off' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function csrfToken(): string
{
    startSession();
    return $_SESSION['csrf'];
}

function checkCsrf(?string $token = null): void
{
    $token ??= $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!hash_equals(csrfToken(), (string) $token)) fail('Sitzung abgelaufen — bitte Seite neu laden.', 403);
}

function isAdmin(): bool
{
    startSession();
    if (empty($_SESSION['admin']) || time() - ($_SESSION['seen'] ?? 0) > SESSION_IDLE) return false;
    $_SESSION['seen'] = time();
    return true;
}

function requireAdmin(): void
{
    if (!isAdmin()) fail('Nicht angemeldet', 401);
}

/* ── Sperre nach zu vielen Fehlversuchen ────────────────────── */
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60;

// Zählt Fehlversuche pro Zweck und IP im Zeitfenster; mit $add wird einer dazugezählt
function failedAttempts(string $scope, bool $add = false): int
{
    $file = STORAGE . '/attempts.json';
    $key = hash('sha256', $scope . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
    $all = readJson($file);
    $since = time() - ATTEMPT_WINDOW;
    foreach ($all as $k => $times) $all[$k] = array_values(array_filter($times, fn ($t) => $t > $since));
    if ($add) $all[$key][] = time();
    writeJson($file, array_filter($all));
    return count($all[$key] ?? []);
}

function guardAttempts(string $scope): void
{
    if (failedAttempts($scope) >= MAX_ATTEMPTS) fail('Zu viele Fehlversuche — bitte in 15 Minuten erneut versuchen.', 429);
}

function clearAttempts(string $scope): void
{
    $file = STORAGE . '/attempts.json';
    $all = readJson($file);
    unset($all[hash('sha256', $scope . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''))]);
    writeJson($file, $all);
}

/* ── Dateien ────────────────────────────────────────────────── */
function slugify(string $s, int $max = 40): string
{
    $s = strtr(mb_strtolower($s), ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'é' => 'e', 'è' => 'e', 'à' => 'a']);
    $s = trim(substr((string) preg_replace('/[^a-z0-9]+/', '-', $s), 0, $max), '-');
    return $s !== '' ? $s : 'datei';
}

function extensionOf(string $name): string
{
    return str_replace('jpeg', 'jpg', strtolower(pathinfo($name, PATHINFO_EXTENSION)));
}

// Prüft den echten Inhalt, nicht nur die Endung
function contentAllowed(string $path): bool
{
    return in_array((string) (new finfo(FILEINFO_MIME_TYPE))->file($path), MIME_OK, true);
}

function uniqueName(string $dir, string $base, string $ext): string
{
    $name = "$base.$ext";
    for ($n = 2; is_file("$dir/$name"); $n++) $name = "$base-$n.$ext";
    return $name;
}

/* ── Galerien ───────────────────────────────────────────────── */
function galleries(): array
{
    return readJson(STORAGE . '/galleries.json');
}

function saveGalleries(array $all): void
{
    writeJson(STORAGE . '/galleries.json', $all);
}

function validSlug(string $slug): bool
{
    return (bool) preg_match('/^[a-z0-9-]{1,60}$/', $slug);
}

function galleryDir(string $slug): string
{
    return GALLERIES . '/' . $slug;
}

function galleryExpired(array $g): bool
{
    return !empty($g['expires']) && strtotime($g['expires'] . ' 23:59:59') < time();
}

// Wer darf eine Galerie sehen? Wer das Passwort eingegeben hat — und du im CMS
function canViewGallery(string $slug): bool
{
    startSession();
    return isAdmin() || !empty($_SESSION['galleries'][$slug]);
}

function galleryFiles(string $slug): array
{
    $dir = galleryDir($slug);
    $files = [];
    foreach (glob("$dir/*") ?: [] as $path) {
        if (!is_file($path)) continue;
        $name = basename($path);
        $files[] = [
            'name' => $name,
            'size' => filesize($path),
            'kind' => str_starts_with(GALLERY_TYPES[extensionOf($name)] ?? '', 'video/') ? 'video' : 'image',
            'thumb' => isset(IMAGE_TYPES[extensionOf($name)]) || is_file("$dir/thumbs/$name.jpg"),
        ];
    }
    usort($files, fn ($a, $b) => strnatcasecmp($a['name'], $b['name']));
    return $files;
}

/* ── Bild-Proxies: kleinere Versionen fürs schnelle Laden ─────── */
// Alles mit GD (bei Infomaniak vorhanden). Was nicht klappt, wird übersprungen — dann gilt das Original.

const VARIANT_WIDTHS = [480, 960, 1600, 2400];   // Portfolio-Bilder, als WebP
const MAX_DECODE_PIXELS = 40_000_000;            // grösser braucht zu viel Arbeitsspeicher

function loadImage(string $path): ?GdImage
{
    if (!function_exists('imagecreatefromstring')) return null;
    $info = @getimagesize($path);
    if (!$info || $info[0] * $info[1] > MAX_DECODE_PIXELS) return null;
    $img = @imagecreatefromstring((string) file_get_contents($path));
    if (!$img) return null;
    imagepalettetotruecolor($img);
    // Handy-Fotos speichern die Drehung nur als Info (EXIF) — hier wirklich drehen
    $orientation = $info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data') ? (@exif_read_data($path)['Orientation'] ?? 1) : 1;
    $rotate = [3 => 180, 6 => -90, 8 => 90][$orientation] ?? 0;
    return $rotate ? imagerotate($img, $rotate, 0) : $img;
}

function scaledTo(GdImage $img, int $maxSide): GdImage
{
    $w = imagesx($img);
    $h = imagesy($img);
    $scale = $maxSide / max($w, $h);
    return $scale >= 1 ? $img : imagescale($img, max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale)));
}

// Galerie: Vorschau für die Übersicht (800 px) bzw. die Grossansicht (2000 px), als JPG in thumbs/
function galleryProxy(string $path, string $kind): ?string
{
    $dest = dirname($path) . '/thumbs/' . basename($path) . ($kind === 'preview' ? '.preview.jpg' : '.jpg');
    if (is_file($dest)) return $dest;
    if (!isset(IMAGE_TYPES[extensionOf($path)]) || !($img = loadImage($path))) return null;
    if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755);
    imagejpeg(scaledTo($img, $kind === 'preview' ? 2000 : 800), $dest, $kind === 'preview' ? 82 : 78);
    return $dest;
}

// Portfolio: WebP-Varianten neben dem Original, z. B. bild.jpg → bild.w480.webp, bild.w960.webp …
function variantFile(string $name, int $width): string
{
    return preg_replace('/\.\w+$/', ".w$width.webp", $name);
}

function makeVariants(string $path): ?array
{
    if (!function_exists('imagewebp') || extensionOf($path) === 'gif' || !($img = loadImage($path))) return null;
    $w = imagesx($img);
    $h = imagesy($img);
    $widths = array_values(array_unique([...array_filter(VARIANT_WIDTHS, fn ($x) => $x < $w), min($w, max(VARIANT_WIDTHS))]));
    foreach ($widths as $width) {
        $out = $width === $w ? $img : imagescale($img, $width, max(1, (int) round($h * $width / $w)));
        imagesavealpha($out, true);
        imagewebp($out, dirname($path) . '/' . variantFile(basename($path), $width), 80);
    }
    return ['w' => $w, 'h' => $h, 'sizes' => $widths];
}

// Liste aller Varianten (storage/variants.json). Fehlende werden nachgeholt — pro Aufruf nur so viele,
// wie in $budget Sekunden passen, damit die Seite nie spürbar wartet.
function imageVariants(float $budget = 1.5): array
{
    $file = STORAGE . '/variants.json';
    $map = readJson($file);
    $start = microtime(true);
    $changed = false;
    foreach (glob(CONTENT . '/img/*') ?: [] as $path) {
        $name = basename($path);
        if (isset($map[$name]) || !preg_match('/^[a-z0-9-]+\.(jpg|png|webp)$/', $name)) continue;
        if (microtime(true) - $start > $budget) break;
        $map[$name] = makeVariants($path) ?? false;   // false: nicht möglich, nicht nochmals versuchen
        $changed = true;
    }
    if ($changed) writeJson($file, $map);
    return array_filter($map);
}

/* ── Dateien ausliefern (mit Range für Video-Spulen) ────────── */
function sendFile(string $path, string $downloadName, bool $attachment, ?string $type = null): never
{
    set_time_limit(0);
    session_write_close();   // lange Downloads blockieren sonst die Sitzung
    while (ob_get_level()) ob_end_clean();

    $size = filesize($path);
    $start = 0;
    $end = $size - 1;
    header('Accept-Ranges: bytes');
    if (preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'] ?? '', $m)) {
        if ($m[1] === '') {
            $start = max(0, $size - (int) $m[2]);
        } else {
            $start = (int) $m[1];
            if ($m[2] !== '') $end = min((int) $m[2], $size - 1);
        }
        if ($start > $end) {
            http_response_code(416);
            header("Content-Range: bytes */$size");
            exit;
        }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }
    // Typ kommt aus der Endungsliste, nie aus dem Dateiinhalt; die Sandbox verhindert jedes Script
    header('Content-Type: ' . ($type ?? GALLERY_TYPES[extensionOf($path)] ?? 'application/octet-stream'));
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
    header('Content-Length: ' . ($end - $start + 1));
    header('Content-Disposition: ' . ($attachment ? 'attachment' : 'inline') . "; filename*=UTF-8''" . rawurlencode($downloadName));
    header('Cache-Control: private, max-age=3600');
    header('X-Content-Type-Options: nosniff');

    $fp = fopen($path, 'rb');
    fseek($fp, $start);
    for ($left = $end - $start + 1; $left > 0 && !feof($fp) && !connection_aborted(); $left -= strlen($chunk)) {
        $chunk = (string) fread($fp, min(1 << 20, $left));
        echo $chunk;
        flush();
    }
    fclose($fp);
    exit;
}
