<?php
// Öffentlich: Inhalte der Website (Texte, Projekte) für js/main.js —
// plus IMAGES: welche kleineren WebP-Versionen es von jedem Bild gibt (für srcset)
require __DIR__ . '/lib.php';

ensureStorage();
$data = readJson(CONTENT . '/data.json');
$data['IMAGES'] = [];
foreach (imageVariants() as $name => $v) $data['IMAGES']["content/img/$name"] = $v;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
