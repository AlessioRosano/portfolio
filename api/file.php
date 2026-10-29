<?php
// Liefert eine Galerie-Datei aus — nur nach Passwort (oder im CMS).
// ?thumb=1: Vorschau 800 px · ?preview=1: Grossansicht 2000 px · ?dl=1: Original als Download
require __DIR__ . '/stats.php';

$slug = (string) ($_GET['g'] ?? '');
$name = basename((string) ($_GET['f'] ?? ''));
galleryOrDeny($slug);

$path = galleryDir($slug) . "/$name";
if ($name === '' || !is_file($path)) {
    http_response_code(404);
    exit('Datei nicht gefunden');
}

// Vorschauen werden beim ersten Abruf erzeugt (auch für ältere Bilder); sonst gilt das Original
foreach (['thumb', 'preview'] as $kind) {
    if (isset($_GET[$kind]) && ($proxy = galleryProxy($path, $kind))) sendFile($proxy, $name, false, 'image/jpeg');
}
// Statistik: Download zählen (nur einmal pro Datei, nicht jedes Stück eines fortgesetzten Downloads)
if (isset($_GET['dl']) && !preg_match('/bytes=[1-9]/', $_SERVER['HTTP_RANGE'] ?? '')) countGallery($slug, 'file', $name);
sendFile($path, $name, isset($_GET['dl']));
