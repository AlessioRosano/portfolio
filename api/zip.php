<?php
// Ganze Galerie als ZIP. Fotos und Videos sind schon komprimiert, darum nur «gespeichert» (schnell).
// Das ZIP wird zwischengespeichert, solange sich die Dateien nicht ändern.
require __DIR__ . '/lib.php';

$slug = (string) ($_GET['g'] ?? '');
$gallery = galleryOrDeny($slug);

$files = galleryFiles($slug);
if (!$files) {
    http_response_code(404);
    exit('Keine Dateien');
}

set_time_limit(0);
$dir = galleryDir($slug);
$version = md5(implode('|', array_map(fn ($f) => $f['name'] . ':' . $f['size'] . ':' . filemtime("$dir/{$f['name']}"), $files)));
$zipPath = STORAGE . "/tmp/zip-$slug-$version.zip";

if (!is_file($zipPath)) {
    foreach (glob(STORAGE . "/tmp/zip-$slug-*.zip") ?: [] as $old) @unlink($old);
    $tmp = "$zipPath." . bin2hex(random_bytes(4));
    $zip = new ZipArchive();
    $zip->open($tmp, ZipArchive::CREATE);
    foreach ($files as $f) {
        $zip->addFile("$dir/{$f['name']}", $f['name']);
        $zip->setCompressionName($f['name'], ZipArchive::CM_STORE);
    }
    $zip->close();
    rename($tmp, $zipPath);
}

sendFile($zipPath, slugify($gallery['title'], 60) . '.zip', true, 'application/zip');
