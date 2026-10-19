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

switch ($action) {
    /* ── Inhalte ─────────────────────────────────────────────── */
    case 'data':
        respond(readJson(CONTENT . '/data.json'));

    case 'save':
        if (!$isPost) fail('POST erwartet', 405);
        $data = jsonBody();
        foreach (['CONTACT_EMAIL' => 'is_string', 'NAME' => 'is_string', 'CATS' => 'is_array', 'DISCIPLINES' => 'is_array', 'PROJECTS' => 'is_array'] as $key => $check) {
            if (!isset($data[$key]) || !$check($data[$key])) fail("Ungültige Daten: $key fehlt");
        }
        // Vorherigen Stand aufheben (die letzten 30)
        copy(CONTENT . '/data.json', STORAGE . '/backups/data-' . date('Ymd-His') . '.json');
        $backups = glob(STORAGE . '/backups/data-*.json') ?: [];
        foreach (array_slice($backups, 0, max(0, count($backups) - 30)) as $old) unlink($old);
        writeJson(CONTENT . '/data.json', array_intersect_key($data, array_flip(['CONTACT_EMAIL', 'NAME', 'CATS', 'DISCIPLINES', 'PROJECTS'])));
        respond(['ok' => true]);

    case 'upload':
        if (!$isPost) fail('POST erwartet', 405);
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail('Upload fehlgeschlagen');
        $ext = str_replace('jpeg', 'jpg', extensionOf($file['name']));
        if (!in_array($ext, IMAGE_TYPES, true) || detectedKind($file['tmp_name']) !== 'image') fail('Nur Bilder (JPG, PNG, WebP, GIF) erlaubt');
        if ($file['size'] > MAX_IMAGE_BYTES) fail('Bild ist zu gross (max. 25 MB)');
        $dir = CONTENT . '/img';
        $name = uniqueName($dir, slugify((string) ($_POST['title'] ?? 'bild')) . '-' . bin2hex(random_bytes(3)), $ext);
        move_uploaded_file($file['tmp_name'], "$dir/$name");
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
        sendFile($zipPath, 'portfolio-backup-' . date('Y-m-d') . '.zip', true);

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
        if (strlen($password) < 6) fail('Passwort muss mindestens 6 Zeichen haben');
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
        respond(['ok' => true]);

    // Grosse Dateien kommen in Stücken: jedes Stück wird angehängt, beim letzten wird geprüft und abgelegt
    case 'chunk':
        if (!$isPost) fail('POST erwartet', 405);
        $slug = (string) ($_POST['slug'] ?? '');
        $id = (string) ($_POST['upload'] ?? '');
        $index = (int) ($_POST['index'] ?? -1);
        $total = (int) ($_POST['total'] ?? 0);
        $name = (string) ($_POST['name'] ?? '');
        $chunk = $_FILES['chunk'] ?? null;
        if (!validSlug($slug) || !isset(galleries()[$slug])) fail('Galerie nicht gefunden', 404);
        if (!preg_match('/^[a-z0-9]{12,40}$/', $id) || $index < 0 || $index >= $total) fail('Ungültiger Upload');
        if (!$chunk || $chunk['error'] !== UPLOAD_ERR_OK) fail('Upload-Teil fehlgeschlagen');
        $ext = extensionOf($name);
        if (!in_array($ext, GALLERY_TYPES, true)) fail('Dateityp nicht erlaubt (Bilder: JPG, PNG, WebP, GIF, HEIC — Videos: MP4, MOV, M4V, WebM)');

        $part = STORAGE . "/tmp/$id.part";
        if ($index === 0) @unlink($part);
        if ($index > 0 && !is_file($part)) fail('Upload unterbrochen — bitte neu starten');
        file_put_contents($part, fopen($chunk['tmp_name'], 'rb'), FILE_APPEND | LOCK_EX);
        if (filesize($part) > MAX_GALLERY_BYTES) {
            unlink($part);
            fail('Datei ist zu gross (max. 8 GB)');
        }
        if ($index < $total - 1) respond(['ok' => true]);

        if (!in_array(detectedKind($part), ['image', 'video'], true)) {
            unlink($part);
            fail('Datei ist kein Bild oder Video');
        }
        $dir = galleryDir($slug);
        $final = uniqueName($dir, slugify(pathinfo($name, PATHINFO_FILENAME), 80), $ext);
        rename($part, "$dir/$final");
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) makeThumb("$dir/$final");
        // Liegengebliebene Teile von abgebrochenen Uploads aufräumen
        foreach (glob(STORAGE . '/tmp/*') ?: [] as $old) if (filemtime($old) < time() - 86400) @unlink($old);
        respond(['ok' => true, 'name' => $final]);
}

fail('Unbekannte Aktion', 404);
