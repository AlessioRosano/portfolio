<?php
/* ==========================================================================
   Schnittstelle für das CMS (admin/). Alles ausser «session» und «login»
   braucht eine Anmeldung, jede Änderung zusätzlich das CSRF-Token.
   ========================================================================== */

require __DIR__ . '/lib.php';

ensureStorage();
startSession();

$action = $_GET['a'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';

if ($isPost) checkCsrf();

switch ($action) {
    case 'session':
        respond([
            'admin' => isAdmin(),
            'csrf' => csrfToken(),
            'configured' => !empty(config()['admin_password_hash']),
            'chunk' => max(256 * 1024, min(8 << 20, uploadLimit() - 64 * 1024)),
        ]);

    case 'login':
        if (!$isPost) fail('POST erwartet', 405);
        $hash = config()['admin_password_hash'] ?? '';
        if ($hash === '') fail('Auf dem Server ist noch kein Passwort eingerichtet (api/config.local.php).', 500);
        guardAttempts('admin');
        if (!password_verify((string) (jsonBody()['password'] ?? ''), $hash)) {
            failedAttempts('admin', true);
            usleep(400000);
            fail('Falsches Passwort', 401);
        }
        clearAttempts('admin');
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['seen'] = time();
        respond(['admin' => true, 'csrf' => csrfToken()]);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        respond(['admin' => false]);
}

requireAdmin();

// Prüft und bereinigt alles, was das CMS speichern will. Was nicht ins Schema passt, wird abgelehnt —
// so können nie Script-Links, fremde Bildpfade oder kaputte Daten auf die Website gelangen.
function cleanData(array $d): array
{
    $text = function (mixed $v, int $max = 5000): string {
        if (!is_string($v) && !is_int($v)) fail('Ungültige Daten: Text erwartet');
        $v = trim((string) $v);
        if (mb_strlen($v) > $max) fail('Ein Text ist zu lang');
        return $v;
    };
    if (!is_array($d['CATS'] ?? null) || !is_array($d['DISCIPLINES'] ?? null) || !is_array($d['PROJECTS'] ?? null)) fail('Ungültige Daten');

    $email = $text($d['CONTACT_EMAIL'] ?? '', 200);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Kontakt-E-Mail ist ungültig');

    $cats = [];
    foreach ($d['CATS'] as $key => $label) {
        if (!preg_match('/^[a-z]{1,30}$/', (string) $key)) fail('Ungültige Disziplin');
        $cats[$key] = $text($label, 60);
    }

    $disciplines = array_map(function ($x) use ($text, $cats) {
        if (!is_array($x) || !isset($cats[$x['cat'] ?? ''])) fail('Ungültige Disziplin');
        return [
            'cat' => $x['cat'],
            'lead' => $text($x['lead'] ?? ''),
            'tags' => array_map(fn ($t) => $text($t, 60), array_values((array) ($x['tags'] ?? []))),
            'tools' => $text($x['tools'] ?? '', 300),
            'steps' => array_map(fn ($s) => [$text($s[0] ?? '', 100), $text($s[1] ?? '', 1000)], array_values((array) ($x['steps'] ?? []))),
        ];
    }, array_values($d['DISCIPLINES']));

    $projects = array_map(function ($p) use ($text, $cats) {
        if (!is_array($p) || !isset($cats[$p['cat'] ?? ''])) fail('Projekt hat eine ungültige Disziplin');
        $link = $text($p['link'] ?? '', 500);
        // Film auf YouTube oder Vimeo (wird auf der Projektseite erst nach Klick geladen)
        $video = $text($p['video'] ?? '', 300);
        if ($video !== '' && !preg_match('#^https://((www\.|m\.)?youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&\#][^\s"<>]*)?$|^https://(www\.|player\.)?vimeo\.com/(video/)?\d+(/[a-f0-9]+)?([?\#][^\s"<>]*)?$#', $video)) {
            fail('Video-Link: bitte einen YouTube- oder Vimeo-Link (https://…)');
        }
        if ($link !== '' && !preg_match('#^https?://[^\s"<>]+$#i', $link)) fail('Links müssen mit https:// beginnen');
        $images = array_values((array) ($p['images'] ?? []));
        foreach ($images as $img) {
            if (!is_string($img) || !preg_match(MEDIA_PATH, $img)) fail('Ungültiger Bild- oder Videopfad');
        }
        $year = $p['year'] ?? '';
        if ($year !== '' && (!is_int($year) || $year < 1900 || $year > 2100)) fail('Ungültiges Jahr');
        return [
            'title' => $text($p['title'] ?? '', 120),
            'cat' => $p['cat'],
            'year' => $year,
            'role' => $text($p['role'] ?? '', 200),
            'tools' => $text($p['tools'] ?? '', 300),
            'desc' => $text($p['desc'] ?? ''),
            'link' => $link,
            'video' => $video,
            'art' => (int) ($p['art'] ?? 0) % 2,
            'images' => $images,
            // Bilder, die nicht beschnitten werden dürfen (nur solche, die auch im Projekt sind)
            'full' => array_values(array_intersect($images, array_filter((array) ($p['full'] ?? []), 'is_string'))),
            // Galeriebilder in ganzer Breite (Querformat); alle anderen halbe Breite
            'wide' => array_values(array_intersect($images, array_filter((array) ($p['wide'] ?? []), 'is_string'))),
        ];
    }, array_values($d['PROJECTS']));

    $social = [];
    foreach (array_slice(array_values((array) ($d['SOCIAL'] ?? [])), 0, 12) as $s) {
        if (!is_array($s)) fail('Ungültiger Social-Link');
        $label = $text($s['label'] ?? '', 40);
        $url = $text($s['url'] ?? '', 500);
        if ($url !== '' && !preg_match('#^https://[^\s"<>]+$#i', $url)) fail("Social-Link «{$label}» muss mit https:// beginnen");
        if ($label !== '' || $url !== '') $social[] = ['label' => $label, 'url' => $url];
    }

    $a = is_array($d['ABOUT'] ?? null) ? $d['ABOUT'] : [];
    $portrait = $text($a['portrait'] ?? '', 200);
    if ($portrait !== '' && !preg_match('#^content/img/[a-z0-9-]+\.(jpg|png|webp|gif)$#', $portrait)) fail('Ungültiger Bildpfad beim Portrait');
    $about = [
        'statement' => $text($a['statement'] ?? '', 2000),
        'portrait' => $portrait,
        'caption' => $text($a['caption'] ?? '', 80),
        'specs' => array_map(fn ($row) => [$text($row[0] ?? '', 40), $text($row[1] ?? '', 200)], array_slice(array_values((array) ($a['specs'] ?? [])), 0, 12)),
        'status' => $text($a['status'] ?? '', 80),
    ];

    return [
        'CONTACT_EMAIL' => $email, 'NAME' => $text($d['NAME'] ?? '', 120), 'CATS' => $cats,
        'DISCIPLINES' => $disciplines, 'PROJECTS' => $projects, 'SOCIAL' => $social, 'ABOUT' => $about,
        'VERSION' => (int) ($d['VERSION'] ?? 0),   // Stand der automatischen Umstellungen
    ];
}

switch ($action) {
    /* ── Inhalte ─────────────────────────────────────────────── */
    case 'data':
        respond(readJson(CONTENT . '/data.json'));

    case 'save':
        if (!$isPost) fail('POST erwartet', 405);
        $data = cleanData(jsonBody());
        // Vorschaubild jedes Films einmalig holen (danach liegt es auf dem eigenen Server)
        foreach ($data['PROJECTS'] as &$project) {
            $project['filmThumb'] = $project['video'] !== '' ? filmThumb($project['video']) : '';
        }
        unset($project);
        imageVariants(10);
        // Vorherigen Stand aufheben (die letzten 30)
        copy(CONTENT . '/data.json', STORAGE . '/backups/data-' . date('Ymd-His') . '.json');
        $backups = glob(STORAGE . '/backups/data-*.json') ?: [];
        foreach (array_slice($backups, 0, max(0, count($backups) - 30)) as $old) unlink($old);
        writeJson(CONTENT . '/data.json', $data);
        respond(['ok' => true]);

    case 'upload':
        if (!$isPost) fail('POST erwartet', 405);
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail('Upload fehlgeschlagen');
        $ext = extensionOf($file['name']);
        $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!isset(IMAGE_TYPES[$ext]) || !in_array($mime, IMAGE_TYPES, true)) fail('Nur Bilder (JPG, PNG, WebP, GIF) erlaubt');
        if ($file['size'] > MAX_IMAGE_BYTES) fail('Bild ist zu gross (max. 25 MB)');
        $dir = CONTENT . '/img';
        $name = uniqueName($dir, slugify((string) ($_POST['title'] ?? 'bild')) . '-' . bin2hex(random_bytes(3)), $ext);
        move_uploaded_file($file['tmp_name'], "$dir/$name");
        imageVariants(20);   // Proxies fürs neue Bild sofort erzeugen
        respond(['path' => "content/img/$name"]);

    case 'export':
        // Backup aller Inhalte (Texte + Projektbilder) als ZIP
        $zipPath = STORAGE . '/tmp/export-' . bin2hex(random_bytes(4)) . '.zip';
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFile(CONTENT . '/data.json', 'content/data.json');
        if (is_file(STORAGE . '/galleries.json')) $zip->addFile(STORAGE . '/galleries.json', 'storage/galleries.json');
        foreach (glob(CONTENT . '/img/*') ?: [] as $img) $zip->addFile($img, 'content/img/' . basename($img));
        $zip->close();
        register_shutdown_function(fn () => @unlink($zipPath));
        sendFile($zipPath, 'portfolio-backup-' . date('Y-m-d') . '.zip', true, 'application/zip');

    /* ── Galerien ────────────────────────────────────────────── */
    case 'galleries':
        $list = [];
        foreach (galleries() as $slug => $g) $list[] = $g + ['slug' => $slug, 'files' => galleryFiles($slug), 'expired' => galleryExpired($g)];
        usort($list, fn ($a, $b) => strcmp($b['created'], $a['created']));
        respond($list);

    case 'gallery-save':
        if (!$isPost) fail('POST erwartet', 405);
        $in = jsonBody();
        $all = galleries();
        $title = trim((string) ($in['title'] ?? ''));
        if ($title === '') fail('Titel fehlt');
        $slug = (string) ($in['slug'] ?? '');
        if ($slug === '') {
            $base = slugify($title, 50);
            $slug = $base;
            for ($n = 2; isset($all[$slug]); $n++) $slug = "$base-$n";
            $all[$slug] = ['created' => date('c')];
            mkdir(galleryDir($slug), 0755, true);
        } elseif (!isset($all[$slug])) {
            fail('Galerie nicht gefunden', 404);
        }
        $password = trim((string) ($in['password'] ?? ''));
        if (strlen($password) < 8) fail('Passwort muss mindestens 8 Zeichen haben');
        $expires = (string) ($in['expires'] ?? '');
        if ($expires !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expires)) fail('Ungültiges Ablaufdatum');
        $date = (string) ($in['date'] ?? '');
        if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) fail('Ungültiges Datum');
        // Passwort im Klartext: du musst es Kund:innen weitergeben können. storage/ ist von aussen gesperrt.
        $all[$slug] = ['title' => $title, 'date' => $date, 'password' => $password, 'expires' => $expires, 'created' => $all[$slug]['created']];
        saveGalleries($all);
        respond(['slug' => $slug]);

    case 'gallery-delete':
        if (!$isPost) fail('POST erwartet', 405);
        $slug = (string) (jsonBody()['slug'] ?? '');
        $all = galleries();
        if (!validSlug($slug) || !isset($all[$slug])) fail('Galerie nicht gefunden', 404);
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(galleryDir($slug), FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        rmdir(galleryDir($slug));
        unset($all[$slug]);
        saveGalleries($all);
        respond(['ok' => true]);

    case 'gallery-file-delete':
        if (!$isPost) fail('POST erwartet', 405);
        $in = jsonBody();
        $slug = (string) ($in['slug'] ?? '');
        $name = basename((string) ($in['name'] ?? ''));
        if (!validSlug($slug) || !isset(galleries()[$slug])) fail('Galerie nicht gefunden', 404);
        $path = galleryDir($slug) . "/$name";
        if (!is_file($path)) fail('Datei nicht gefunden', 404);
        unlink($path);
        @unlink(galleryDir($slug) . "/thumbs/$name.jpg");
        @unlink(galleryDir($slug) . "/thumbs/$name.preview.jpg");
        respond(['ok' => true]);

    // Standbild eines Videos (erzeugt im Browser beim Upload) als Vorschau speichern
    case 'gallery-poster':
        if (!$isPost) fail('POST erwartet', 405);
        $slug = (string) ($_POST['slug'] ?? '');
        $name = basename((string) ($_POST['name'] ?? ''));
        $poster = $_FILES['poster'] ?? null;
        if (!validSlug($slug) || !isset(galleries()[$slug])) fail('Galerie nicht gefunden', 404);
        $video = galleryDir($slug) . "/$name";
        if (!is_file($video) || !str_starts_with(GALLERY_TYPES[extensionOf($name)] ?? '', 'video/')) fail('Video nicht gefunden', 404);
        if (!$poster || $poster['error'] !== UPLOAD_ERR_OK || $poster['size'] > 3 * 1024 * 1024) fail('Standbild fehlt oder ist zu gross');
        if ((new finfo(FILEINFO_MIME_TYPE))->file($poster['tmp_name']) !== 'image/jpeg') fail('Standbild muss ein JPG sein');
        if (!is_dir(galleryDir($slug) . '/thumbs')) mkdir(galleryDir($slug) . '/thumbs', 0755);
        move_uploaded_file($poster['tmp_name'], galleryDir($slug) . "/thumbs/$name.jpg");
        respond(['ok' => true]);

    // Grosse Dateien kommen in Stücken: jedes Stück wird angehängt, beim letzten wird geprüft und abgelegt
    case 'chunk':
        if (!$isPost) fail('POST erwartet', 405);
        $slug = (string) ($_POST['slug'] ?? '');
        $name = (string) ($_POST['name'] ?? '');
        if (!validSlug($slug) || !isset(galleries()[$slug])) fail('Galerie nicht gefunden', 404);
        $ext = extensionOf($name);
        if (!isset(GALLERY_TYPES[$ext])) fail('Dateityp nicht erlaubt (Bilder: JPG, PNG, WebP, GIF, HEIC — Videos: MP4, MOV, M4V, WebM)');
        $part = receiveChunk(MAX_GALLERY_BYTES);
        if (!$part) respond(['ok' => true]);

        if (!contentAllowed($part)) {
            unlink($part);
            fail('Datei ist kein Bild oder Video');
        }
        $dir = galleryDir($slug);
        $final = uniqueName($dir, slugify(pathinfo($name, PATHINFO_FILENAME), 80), $ext);
        rename($part, "$dir/$final");
        galleryProxy("$dir/$final", 'thumb');
        galleryProxy("$dir/$final", 'preview');
        respond(['ok' => true, 'name' => $final]);

    // Kurzer Video-Loop fürs Portfolio (MP4/WebM, in Stücken) → content/video/
    case 'loop-chunk':
        if (!$isPost) fail('POST erwartet', 405);
        $ext = extensionOf((string) ($_POST['name'] ?? ''));
        if (!isset(LOOP_TYPES[$ext])) fail('Für Loops nur MP4 oder WebM');
        $part = receiveChunk(MAX_LOOP_BYTES);
        if (!$part) respond(['ok' => true]);
        // MP4-Exporte melden sich teils als QuickTime (gleicher Container) — beides ist in Ordnung
        if (!in_array((string) (new finfo(FILEINFO_MIME_TYPE))->file($part), ['video/mp4', 'video/webm', 'application/mp4', 'video/x-m4v', 'video/quicktime'], true)) {
            unlink($part);
            fail('Datei ist kein MP4- oder WebM-Video');
        }
        $dir = CONTENT . '/video';
        $name = uniqueName($dir, slugify((string) ($_POST['title'] ?? 'loop')) . '-' . bin2hex(random_bytes(3)), $ext);
        rename($part, "$dir/$name");
        respond(['ok' => true, 'path' => "content/video/$name"]);

    // Standbild eines Loops (im Browser erzeugt): Vorschau in Übersichten und solange das Video lädt
    case 'loop-poster':
        if (!$isPost) fail('POST erwartet', 405);
        $path = (string) ($_POST['path'] ?? '');
        $poster = $_FILES['poster'] ?? null;
        if (!preg_match('#^content/video/([a-z0-9-]+)\.(mp4|webm)$#', $path, $m) || !is_file(ROOT . "/$path")) fail('Video nicht gefunden', 404);
        if (!$poster || $poster['error'] !== UPLOAD_ERR_OK || $poster['size'] > 3 * 1024 * 1024) fail('Standbild fehlt oder ist zu gross');
        if ((new finfo(FILEINFO_MIME_TYPE))->file($poster['tmp_name']) !== 'image/jpeg') fail('Standbild muss ein JPG sein');
        move_uploaded_file($poster['tmp_name'], CONTENT . "/video/{$m[1]}.jpg");
        respond(['ok' => true]);
}

fail('Unbekannte Aktion', 404);
