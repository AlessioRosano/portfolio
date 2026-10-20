<?php
/* ==========================================================================
   Gemeinsame Helfer für Suchmaschinen und KI-Crawler (render.php, llms.php, sitemap.php).
   Die Regeln entsprechen js/main.js, damit Server und Browser dasselbe zeigen.
   ========================================================================== */

require_once __DIR__ . '/lib.php';

// Textlinks in Beschreibungen: [Wort](https://…), wie LINK_RE in js/main.js
const LINK_PATTERN = '/\[([^\]\n]+)\]\((https:\/\/[^\s()<>"]+)\)/';
// Bildrollen pro Projekt, wie ROLES in js/main.js
const IMAGE_ROLES = ['previewWorks', 'previewDiscipline', 'previewHome', 'keyvisual'];

function h(mixed $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// Feste Adresse der Website (nicht aus der Anfrage, damit niemand eine fremde Domain unterschieben kann).
// Nur lokal beim Testen zeigt sie auf den Testserver.
function siteBase(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    return preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host) ? "http://$host/" : 'https://alessiorosano.ch/';
}

function plainText(string $s): string
{
    return (string) preg_replace(LINK_PATTERN, '$1', $s);
}

// Erst escapen, dann nur https-Links umwandeln (gleich wie linkify in js/main.js)
function linkify(string $s): string
{
    return (string) preg_replace(LINK_PATTERN, '<a href="$2" target="_blank" rel="noopener">$1</a>', h($s));
}

// Kurzbeschreibung für Meta-Tags: höchstens 155 Zeichen, an einer Wortgrenze gekürzt
function shortText(string $s): string
{
    $s = trim((string) preg_replace('/\s+/u', ' ', $s));
    if (mb_strlen($s) <= 155) return $s;
    return preg_replace('/\s\S*$/u', '', mb_substr($s, 0, 152)) . ' …';
}

// Standbild eines Loops bzw. das Bild selbst (wie stillOf in js/utils.js)
function stillOf(string $src): string
{
    return preg_match('/\.(mp4|webm)$/i', $src) ? (string) preg_replace('/\.\w+$/', '.jpg', $src) : $src;
}

// Alle Inhalte plus die Adresse (Slug) jedes Projekts
function siteData(): array
{
    $data = readJson(CONTENT . '/data.json');
    if (!is_array($data) || !isset($data['PROJECTS'], $data['CATS'])) throw new RuntimeException('Inhalte fehlen');
    $data['NAME'] ??= 'Alessio Rosano';
    $ids = projectSlugs($data['PROJECTS']);
    foreach ($data['PROJECTS'] as $i => &$p) $p['id'] = $ids[$i];
    return $data;
}

function projectPath(array $p): string
{
    return 'projekt.html?p=' . rawurlencode($p['id']);
}

function disciplinePath(string $cat): string
{
    return 'disziplin.html?d=' . rawurlencode($cat);
}

// Wichtigstes Bild eines Projekts (für Vorschau beim Teilen und strukturierte Daten)
function projectImage(array $p): string
{
    $src = $p['keyvisual'] ?? '' ?: ($p['images'][0] ?? '') ?: ($p['filmThumb'] ?? '');
    return $src ? siteBase() . stillOf($src) : '';
}

// Ein Wert aus dem Steckbrief im CMS (Tab «Wer»), z. B. «Sprachen»
function aboutSpec(array $data, string $label): string
{
    foreach ($data['ABOUT']['specs'] ?? [] as $row) {
        if (is_array($row) && mb_strtolower(trim((string) ($row[0] ?? ''))) === mb_strtolower($label)) return trim((string) ($row[1] ?? ''));
    }
    return '';
}

/* ── schema.org ──────────────────────────────────────────────── */

function personSchema(array $data): array
{
    $base = siteBase();
    $topics = array_values(array_unique(array_merge(
        array_values($data['CATS']),
        ...array_map(fn ($d) => (array) ($d['tags'] ?? []), $data['DISCIPLINES'] ?? [])
    )));
    $languages = array_values(array_filter(array_map('trim', explode(',', aboutSpec($data, 'Sprachen')))));
    return array_filter([
        '@type' => 'Person',
        '@id' => $base . '#person',
        'name' => $data['NAME'],
        'url' => $base,
        'image' => !empty($data['ABOUT']['portrait']) ? $base . $data['ABOUT']['portrait'] : null,
        'description' => trim((string) preg_split('/\n\s*\n/', (string) ($data['ABOUT']['statement'] ?? ''))[0]) ?: null,
        'email' => !empty($data['CONTACT_EMAIL']) ? 'mailto:' . $data['CONTACT_EMAIL'] : null,
        'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'St.Gallen', 'addressCountry' => 'CH'],
        'knowsAbout' => $topics,
        'knowsLanguage' => $languages ?: null,
        'sameAs' => array_values(array_filter(array_column($data['SOCIAL'] ?? [], 'url'))) ?: null,
    ]);
}

function breadcrumbSchema(array $items): array
{
    return [
        '@type' => 'BreadcrumbList',
        'itemListElement' => array_map(fn ($item, $n) => ['@type' => 'ListItem', 'position' => $n + 1, 'name' => $item[0], 'item' => siteBase() . $item[1]], $items, array_keys($items)),
    ];
}

function projectSchema(array $data, array $p): array
{
    $base = siteBase();
    return array_filter([
        '@type' => 'CreativeWork',
        '@id' => $base . projectPath($p) . '#werk',
        'name' => $p['title'] ?? '',
        'url' => $base . projectPath($p),
        'description' => plainText((string) ($p['desc'] ?? '')) ?: null,
        'genre' => $data['CATS'][$p['cat']] ?? null,
        'dateCreated' => (string) ($p['year'] ?? '') ?: null,
        'image' => projectImage($p) ?: null,
        'keywords' => trim(implode(', ', array_filter([(string) ($p['role'] ?? ''), (string) ($p['tools'] ?? '')]))) ?: null,
        'sourceOrganization' => !empty($p['client']) ? ['@type' => 'Organization', 'name' => $p['client']] : null,
        'creator' => ['@id' => $base . '#person'],
        'inLanguage' => 'de-CH',
    ]);
}

// Als <script type="application/ld+json"> (wird nicht ausgeführt, darum mit der CSP vereinbar)
function jsonLd(array $graph): string
{
    $json = json_encode(['@context' => 'https://schema.org', '@graph' => $graph], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
    return '<script type="application/ld+json" data-ssr>' . $json . '</script>';
}
