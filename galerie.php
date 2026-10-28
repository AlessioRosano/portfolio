<?php
/* ==========================================================================
   Passwortgeschützte Galerie für Kund:innen: galerie.php?g=<name>
   Verwaltet im CMS unter «Galerien».
   ========================================================================== */

require __DIR__ . '/api/lib.php';

ensureStorage();
startSession();

$slug = (string) ($_GET['g'] ?? '');
$gallery = validSlug($slug) ? (galleries()[$slug] ?? null) : null;
$error = '';

if ($gallery && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals(csrfToken(), (string) ($_POST['csrf'] ?? ''))) {
        $error = 'Sitzung abgelaufen — bitte nochmals versuchen.';
    } elseif (failedAttempts("gallery:$slug") >= MAX_ATTEMPTS) {
        $error = 'Zu viele Fehlversuche — bitte in 15 Minuten erneut versuchen.';
    } elseif (hash_equals($gallery['password'], (string) ($_POST['password'] ?? ''))) {
        clearAttempts("gallery:$slug");
        session_regenerate_id(true);
        $_SESSION['galleries'][$slug] = true;
        header('Location: galerie.php?g=' . rawurlencode($slug), true, 303);
        exit;
    } else {
        failedAttempts("gallery:$slug", true);
        usleep(400000);
        $error = 'Falsches Passwort.';
    }
}

$state = match (true) {
    !$gallery => 'missing',
    galleryExpired($gallery) && !isAdmin() => 'expired',
    !canViewGallery($slug) => 'locked',
    default => 'open',
};
$files = $state === 'open' ? galleryFiles($slug) : [];
$totalSize = array_sum(array_column($files, 'size'));
// Fotos und Videos öffnen in der Grossansicht (zum Durchblättern), PDFs im PDF-Betrachter des Browsers
$media = array_values(array_filter($files, fn ($f) => $f['kind'] !== 'pdf'));

$h = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$url = fn ($file, $extra = '') => 'api/file.php?g=' . rawurlencode($slug) . '&f=' . rawurlencode($file) . $extra;
function bytes(int $b): string
{
    foreach (['B', 'KB', 'MB', 'GB'] as $i => $unit) if ($b < 1024 ** ($i + 1) || $unit === 'GB') return round($b / 1024 ** $i, $i > 1 ? 1 : 0) . " $unit";
    return "$b B";
}
$dateText = $gallery && $gallery['date'] ? date('d.m.Y', strtotime($gallery['date'])) : '';

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: same-origin');
?><!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title><?= $state === 'open' ? $h($gallery['title']) . ' — ' : '' ?>Galerie — Alessio Rosano</title>
  <meta name="theme-color" content="#ff6600" />
  <link rel="icon" href="favicon.ico" sizes="48x48" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="icon-192.png" type="image/png" sizes="192x192" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <script src="js/theme.js"></script>
  <link rel="preconnect" href="https://use.typekit.net" crossorigin />
  <link rel="stylesheet" href="https://use.typekit.net/fip2xll.css" />   <!-- Neue Haas Grotesk Display (Adobe Fonts) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bx: #ff6600;
    }
    /* Gleiche Besuchsfarbe wie auf der Website (js/theme.js) */
    :root[data-theme="pink"] { --bx: #fa51e1; }
    :root[data-theme="blue"] { --bx: #1f3fff; }
    :root {
      --bx-15: color-mix(in srgb, var(--bx) 15%, white);
      --bx-08: color-mix(in srgb, var(--bx) 8%, white);
      --white: #fff;
      --pad: clamp(16px, 2vw, 32px);
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100svh; display: flex; flex-direction: column;
      background: var(--white); color: var(--bx);
      font: 500 clamp(15px, 1.05vw, 18px)/1.45 "neue-haas-grotesk-display", "Helvetica Neue", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    img, video { display: block; max-width: 100%; }
    .mono { font-family: "JetBrains Mono", ui-monospace, monospace; font-weight: 400; font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase; }
    .serif { font-family: "Instrument Serif", Georgia, serif; font-style: italic; font-weight: 400; }
    .bar { display: flex; justify-content: space-between; align-items: center; padding: 14px var(--pad); }
    .logo { display: inline-flex; width: 30px; }
    .logo svg { width: 100%; height: auto; }
    .logo rect { fill: var(--bx); }
    .logo text { fill: var(--white); font: 700 14px Arial, Helvetica, sans-serif; }
    main { flex: 1; padding: 0 var(--pad) var(--pad); }
    h1 {
      margin: clamp(32px, 6vw, 96px) 0 18px; font-size: clamp(44px, 8vw, 150px); font-weight: 700;
      letter-spacing: -0.035em; word-spacing: 0.05em; line-height: 0.88; text-transform: uppercase;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 12px; padding: 14px 24px; border-radius: 999px;
      background: var(--bx); color: var(--white); font: inherit; font-weight: 700; border: 0; cursor: pointer;
    }
    .btn i { font-style: normal; transition: transform .4s cubic-bezier(.16, 1, .3, 1); }
    .btn:hover i { transform: translateY(3px); }

    /* Passwort / Hinweise */
    .gate { max-width: 520px; margin: clamp(48px, 12vh, 160px) auto 0; }
    .gate h1 { font-size: clamp(44px, 7vw, 96px); margin-top: 0; }
    .gate p { margin: 0 0 28px; font-weight: 500; }
    .gate form { display: flex; gap: 10px; flex-wrap: wrap; }
    .gate input {
      flex: 1 1 220px; padding: 14px 18px; border-radius: 999px; border: 1.5px solid var(--bx-15);
      font: inherit; color: inherit; outline: none;
    }
    .gate input:focus { border-color: var(--bx); }
    .error { margin-top: 14px !important; }

    /* Galerie */
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: clamp(28px, 4vw, 56px); }
    .head .mono { opacity: .6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: var(--pad); }
    .item { margin: 0; }
    .item__media {
      position: relative; aspect-ratio: 4 / 5; border-radius: var(--radius); overflow: hidden;
      background: var(--bx-08); cursor: zoom-in; border: 0; padding: 0; width: 100%;
    }
    .item__media img, .item__media video { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.16, 1, .3, 1); }
    .item__media:hover img, .item__media:hover video { transform: scale(1.04); }
    .item__media--pdf { display: grid; place-items: center; text-decoration: none; color: var(--bx); cursor: pointer; }
    .item__pdf { font-size: clamp(40px, 5vw, 72px); font-weight: 700; letter-spacing: -0.02em; transition: transform 1s cubic-bezier(.16, 1, .3, 1); }
    .item__media--pdf:hover .item__pdf { transform: scale(1.06); }
    .item__play { position: absolute; inset: auto 12px 12px auto; background: var(--white); color: var(--bx); border-radius: 999px; padding: 6px 12px; }
    .item figcaption { display: flex; justify-content: space-between; gap: 10px; padding: 10px 2px 0; }
    .item figcaption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .6; }
    .item figcaption a:hover { opacity: .6; }

    /* Grossansicht */
    dialog { border: 0; padding: 0; max-width: none; max-height: none; width: 100vw; height: 100svh; background: rgba(255,255,255,.97); color: var(--bx); }
    dialog::backdrop { background: transparent; }
    .lb { height: 100%; display: grid; grid-template-rows: auto 1fr; }
    .lb__bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px var(--pad); }
    .lb__bar button, .lb__bar a { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
    .lb__stage { position: relative; display: grid; place-items: center; padding: 0 var(--pad) var(--pad); min-height: 0; }
    .lb__stage img, .lb__stage video { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
    .lb__nav { position: absolute; top: 0; bottom: 0; width: 25%; background: none; border: 0; cursor: pointer; }
    .lb__nav--prev { left: 0; cursor: w-resize; } .lb__nav--next { right: 0; cursor: e-resize; }

    footer { display: flex; justify-content: space-between; padding: 24px var(--pad); opacity: .6; }
  </style>
</head>
<body>
  <header class="bar">
    <a class="logo" href="index.html" aria-label="Alessio Rosano, zur Website"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6"/><text x="16" y="21.5" text-anchor="middle">AR</text></svg></a>
    <span class="mono">Galerie<?= $state === 'open' ? ' — ' . count($files) . ' Dateien' : '' ?></span>
  </header>

  <main>
<?php if ($state === 'missing'): ?>
    <section class="gate">
      <h1>Hier ist nichts</h1>
      <p>Entweder hat sich im Link ein Fehler eingeschlichen oder die Galerie ist schon weg. Schreib mir kurz, dann finden wir sie.</p>
    </section>

<?php elseif ($state === 'expired'): ?>
    <section class="gate">
      <h1>Abgelaufen</h1>
      <p>Die Dateien sind nicht mehr online. Brauchst du sie trotzdem? Schreib mir, das lässt sich lösen.</p>
    </section>

<?php elseif ($state === 'locked'): ?>
    <section class="gate">
      <p class="mono"><?= $h($dateText) ?></p>
      <h1><?= $h($gallery['title']) ?></h1>
      <p>Gib das Passwort ein, das du von mir bekommen hast. Dann geht’s los.</p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= $h(csrfToken()) ?>" />
        <input type="password" name="password" placeholder="Passwort" required autofocus autocomplete="current-password" aria-label="Passwort" />
        <button class="btn" type="submit">Öffnen <i>→</i></button>
      </form>
      <?php if ($error): ?><p class="mono error" role="alert"><?= $h($error) ?></p><?php endif; ?>
    </section>

<?php else: ?>
    <h1><?= $h($gallery['title']) ?></h1>
    <div class="head">
      <p class="mono"><?= $h(implode(' — ', array_filter([$dateText, count($files) . ' Dateien', bytes($totalSize), $gallery['expires'] ? 'Verfügbar bis ' . date('d.m.Y', strtotime($gallery['expires'])) : '']))) ?></p>
      <?php if ($files): ?><a class="btn" href="api/zip.php?g=<?= $h(rawurlencode($slug)) ?>">Alle herunterladen <span class="mono">(ZIP)</span> <i>↓</i></a><?php endif; ?>
    </div>

    <?php if (!$files): ?>
      <p>Noch leer. Die Dateien kommen bald, versprochen.</p>
    <?php endif; ?>

    <div class="grid">
      <?php foreach ($files as $f): ?>
      <figure class="item">
        <?php if ($f['kind'] === 'pdf'): ?>
        <a class="item__media item__media--pdf" href="<?= $h($url($f['name'])) ?>" target="_blank" rel="noopener" aria-label="<?= $h($f['name']) ?> ansehen (PDF, neuer Tab)">
          <span class="item__pdf">PDF</span>
          <span class="item__play mono">Ansehen ↗</span>
        </a>
        <?php else: ?>
        <button class="item__media" type="button" data-open="<?= array_search($f, $media, true) ?>" aria-label="<?= $h($f['name']) ?> gross ansehen">
          <?php if ($f['thumb']): ?>
            <img src="<?= $h($url($f['name'], '&thumb=1')) ?>" alt="" loading="lazy" decoding="async" />
          <?php elseif ($f['kind'] === 'video'): ?>
            <video src="<?= $h($url($f['name'])) ?>#t=0.5" preload="metadata" muted playsinline></video>
          <?php else: ?>
            <img src="<?= $h($url($f['name'])) ?>" alt="" loading="lazy" decoding="async" />
          <?php endif; ?>
          <?php if ($f['kind'] === 'video'): ?><span class="item__play mono">▶ Video</span><?php endif; ?>
        </button>
        <?php endif; ?>
        <figcaption class="mono">
          <span><?= $h($f['name']) ?> · <?= bytes($f['size']) ?></span>
          <a href="<?= $h($url($f['name'], '&dl=1')) ?>" download>Download ↓</a>
        </figcaption>
      </figure>
      <?php endforeach; ?>
    </div>

    <dialog data-lightbox aria-label="Grossansicht">
      <div class="lb">
        <div class="lb__bar mono">
          <span data-lb-name></span>
          <span><a data-lb-dl href="#" download>Download ↓</a>&emsp;<button type="button" data-lb-close>Schliessen ✕</button></span>
        </div>
        <div class="lb__stage" data-lb-stage></div>
      </div>
    </dialog>

    <script type="application/json" id="gallery-files"><?= json_encode(array_map(fn ($f) => [
        'name' => $f['name'],
        'kind' => $f['kind'],
        // Grossansicht: Fotos als 2000-px-Vorschau, Videos im Original; Download immer das Original
        'src' => $url($f['name'], $f['kind'] === 'image' && $f['thumb'] ? '&preview=1' : ''),
        'poster' => $f['kind'] === 'video' && $f['thumb'] ? $url($f['name'], '&thumb=1') : '',
        'dl' => $url($f['name'], '&dl=1'),
    ], $media), JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
    <script src="js/galerie.js"></script>
<?php endif; ?>
  </main>

  <footer class="mono"><span>© <?= date('Y') ?> Alessio Rosano</span><a href="index.html">Website ↗</a></footer>
</body>
</html>
