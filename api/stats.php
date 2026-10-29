<?php
/* ==========================================================================
   Eigene, datensparsame Statistik (Tab «Statistik» im CMS).
   Keine Cookies, keine IP-Adressen, kein fremder Dienst. Gespeichert werden nur Zahlen pro Tag
   in storage/stats/ (von aussen gesperrt). Besucher:innen zählt ein Code aus IP, Browser und
   einem täglich neuen Zufallswert: Er gilt nur für einen Tag, niemand ist über Tage verfolgbar.
   ========================================================================== */

require_once __DIR__ . '/lib.php';

const STATS = STORAGE . '/stats';
const STATS_MAX_KEYS = 300;   // höchstens so viele verschiedene Seiten bzw. Herkünfte pro Tag (Schutz vor Müll)
const BOT_PATTERN = '/bot|crawl|spider|slurp|preview|fetch|monitor|headless|python|curl|wget|httpclient|facebookexternalhit|lighthouse/i';

function statsDir(): string
{
    if (!is_dir(STATS)) mkdir(STATS, 0755, true);
    return STATS;
}

// JSON-Datei lesen, ändern und zurückschreiben, gesperrt gegen gleichzeitige Zugriffe
function statsUpdate(string $file, callable $change): void
{
    $fh = fopen($file, 'c+');
    if (!$fh) return;
    flock($fh, LOCK_EX);
    $data = json_decode((string) stream_get_contents($fh), true) ?: [];
    $data = $change($data);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

// Zählt nicht: Bots, Vorschau-Abrufe und wer im CMS angemeldet ist (eigene Besuche)
function shouldCount(): bool
{
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($ua === '' || preg_match(BOT_PATTERN, $ua)) return false;
    if (isset($_COOKIE['ar_session']) && isAdmin()) return false;
    return true;
}

// Tages-Code für eine Person: ohne IP zu speichern, nur heute gültig. true = heute zum ersten Mal da.
function firstVisitToday(): bool
{
    $dir = statsDir();
    $day = date('Y-m-d');
    $saltFile = "$dir/salt-$day";
    if (!is_file($saltFile)) {
        file_put_contents($saltFile, bin2hex(random_bytes(16)), LOCK_EX);
        // Codes und Zufallswerte von früheren Tagen löschen
        foreach (glob("$dir/{salt,seen}-*", GLOB_BRACE) ?: [] as $old) if (!str_contains($old, $day)) @unlink($old);
    }
    $code = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . file_get_contents($saltFile)), 0, 16);
    $seen = "$dir/seen-$day";
    if (is_file($seen) && str_contains((string) file_get_contents($seen), $code)) return false;
    file_put_contents($seen, "$code\n", FILE_APPEND | LOCK_EX);
    return true;
}

// Gerät aus der Browser-Kennung: Tablet (iPad, Android ohne «Mobile»), Handy oder Desktop.
// Neuere iPads melden sich wie ein Mac; die erkennt die Website am Touchscreen und schickt «touch» mit.
function deviceOf(string $ua, bool $touch): string
{
    if (preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $ua) || ($touch && preg_match('/Macintosh/', $ua))) return 'tablet';
    if (preg_match('/Mobi|iPhone|iPod|Android/i', $ua)) return 'mobile';
    return 'desktop';
}

// Einen Seitenaufruf zählen (Pfad wie «/projekt.html?p=…», Herkunft nur als Domain, Gerät als Art)
function countPageView(string $path, string $refHost, string $device): void
{
    $first = firstVisitToday();
    $day = date('Y-m-d');
    statsUpdate(statsDir() . '/visits-' . date('Y-m') . '.json', function (array $d) use ($day, $path, $refHost, $device, $first) {
        $t = $d[$day] ?? ['v' => 0, 'u' => 0, 'pages' => [], 'refs' => []];
        $t['v']++;
        $t['dev'][$device] = ($t['dev'][$device] ?? 0) + 1;
        if ($first) $t['u']++;
        if (isset($t['pages'][$path]) || count($t['pages']) < STATS_MAX_KEYS) $t['pages'][$path] = ($t['pages'][$path] ?? 0) + 1;
        if ($refHost !== '' && (isset($t['refs'][$refHost]) || count($t['refs']) < STATS_MAX_KEYS)) $t['refs'][$refHost] = ($t['refs'][$refHost] ?? 0) + 1;
        $d[$day] = $t;
        return $d;
    });
}

// Galerie: geöffnet (nach dem Passwort), Datei heruntergeladen oder ZIP. Die letzten 300 Downloads mit Zeitpunkt.
function countGallery(string $slug, string $event, string $file = ''): void
{
    if (!shouldCount()) return;
    statsUpdate(statsDir() . '/galleries.json', function (array $d) use ($slug, $event, $file) {
        $g = $d['totals'][$slug] ?? ['views' => 0, 'files' => 0, 'zips' => 0];
        $g[$event === 'view' ? 'views' : ($event === 'zip' ? 'zips' : 'files')]++;
        $d['totals'][$slug] = $g;
        if ($event !== 'view') {
            $d['log'] = array_slice(array_merge([['t' => date('c'), 'g' => $slug, 'f' => $file, 'zip' => $event === 'zip']], $d['log'] ?? []), 0, 300);
        }
        return $d;
    });
}

/* ── Auswertung für das CMS ──────────────────────────────────── */

function visitStats(int $days = 30): array
{
    $byDay = [];
    for ($m = 0; $m < 2; $m++) {   // aktueller und letzter Monat reichen für 30 Tage
        $byDay += readJson(STATS . '/visits-' . date('Y-m', strtotime("first day of -$m month")) . '.json');
    }
    $list = [];
    $pages = $refs = [];
    $devices = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
    for ($i = $days - 1; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i day"));
        $t = $byDay[$date] ?? ['v' => 0, 'u' => 0, 'pages' => [], 'refs' => []];
        $list[] = ['date' => $date, 'views' => $t['v'], 'visitors' => $t['u']];
        foreach ($t['pages'] as $p => $n) $pages[$p] = ($pages[$p] ?? 0) + $n;
        foreach ($t['refs'] as $r => $n) $refs[$r] = ($refs[$r] ?? 0) + $n;
        foreach ($t['dev'] ?? [] as $k => $n) if (isset($devices[$k])) $devices[$k] += $n;
    }
    arsort($pages);
    arsort($refs);
    // Besucher:innen über mehrere Tage sind die Summe der Tageswerte (wer an zwei Tagen kommt, zählt zweimal)
    $total = fn (array $part) => ['views' => array_sum(array_column($part, 'views')), 'visitors' => array_sum(array_column($part, 'visitors'))];
    return [
        'days' => $list,
        'today' => $total(array_slice($list, -1)),
        'week' => $total(array_slice($list, -7)),
        'month' => $total($list),
        'pages' => array_slice($pages, 0, 15, true),
        'refs' => array_slice($refs, 0, 10, true),
        'devices' => $devices,
    ];
}

// Anzahl und Grösse aller Dateien, die zu einem Muster passen
function filesInfo(array $paths): array
{
    $n = $bytes = 0;
    foreach ($paths as $path) if (is_file($path)) { $n++; $bytes += filesize($path); }
    return ['count' => $n, 'bytes' => $bytes];
}

function storageStats(): array
{
    $img = glob(CONTENT . '/img/*.{jpg,png,gif,webp}', GLOB_BRACE) ?: [];
    $variants = array_filter($img, fn ($f) => preg_match('/\.w\d+\.webp$/', $f));
    $films = array_filter($img, fn ($f) => str_starts_with(basename($f), 'film-') && !in_array($f, $variants, true));
    $originals = array_diff($img, $variants, $films);
    $galleries = [];
    $galleryFiles = [];
    $all = galleries();
    foreach (glob(GALLERIES . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
        $slug = basename($dir);
        $files = glob("$dir/*") ?: [];
        $galleryFiles = array_merge($galleryFiles, $files);
        $galleries[] = ['slug' => $slug, 'title' => $all[$slug]['title'] ?? $slug] + filesInfo($files);
    }
    usort($galleries, fn ($a, $b) => $b['bytes'] <=> $a['bytes']);
    return [
        'groups' => [
            ['label' => 'Projektbilder (Originale)', 'note' => 'Hochgeladen im CMS'] + filesInfo($originals),
            ['label' => 'Bildvarianten (WebP)', 'note' => 'Automatisch, für schnelles Laden'] + filesInfo($variants),
            ['label' => 'Film-Vorschaubilder', 'note' => 'Von YouTube/Vimeo geholt'] + filesInfo($films),
            ['label' => 'Loops', 'note' => 'MP4/WebM'] + filesInfo(glob(CONTENT . '/video/*.{mp4,webm}', GLOB_BRACE) ?: []),
            ['label' => 'Loop-Standbilder', 'note' => 'Automatisch'] + filesInfo(glob(CONTENT . '/video/*.jpg') ?: []),
            ['label' => 'PDFs zu Projekten', 'note' => ''] + filesInfo(glob(CONTENT . '/docs/*.pdf') ?: []),
            ['label' => 'Galerie-Dateien', 'note' => count($galleries) . ' Galerien'] + filesInfo($galleryFiles),
            ['label' => 'Galerie-Vorschauen', 'note' => 'Automatisch'] + filesInfo(glob(GALLERIES . '/*/thumbs/*') ?: []),
            ['label' => 'Backups', 'note' => 'Letzte 30 Stände der Inhalte'] + filesInfo(glob(STORAGE . '/backups/*') ?: []),
        ],
        'galleries' => $galleries,
    ];
}
