<?php
// Sitemap für Suchmaschinen, erreichbar als /sitemap.xml (siehe .htaccess).
// Baut sich aus den CMS-Inhalten auf: Startseite, alle Disziplinen, alle Projekte.
require __DIR__ . '/api/lib.php';

ensureStorage();
$data = readJson(CONTENT . '/data.json');
$base = 'https://' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'alessiorosano.ch') . '/';
$lastmod = date('Y-m-d', filemtime(CONTENT . '/data.json'));

$urls = [$base];
foreach (array_keys($data['CATS'] ?? []) as $cat) $urls[] = $base . 'disziplin.html?d=' . rawurlencode($cat);
foreach (projectSlugs($data['PROJECTS'] ?? []) as $id) $urls[] = $base . 'projekt.html?p=' . rawurlencode($id);

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: max-age=3600');
echo '<?xml version="1.0" encoding="UTF-8"?>', "\n", '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', "\n";
foreach ($urls as $i => $url) {
    printf("  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n", htmlspecialchars($url, ENT_XML1), $lastmod, $i === 0 ? '1.0' : '0.7');
}
echo "</urlset>\n";
