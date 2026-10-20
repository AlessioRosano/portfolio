<?php
// Kurzfassung der Website für KI-Systeme, erreichbar als /llms.txt (siehe .htaccess, Format: llmstxt.org).
// Baut sich aus den CMS-Inhalten auf: wer, was, alle Projekte mit Link, Kontakt.
require __DIR__ . '/api/seo.php';

$data = siteData();
$base = siteBase();
$cats = $data['CATS'];
$line = fn (string $s) => trim((string) preg_replace('/\s+/u', ' ', $s));

$out = ["# {$data['NAME']}", ''];
$out[] = '> ' . $data['NAME'] . ' aus St.Gallen (Schweiz) arbeitet in ' . implode(', ', $cats) . '. Weniger Lärm, mehr Wirkung.';
$out[] = '';
if (!empty($data['ABOUT']['statement'])) {
    $out[] = '## Über mich';
    $out[] = '';
    foreach (preg_split('/\n\s*\n/', trim($data['ABOUT']['statement'])) as $para) $out[] = $line($para) . "\n";
}
$specs = array_filter((array) ($data['ABOUT']['specs'] ?? []), fn ($r) => is_array($r) && trim((string) ($r[1] ?? '')) !== '');
if ($specs) {
    foreach ($specs as $r) $out[] = '- ' . $line((string) $r[0]) . ': ' . $line((string) $r[1]);
    $out[] = '';
}

$out[] = '## Disziplinen';
$out[] = '';
foreach ($data['DISCIPLINES'] ?? [] as $d) {
    if (!isset($cats[$d['cat'] ?? ''])) continue;
    $out[] = "- [{$cats[$d['cat']]}]({$base}" . disciplinePath($d['cat']) . '): ' . $line((string) ($d['lead'] ?? ''));
}
$out[] = '';

$out[] = '## Projekte';
$out[] = '';
foreach ($data['PROJECTS'] as $p) {
    $facts = implode(', ', array_filter([$cats[$p['cat']] ?? '', (string) ($p['year'] ?? ''), !empty($p['client']) ? "Kunde: {$p['client']}" : '', (string) ($p['role'] ?? '')]));
    $desc = $line(plainText((string) ($p['desc'] ?? '')));
    $out[] = "- [{$line((string) $p['title'])}]({$base}" . projectPath($p) . "): $facts" . ($desc ? ". $desc" : '');
}
$out[] = '';

$out[] = '## Kontakt';
$out[] = '';
if (!empty($data['CONTACT_EMAIL'])) $out[] = "- E-Mail: {$data['CONTACT_EMAIL']}";
foreach ($data['SOCIAL'] ?? [] as $s) if (!empty($s['url'])) $out[] = "- {$line((string) $s['label'])}: {$s['url']}";
$out[] = "- Website: $base";

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: max-age=3600');
echo implode("\n", $out), "\n";
