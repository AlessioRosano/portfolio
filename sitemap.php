<?php
// Sitemap für Suchmaschinen, erreichbar als /sitemap.xml (siehe .htaccess).
// Baut sich aus den CMS-Inhalten auf: Startseite, «Zeig mal», alle Disziplinen, alle Projekte,
// bei Projekten mit ihren Bildern (für die Google-Bildersuche).
require __DIR__ . '/api/seo.php';

ensureStorage();
$data = siteData();
$base = siteBase();
$lastmod = date('Y-m-d', filemtime(CONTENT . '/data.json'));

$urls = [[$base, []], [$base . 'arbeiten.html', []]];
foreach (array_keys($data['CATS']) as $cat) $urls[] = [$base . disciplinePath($cat), []];
foreach ($data['PROJECTS'] as $p) {
    $images = array_values(array_unique(array_map(fn ($src) => $base . stillOf($src), array_filter((array) ($p['images'] ?? []), 'is_string'))));
    $urls[] = [$base . projectPath($p), $images];
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: max-age=3600');
echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">', "\n";
foreach ($urls as $i => [$url, $images]) {
    printf('  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority>', htmlspecialchars($url, ENT_XML1), $lastmod, $i === 0 ? '1.0' : '0.7');
    foreach ($images as $img) printf('<image:image><image:loc>%s</image:loc></image:image>', htmlspecialchars($img, ENT_XML1));
    echo "</url>\n";
}
echo "</urlset>\n";
