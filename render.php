<?php
/* ==========================================================================
   Liefert die Seiten der Website mit fertigem Inhalt aus (siehe .htaccess).
   Viele Crawler (KI-Suchen, Link-Vorschauen) führen kein JavaScript aus und sähen sonst
   nur leere Seiten. Darum setzt der Server Titel, Beschreibung, Canonical, Vorschau-Tags,
   strukturierte Daten und den Text direkt ins HTML. js/main.js baut danach wie bisher auf.
   Geht irgendetwas schief, kommt einfach die unveränderte HTML-Datei.
   ========================================================================== */

require __DIR__ . '/api/seo.php';

const PAGES = ['index' => 'index.html', 'arbeiten' => 'arbeiten.html', 'disziplin' => 'disziplin.html', 'projekt' => 'projekt.html'];

$page = $_GET['page'] ?? 'index';
$file = __DIR__ . '/' . (PAGES[$page] ?? 'index.html');
header('Content-Type: text/html; charset=utf-8');

try {
    echo renderPage($page, (string) file_get_contents($file));
} catch (Throwable $e) {
    error_log('render.php: ' . $e->getMessage());
    readfile($file);
}

function renderPage(string $page, string $html): string
{
    $data = siteData();
    $base = siteBase();
    $name = $data['NAME'];
    $graph = [];
    $fill = [];        // Marker im HTML => Inhalt
    $meta = [];        // title, description, canonical (Pfad), image

    if ($page === 'index') {
        $graph[] = ['@type' => 'WebSite', '@id' => $base . '#website', 'url' => $base, 'name' => $name, 'inLanguage' => 'de-CH', 'publisher' => ['@id' => $base . '#person']];
        $graph[] = ['@type' => 'ProfilePage', 'url' => $base, 'name' => trim(strip_tags(titleOf($html))), 'mainEntity' => ['@id' => $base . '#person']];
        $graph[] = personSchema($data);
        $fill['<h1 class="hero__name name-line" data-name aria-label="Alessio Rosano"></h1>'] = '<h1 class="hero__name name-line" data-name aria-label="' . h($name) . '">' . h($name) . '</h1>';
        $fill['<div class="services__list" data-services></div>'] = '<div class="services__list" data-services>' . implode('', array_map(
            fn ($d) => '<a class="svc" href="' . h(disciplinePath($d['cat'])) . '"><h3>' . h($data['CATS'][$d['cat']] ?? '') . '</h3><p>' . h($d['lead'] ?? '') . '</p></a>',
            $data['DISCIPLINES'] ?? []
        )) . '</div>';
        $fill['<div class="hero__track" data-track></div>'] = '<div class="hero__track" data-track>' . projectLinks($data, $data['PROJECTS']) . '</div>';
        $fill['<p class="about__statement" data-words data-about-statement></p>'] = '<p class="about__statement" data-words data-about-statement>' . h($data['ABOUT']['statement'] ?? '') . '</p>';
        $fill['<dl class="specs mono" data-about-specs></dl>'] = '<dl class="specs mono" data-about-specs>' . specs(array_filter((array) ($data['ABOUT']['specs'] ?? []), 'is_array')) . '</dl>';
    }

    if ($page === 'arbeiten') {
        $meta = ['title' => "Zeig mal — $name", 'description' => "Alle Arbeiten von $name: " . implode(', ', $data['CATS']) . '.', 'canonical' => 'arbeiten.html'];
        $graph[] = ['@type' => 'CollectionPage', 'url' => $base . 'arbeiten.html', 'name' => $meta['title'], 'about' => ['@id' => $base . '#person'],
            'hasPart' => array_map(fn ($p) => ['@id' => $base . projectPath($p) . '#werk', '@type' => 'CreativeWork', 'name' => $p['title'] ?? '', 'url' => $base . projectPath($p)], $data['PROJECTS'])];
        $graph[] = breadcrumbSchema([['Start', ''], ['Zeig mal', 'arbeiten.html']]);
        $html = setHeading($html, 'Zeig mal', 'Zeig mal');
        $fill['<div class="works__grid" data-works></div>'] = '<div class="works__grid" data-works>' . projectLinks($data, $data['PROJECTS']) . '</div>';
    }

    if ($page === 'disziplin') {
        $cat = (string) ($_GET['d'] ?? '');
        $d = current(array_filter($data['DISCIPLINES'] ?? [], fn ($x) => ($x['cat'] ?? '') === $cat));
        if (!$d || !isset($data['CATS'][$cat])) return notFound($html);
        $label = $data['CATS'][$cat];
        $list = array_values(array_filter($data['PROJECTS'], fn ($p) => ($p['cat'] ?? '') === $cat));
        $meta = ['title' => "$label — $name", 'description' => (string) ($d['lead'] ?? ''), 'canonical' => disciplinePath($cat)];
        $graph[] = ['@type' => 'CollectionPage', 'url' => $base . disciplinePath($cat), 'name' => $meta['title'], 'description' => $meta['description'], 'about' => ['@id' => $base . '#person'],
            'hasPart' => array_map(fn ($p) => ['@id' => $base . projectPath($p) . '#werk', '@type' => 'CreativeWork', 'name' => $p['title'] ?? '', 'url' => $base . projectPath($p)], $list)];
        $graph[] = breadcrumbSchema([['Start', ''], [$label, disciplinePath($cat)]]);
        $html = setHeading($html, 'Disziplin', $label);
        $fill['<div class="work__grid" data-work></div>'] = '<div class="work__grid" data-work>' . projectLinks($data, $list) . '</div>';
    }

    if ($page === 'projekt') {
        $id = (string) ($_GET['p'] ?? '');
        $p = current(array_filter($data['PROJECTS'], fn ($x) => $x['id'] === $id));
        if (!$p) return notFound($html);
        $label = $data['CATS'][$p['cat']] ?? '';
        $title = (string) ($p['title'] ?? '');
        $meta = [
            'title' => "$title — $name",
            'description' => plainText((string) ($p['desc'] ?? '')) ?: "$title: $label-Projekt von $name, " . ($p['year'] ?? '') . '.',
            'canonical' => projectPath($p),
            'image' => projectImage($p),
        ];
        $graph[] = projectSchema($data, $p);
        $graph[] = ['@type' => 'Person', '@id' => $base . '#person', 'name' => $name, 'url' => $base];
        $graph[] = breadcrumbSchema([['Start', ''], [$label, disciplinePath($p['cat'])], [$title, projectPath($p)]]);
        $html = setHeading($html, 'Projekt', $title);
        $fill['<p class="reveal-up" data-p-role></p>'] = '<p class="reveal-up" data-p-role>' . h($p['role'] ?? '') . '</p>';
        $fill['<p class="pinfo__desc" data-p-desc></p>'] = '<p class="pinfo__desc" data-p-desc>' . linkify((string) ($p['desc'] ?? '')) . '</p>';
        $fill['<dl class="specs mono" data-p-specs></dl>'] = '<dl class="specs mono" data-p-specs>' . specs([
            ['Kunde', $p['client'] ?? ''], ['Disziplin', $label], ['Jahr', $p['year'] ?? ''], ['Rolle', $p['role'] ?? ''], ['Tools', $p['tools'] ?? ''],
        ]) . '</dl>';
    }

    foreach ($fill as $marker => $content) $html = str_replace($marker, $content, $html);
    if ($meta) $html = setMeta($html, $meta);
    return str_replace('</head>', '  ' . jsonLd($graph) . "\n</head>", $html);
}

/* ── Bausteine ───────────────────────────────────────────────── */

function titleOf(string $html): string
{
    return preg_match('#<title>(.*?)</title>#s', $html, $m) ? html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8') : '';
}

// Projekte als einfache Links (js/main.js ersetzt sie durch die Karten)
function projectLinks(array $data, array $list): string
{
    return implode('', array_map(fn ($p) => '<a href="' . h(projectPath($p)) . '"><h3>' . h($p['title'] ?? '') . '</h3><p>'
        . h(implode(', ', array_filter([$data['CATS'][$p['cat']] ?? '', (string) ($p['year'] ?? ''), (string) ($p['role'] ?? '')]))) . '</p></a>', $list));
}

function specs(array $rows): string
{
    return implode('', array_map(fn ($r) => '<div><dt>' . h($r[0] ?? '') . '</dt><dd>' . h($r[1] ?? '') . '</dd></div>',
        array_filter($rows, fn ($r) => trim((string) ($r[1] ?? '')) !== '')));
}

// Grosser Titel der Unterseite: Name im data-name und als Text (main.js ersetzt den Text durch die animierten Buchstaben)
function setHeading(string $html, string $placeholder, string $text): string
{
    $html = str_replace("data-name=\"$placeholder\"", 'data-name="' . h($text) . '"', $html);
    return (string) preg_replace('#(<h1 class="hero__name name-line"[^>]*?)(?: aria-label="[^"]*")?></h1>#', '$1 aria-label="' . h($text) . '">' . h($text) . '</h1>', $html, 1);
}

function setMeta(string $html, array $meta): string
{
    $url = siteBase() . $meta['canonical'];
    $title = h($meta['title']);
    $desc = h(shortText($meta['description']));
    $html = (string) preg_replace('#<title>.*?</title>#s', "<title>$title</title>", $html, 1);
    $html = (string) preg_replace('#<meta name="description" content="[^"]*" />#', "<meta name=\"description\" content=\"$desc\" />", $html, 1);
    $html = (string) preg_replace('#<meta property="og:title" content="[^"]*" />#', "<meta property=\"og:title\" content=\"$title\" />", $html, 1);
    $html = (string) preg_replace('#<meta property="og:description" content="[^"]*" />#', "<meta property=\"og:description\" content=\"$desc\" />", $html, 1);
    $html = (string) preg_replace('#\s*<(link rel="canonical"|meta property="og:url") [^>]*/>#', '', $html);   // ersetzt allfällige feste Angaben
    $tags = '<link rel="canonical" href="' . h($url) . '" />' . "\n  " . '<meta property="og:url" content="' . h($url) . '" />';
    if (!empty($meta['image'])) {
        // Eigenes Bild des Projekts statt des allgemeinen Vorschaubilds (Grösse unbekannt, also ohne width/height)
        $html = (string) preg_replace('#\s*<meta property="og:image(:width|:height|:alt)?" content="[^"]*" />#', '', $html);
        $tags .= "\n  " . '<meta property="og:image" content="' . h($meta['image']) . '" />' . "\n  " . '<meta property="og:image:alt" content="' . $title . '" />';
    }
    return (string) preg_replace('#<meta property="og:type"#', $tags . "\n  " . '<meta property="og:type"', $html, 1);
}

// Unbekannte Disziplin oder unbekanntes Projekt: echter 404, nicht indexieren (main.js leitet zur Startseite)
function notFound(string $html): string
{
    http_response_code(404);
    return str_replace('</head>', '  <meta name="robots" content="noindex" />' . "\n</head>", $html);
}
