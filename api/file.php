<?php
// Liefert eine Galerie-Datei aus — nur nach Passwort (oder im CMS)
require __DIR__ . '/lib.php';

$slug = (string) ($_GET['g'] ?? '');
$name = basename((string) ($_GET['f'] ?? ''));
$gallery = validSlug($slug) ? (galleries()[$slug] ?? null) : null;

if (!$gallery || !canViewGallery($slug) || (galleryExpired($gallery) && !isAdmin())) {
    http_response_code(403);
    exit('Kein Zugriff');
}

$path = galleryDir($slug) . "/$name";
if ($name === '' || !is_file($path)) {
    http_response_code(404);
    exit('Datei nicht gefunden');
}

$thumb = galleryDir($slug) . "/thumbs/$name.jpg";
if (isset($_GET['thumb']) && is_file($thumb)) sendFile($thumb, $name, false);
sendFile($path, $name, isset($_GET['dl']));
