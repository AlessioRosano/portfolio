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
// Lesen geht per GET, jede Änderung nur per POST (mit CSRF-Token, siehe oben)
if (!$isPost && !in_array($action, ['data', 'export', 'galleries', 'media'], true)) fail('POST erwartet', 405);

// Galerie aus dem CMS-Aufruf, sonst Abbruch
function requireGallery(string $slug): array
{
    $all = galleries();
    if (!validSlug($slug) || !isset($all[$slug])) fail('Galerie nicht gefunden', 404);
    return $all;
}

// Standbild (im Browser erzeugt) aus dem Upload «poster»: nur JPG bis 3 MB. Gibt die Temp-Datei zurück.
function uploadedPoster(): string
{
    $poster = $_FILES['poster'] ?? null;
    if (!$poster || $poster['error'] !== UPLOAD_ERR_OK || $poster['size'] > 3 * 1024 * 1024) fail('Standbild fehlt oder ist zu gross');
    if (mimeOf($poster['tmp_name']) !== 'image/jpeg') fail('Standbild muss ein JPG sein');
    return $poster['tmp_name'];
}

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
        // Filme auf YouTube oder Vimeo (werden auf der Projektseite erst nach Klick geladen).
        // Ältere Projekte haben noch ein einzelnes Feld «video»: es wird beim Speichern zur Liste.
        $videos = array_key_exists('videos', $p) ? (array) $p['videos'] : [$p['video'] ?? ''];
        $videos = array_values(array_filter(array_map(fn ($v) => $text($v, 300), $videos), 'strlen'));
        if (count($videos) > 20) fail('Höchstens 20 Filme pro Projekt');
        foreach ($videos as $video) {
            if (!preg_match('#^https://((www\.|m\.)?youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&\#][^\s"<>]*)?$|^https://(www\.|player\.)?vimeo\.com/(video/)?\d+(/[a-f0-9]+)?([?\#][^\s"<>]*)?$#', $video)) {
                fail('Film-Link: bitte einen YouTube- oder Vimeo-Link (https://…)');
            }
        }
        if ($link !== '' && !preg_match('#^https?://[^\s"<>]+$#i', $link)) fail('Links müssen mit https:// beginnen');
        $images = array_values((array) ($p['images'] ?? []));
        foreach ($images as $img) {
            if (!is_string($img) || !preg_match(MEDIA_PATH, $img)) fail('Ungültiger Bild- oder Videopfad');
        }
        $ofImages = fn ($list) => array_values(array_intersect($images, array_filter((array) $list, 'is_string')));
        // PDF-Dokumente: nur eigene Dateien aus content/docs/, je mit Bezeichnung
        $docs = array_values(array_filter(array_map(fn ($doc) => is_array($doc) && preg_match(DOC_PATH, (string) ($doc['src'] ?? ''))
            ? ['src' => $doc['src'], 'title' => $text($doc['title'] ?? '', 120)] : null, (array) ($p['docs'] ?? []))));
        if (count($docs) > 20) fail('Höchstens 20 PDFs pro Projekt');
        $slug = trim((string) ($p['slug'] ?? ''));
        $oneOfImages = fn ($v) => is_string($v) && in_array($v, $images, true) ? $v : '';
        $year = $p['year'] ?? '';
        if ($year !== '' && (!is_int($year) || $year < 1900 || $year > 2100)) fail('Ungültiges Jahr');
        return [
            'title' => $text($p['title'] ?? '', 120),
            'cat' => $p['cat'],
            'year' => $year,
            'hidden' => !empty($p['hidden']),   // ausgeblendet (Entwurf): nirgends öffentlich
            'slug' => $slug !== '' ? urlSlug($slug, 60) : '',   // eigene Adresse, leer = aus dem Titel
            'client' => $text($p['client'] ?? '', 120),
            'role' => $text($p['role'] ?? '', 200),
            'tools' => $text($p['tools'] ?? '', 300),
            'desc' => $text($p['desc'] ?? ''),
            'link' => $link,
            'videos' => $videos,
            'art' => (int) ($p['art'] ?? 0) % 2,
            'images' => $images,
            // Bilder, die nicht beschnitten werden dürfen (nur solche, die auch im Projekt sind)
            'full' => $ofImages($p['full'] ?? []),
            // Galeriebilder in ganzer Breite (Querformat); alle anderen halbe Breite
            'wide' => $ofImages($p['wide'] ?? []),
            // Eigene Bilder für die Vorschau in «Zeig mal», auf der Disziplin-Seite und auf der Startseite (Hover bei «Was»)
            // sowie das Keyvisual der Projektseite
            'previewWorks' => $oneOfImages($p['previewWorks'] ?? ''),
            'previewDiscipline' => $oneOfImages($p['previewDiscipline'] ?? ''),
            'previewHome' => $oneOfImages($p['previewHome'] ?? ''),
            'keyvisual' => $oneOfImages($p['keyvisual'] ?? ''),
            'docs' => $docs,
        ];
    }, array_values($d['PROJECTS']));

    // Eigene Adressen dürfen keinem anderen Projekt die Adresse wegnehmen (sonst würde dieses still zu «…-2»)
    foreach ($projects as $i => $p) {
        if ($p['slug'] === '') continue;
        foreach ($projects as $j => $q) {
            if ($i !== $j && ($q['slug'] !== '' ? $q['slug'] : urlSlug((string) $q['title'])) === $p['slug']) {
                fail("Die Adresse «{$p['slug']}» gehört schon zu «{$q['title']}». Bitte eine andere wählen.");
            }
        }
    }

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
        $data = cleanData(jsonBody());
        // Vorschaubild jedes Films einmalig holen (danach liegt es auf dem eigenen Server).
        // filmThumb = Vorschau des ersten Films, für Übersichten bei Projekten ohne eigene Bilder.
        foreach ($data['PROJECTS'] as &$project) {
            $project['filmThumbs'] = array_map('filmThumb', $project['videos']);
            $project['filmThumb'] = $project['filmThumbs'][0] ?? '';
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
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail('Upload fehlgeschlagen');
        $ext = extensionOf($file['name']);
        $mime = mimeOf($file['tmp_name']);
        if (!isset(IMAGE_TYPES[$ext]) || !in_array($mime, IMAGE_TYPES, true)) fail('Nur Bilder (JPG, PNG, WebP, GIF) erlaubt');
        if ($file['size'] > MAX_IMAGE_BYTES) fail('Bild ist zu gross (max. 25 MB)');
        $dir = CONTENT . '/img';
        $name = uniqueName($dir, slugify((string) ($_POST['title'] ?? 'bild')) . '-' . bin2hex(random_bytes(3)), $ext);
        move_uploaded_file($file['tmp_name'], "$dir/$name");
        imageVariants(20);   // Proxies fürs neue Bild sofort erzeugen
        respond(['path' => "content/img/$name"]);

    case 'media':
        // Alle hochgeladenen Portfolio-Dateien für den Tab «Medien» (ohne WebP-Varianten und Loop-Standbilder)
        $files = [];
        foreach (glob(CONTENT . '/{img,video,docs}/*.{jpg,png,webp,gif,mp4,webm,pdf}', GLOB_BRACE) ?: [] as $file) {
            $name = basename($file);
            $dir = basename(dirname($file));
            if (preg_match('/\.w\d+\.webp$/', $name) || ($dir === 'video' && extensionOf($name) === 'jpg')) continue;
            // Vorschau: bei Loops das Standbild daneben, bei Bildern die kleinste WebP-Variante
            $thumb = $dir === 'video' ? preg_replace('/\.\w+$/', '.jpg', $name) : variantFile($name, 480);
            $files[] = [
                'path' => "content/$dir/$name",
                'kind' => $dir === 'video' ? 'loop' : ($dir === 'docs' ? 'pdf' : (str_starts_with($name, 'film-') ? 'film' : 'image')),
                'thumb' => is_file(dirname($file) . "/$thumb") ? "content/$dir/$thumb" : null,
                'size' => filesize($file),
                'time' => filemtime($file),
            ];
        }
        usort($files, fn ($a, $b) => $b['time'] <=> $a['time']);
        respond($files);

    case 'export':
        // Backup aller Inhalte (Texte + Projektbilder) als ZIP
        $zipPath = STORAGE . '/tmp/export-' . bin2hex(random_bytes(4)) . '.zip';
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFile(CONTENT . '/data.json', 'content/data.json');
        if (is_file(STORAGE . '/galleries.json')) $zip->addFile(STORAGE . '/galleries.json', 'storage/galleries.json');
        foreach (glob(CONTENT . '/{img,docs}/*', GLOB_BRACE) ?: [] as $file) $zip->addFile($file, 'content/' . basename(dirname($file)) . '/' . basename($file));
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
        $slug = (string) (jsonBody()['slug'] ?? '');
        $all = requireGallery($slug);
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(galleryDir($slug), FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        rmdir(galleryDir($slug));
        unset($all[$slug]);
        saveGalleries($all);
        respond(['ok' => true]);

    case 'gallery-file-delete':
        $in = jsonBody();
        $slug = (string) ($in['slug'] ?? '');
        $name = basename((string) ($in['name'] ?? ''));
        requireGallery($slug);
        $path = galleryDir($slug) . "/$name";
        if (!is_file($path)) fail('Datei nicht gefunden', 404);
        unlink($path);
        @unlink(galleryDir($slug) . "/thumbs/$name.jpg");
        @unlink(galleryDir($slug) . "/thumbs/$name.preview.jpg");
        respond(['ok' => true]);

    // Standbild eines Videos (erzeugt im Browser beim Upload) als Vorschau speichern
    case 'gallery-poster':
        $slug = (string) ($_POST['slug'] ?? '');
        $name = basename((string) ($_POST['name'] ?? ''));
        requireGallery($slug);
        $dir = galleryDir($slug);
        if (!is_file("$dir/$name") || !str_starts_with(GALLERY_TYPES[extensionOf($name)] ?? '', 'video/')) fail('Video nicht gefunden', 404);
        $poster = uploadedPoster();
        if (!is_dir("$dir/thumbs")) mkdir("$dir/thumbs", 0755);
        move_uploaded_file($poster, "$dir/thumbs/$name.jpg");
        respond(['ok' => true]);

    // Grosse Dateien kommen in Stücken: jedes Stück wird angehängt, beim letzten wird geprüft und abgelegt
    case 'chunk':
        $slug = (string) ($_POST['slug'] ?? '');
        $name = (string) ($_POST['name'] ?? '');
        requireGallery($slug);
        $ext = extensionOf($name);
        if (!isset(GALLERY_TYPES[$ext])) fail('Dateityp nicht erlaubt (Bilder: JPG, PNG, WebP, GIF, HEIC · Videos: MP4, MOV, M4V, WebM · PDF)');
        $part = receiveChunk(MAX_GALLERY_BYTES);
        if (!$part) respond(['ok' => true]);

        if (!contentAllowed($part, $ext)) {
            unlink($part);
            fail($ext === 'pdf' ? 'Datei ist kein PDF' : 'Datei ist kein Bild oder Video');
        }
        $dir = galleryDir($slug);
        $final = uniqueName($dir, slugify(pathinfo($name, PATHINFO_FILENAME), 80), $ext);
        rename($part, "$dir/$final");
        galleryProxy("$dir/$final", 'thumb');
        galleryProxy("$dir/$final", 'preview');
        respond(['ok' => true, 'name' => $final]);

    // Kurzer Video-Loop fürs Portfolio (MP4/WebM, in Stücken) → content/video/
    case 'loop-chunk':
        $ext = extensionOf((string) ($_POST['name'] ?? ''));
        if (!isset(LOOP_TYPES[$ext])) fail('Für Loops nur MP4 oder WebM');
        $part = receiveChunk(MAX_LOOP_BYTES);
        if (!$part) respond(['ok' => true]);
        // MP4-Exporte melden sich teils als QuickTime (gleicher Container) — beides ist in Ordnung
        if (!in_array(mimeOf($part), ['video/mp4', 'video/webm', 'application/mp4', 'video/x-m4v', 'video/quicktime'], true)) {
            unlink($part);
            fail('Datei ist kein MP4- oder WebM-Video');
        }
        $dir = CONTENT . '/video';
        $name = uniqueName($dir, slugify((string) ($_POST['title'] ?? 'loop')) . '-' . bin2hex(random_bytes(3)), $ext);
        rename($part, "$dir/$name");
        respond(['ok' => true, 'path' => "content/video/$name"]);

    // PDF zu einem Projekt (in Stücken) → content/docs/. Geprüft wird der echte Inhalt, nicht nur die Endung.
    case 'pdf-chunk':
        if (extensionOf((string) ($_POST['name'] ?? '')) !== 'pdf') fail('Nur PDF-Dateien');
        $part = receiveChunk(MAX_DOC_BYTES);
        if (!$part) respond(['ok' => true]);
        if (!isPdf($part)) {
            unlink($part);
            fail('Datei ist kein PDF');
        }
        $dir = CONTENT . '/docs';
        $name = uniqueName($dir, slugify(pathinfo((string) $_POST['name'], PATHINFO_FILENAME)) . '-' . bin2hex(random_bytes(3)), 'pdf');
        rename($part, "$dir/$name");
        respond(['ok' => true, 'path' => "content/docs/$name"]);

    // Standbild eines Loops (im Browser erzeugt): Vorschau in Übersichten und solange das Video lädt
    case 'loop-poster':
        $path = (string) ($_POST['path'] ?? '');
        if (!preg_match('#^content/video/([a-z0-9-]+)\.(mp4|webm)$#', $path, $m) || !is_file(ROOT . "/$path")) fail('Video nicht gefunden', 404);
        move_uploaded_file(uploadedPoster(), CONTENT . "/video/{$m[1]}.jpg");
        respond(['ok' => true]);
}

fail('Unbekannte Aktion', 404);
