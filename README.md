# Portfolio Alessio Rosano

**Live:** https://alessiorosano.ch

Das ist mein persönliches Portfolio für meine vier Disziplinen **Video, Branding/Web, Kampagnen und Architektur**.
Ich habe es als Projekt im Rahmen des Moduls **Interaktive Medien** an der FH Graubünden umgesetzt.

Begonnen hat es als statische Website. Daraus ist ein kleines, selbst gebautes System geworden:

- eine animierte Portfolio-Website
- ein eigenes **CMS** unter `/admin`, mit dem ich alle Inhalte online pflege, ohne Code anzufassen
- **passwortgeschützte Download-Galerien**, über die ich Kund:innen Fotos und Videos von Anlässen übergebe
- ein **automatischer Deploy**: Ich pushe auf GitHub, und der Code landet auf meinem Hosting bei Infomaniak

In diesem README beschreibe ich, wie das Projekt entstanden ist, wie es technisch aufgebaut ist und warum ich welche Entscheidungen getroffen habe.

---

## Inhalt

1. [Projektverlauf](#projektverlauf)
2. [Was die Website kann](#was-die-website-kann)
3. [Technischer Aufbau](#technischer-aufbau)
4. [Das CMS](#das-cms)
5. [Download-Galerien](#download-galerien)
6. [Bilder und Performance (Proxies)](#bilder-und-performance-proxies)
7. [Sicherheit](#sicherheit)
8. [Deploy: von Git zu Infomaniak](#deploy-von-git-zu-infomaniak)
9. [Lokal arbeiten](#lokal-arbeiten)
10. [Backups](#backups)
11. [Arbeitsweise](#arbeitsweise)
12. [Schwierigkeiten](#schwierigkeiten)
13. [Learnings](#learnings)
14. [Ressourcen](#ressourcen)

---

## Projektverlauf

### 1. Statische Website (September 2026)

Am Anfang stand eine reine HTML/CSS/JS-Seite:

- eine Startseite mit grossem Namen, einem endlosen Bild-Slider und den Disziplinen
- je eine Unterseite pro Disziplin und eine Projektseite
- **GSAP** und **ScrollTrigger** für Intro, Seitenübergänge und Scroll-Animationen, **Lenis** für weiches Scrollen
- ein eigener Cursor, ein Farbschalter (Orange/Pink) und ein Raster-Overlay, das man mit der Taste **G** einblendet

Für Projekte ohne Bilder erzeugt `js/art.js` passende Platzhalter-Grafiken als SVG, z.B. Grundriss, Filmframe oder Plakat.

Gepflegt habe ich die Inhalte anfangs mit einem lokalen CMS (`admin.html`). Es schrieb über die File System Access API direkt in `js/data.js` in meinem Projektordner. Das funktionierte aber nur lokal: Nach jeder Änderung musste ich die Dateien von Hand hochladen.

### 2. Aufräumen und Vereinfachen

Bevor ich die Seite erweitert habe, habe ich den Code überarbeitet:

- **Eine Vorlage statt vier Seiten:** Die vier fast identischen Disziplin-Seiten (`branding.html`, `video.html` …) habe ich durch eine einzige `disziplin.html?d=…` ersetzt. Die Inhalte kommen ohnehin aus den Daten.
- **Grafikfarben über CSS:** Die Platzhalter-Grafiken verwenden jetzt die CSS-Variablen der Seite. Beim Farbwechsel färben sie sich von selbst um. Etwa 50 Zeilen Umrechnungs-Code fielen dadurch weg.
- **Gemeinsame Hilfsfunktionen** in `js/utils.js` für Website und CMS
- **Toter Code entfernt** (alter Ticker, ungenutzte CSS-Regeln, veraltete Datenfelder) und Farbfehler korrigiert

Das Ergebnis war rund 15 % weniger Code bei gleichem Aussehen.

### 3. Eigenes Online-CMS mit PHP

Ich wollte meine Inhalte online pflegen können und brauchte ausserdem geschützte Download-Seiten für Kund:innen. Dafür reicht eine statische Seite nicht: Jede hochgeladene Datei wäre über ihre Adresse für alle abrufbar. Deshalb habe ich ein eigenes CMS in **PHP** gebaut. Mein Infomaniak-Hosting unterstützt PHP ohnehin.

Die wichtigste Entscheidung dabei war die **Trennung von Code und Inhalten**:

| | Wo es liegt | Wie es auf den Server kommt |
|---|---|---|
| **Code** (HTML, CSS, JS, PHP) | Git / GitHub | automatisch per GitHub Action |
| **Inhalte** (Texte, Bilder, Galerien) | nur auf dem Server | über das CMS |

So kann ein Deploy nie meine Inhalte überschreiben, und grosse Kundenvideos landen nie in Git.

Als Alternative hatte ich ein Git-basiertes CMS (Pages CMS / Sveltia) geprüft. Die geschützten Galerien wären damit aber nicht sauber lösbar gewesen, und Videos gehören nicht in ein Repository.

### 4. Sicherheitsprüfung

Bevor die Seite live ging, habe ich das ganze Projekt gezielt auf Lücken geprüft und die Angriffe lokal nachgestellt. Dabei habe ich eine echte Lücke gefunden: Eine **SVG-Datei mit Script, als `.jpg` getarnt**, wäre in einer Galerie angenommen und auf meiner Domain ausgeführt worden. Diese und neun weitere Schwachstellen habe ich behoben (Details unter [Sicherheit](#sicherheit)).

### 5. Live auf Infomaniak

Beim ersten Deploy landeten die Dateien im FTP-Startordner statt im Website-Ordner auf dem Server. Auf der Domain lief noch ein alter Stand einer anderen Seite. Ich habe den Zielordner als Secret `FTP_DIR` festgelegt, die alten Dateien entfernt und HTTPS erzwungen.

### 6. Inhaltliche Überarbeitung

- Standort **St.Gallen**, die Koordinaten habe ich entfernt
- Navigation **„Was“** (Disziplinen) und **„Wer“** (über mich)
- Neue Disziplinen: **Video, Branding/Web, Kampagnen, Architektur**
- Der **Wer-Bereich** (Text, Portrait, Steckbrief, Status) und die **Social-Links** sind jetzt im CMS pflegbar

Weil die Inhalte auf dem Server liegen, habe ich dafür eine **automatische Daten-Umstellung** gebaut. Sie läuft beim ersten Aufruf nach dem Deploy, legt vorher ein Backup an und übernimmt alles, was ich online schon geändert hatte. Beim ersten Durchlauf hat sie einmal zu früh gestartet, als der Upload noch nicht fertig war. Seither wartet sie, bis alle Dateien da sind.

### 7. Bild-Proxies für mehr Tempo

Zum Schluss habe ich die Ladezeit optimiert: automatische Bildvarianten mit `srcset` und WebP fürs Portfolio, dazu Vorschauen und Video-Standbilder in den Galerien. Die Startseite lädt seither **rund 68 % weniger Bilddaten** (Details unter [Bilder und Performance](#bilder-und-performance-proxies)).

---

## Was die Website kann

**Startseite (`index.html`)**
- Intro-Animation (nur beim ersten Besuch, danach ein kurzer Übergang)
- endloser Projekt-Slider zum Ziehen, der beim Scrollen beschleunigt
- **Was:** die vier Disziplinen mit Hover-Details und Vorschaubildern
- **Wer:** Text, der beim Scrollen Wort für Wort erscheint, mit Portrait und Steckbrief
- Kontaktformular (öffnet das Mail-Programm, es braucht keinen Server-Versand)

**Disziplin-Seite (`disziplin.html?d=video`)**: Einleitung, Stichworte, Projekte, Arbeitsweise in drei Schritten, Link zur nächsten Disziplin

**Projektseite (`projekt.html?p=…`)**: grosses Titelbild mit Zoom beim Scrollen, Beschreibung, Steckbrief, Bildgalerie, Link zum nächsten Projekt

**Überall**: Farbschalter Orange/Pink (wird gespeichert), Live-Uhr, Scroll-Fortschritt, eigener Cursor, Seitenübergänge, Raster-Overlay mit Taste **G**, Rücksicht auf „Bewegung reduzieren“ in den Systemeinstellungen

Fotos erscheinen in den Übersichten schwarz-weiss und auf der Projektseite in Farbe.

---

## Technischer Aufbau

**Stack:** HTML, CSS (Custom Properties, `color-mix`), Vanilla JavaScript, GSAP 3 + ScrollTrigger, Lenis, PHP 8 (ohne Framework), Apache (`.htaccess`), GitHub Actions. Es gibt bewusst keinen Build-Schritt, kein npm und keine Datenbank. Die Inhalte liegen in einer JSON-Datei.

```
portfolio/
├── index.html, disziplin.html, projekt.html   Website (Inhalte kommen per JS aus der API)
├── galerie.php                                Galerie-Seite für Kund:innen
├── css/style.css                              Gestaltung; alle Farben aus einer Variable --bx
├── js/
│   ├── main.js        Website: Inhalte laden, aufbauen, animieren
│   ├── art.js         Platzhalter-Grafiken als SVG
│   ├── utils.js       gemeinsame Helfer (Website + CMS)
│   ├── galerie.js     Grossansicht der Galerie
│   ├── theme.js       Farbschalter vor dem ersten Zeichnen
│   └── vendor/        GSAP, ScrollTrigger, Lenis (lokal statt CDN)
├── admin/             CMS (index.html + admin.js)
├── api/
│   ├── lib.php        Basis: Session, CSRF, Login-Sperre, Dateien, Bild-Proxies, Daten-Umstellung
│   ├── data.php       öffentlich: Inhalte + Bildvarianten als JSON
│   ├── admin.php      CMS-Schnittstelle (Login, Speichern, Uploads, Galerien, Backup)
│   ├── file.php       liefert Galerie-Dateien aus (nur mit Passwort)
│   └── zip.php        ganze Galerie als ZIP
├── setup/             Startinhalte für einen leeren Server
├── .htaccess          HTTPS, Sicherheits-Header, gesperrte Dateien
├── .user.ini          PHP-Limits (Uploads, Laufzeit), keine Fehlermeldungen im Browser
└── .github/workflows/deploy.yml   automatischer Deploy
```

Nur auf dem Server, nicht in Git:

```
content/   data.json, Projektbilder + WebP-Varianten           (öffentlich lesbar)
storage/   Galerien, Vorschauen, Backups, Login-Sperren          (von aussen gesperrt)
```

**So kommen die Inhalte auf die Seite:** `main.js` lädt beim Start `api/data.php` und erhält Texte, Projekte, Disziplinen, den Wer-Bereich, Social-Links und die Liste der Bildvarianten. Daraus baut es die Seite auf. Erst danach starten Intro und Animationen.

---

## Das CMS

Erreichbar unter `/admin`, geschützt mit einem Passwort.

| Tab | Was ich dort pflege |
|---|---|
| **Projekte** | Titel, Jahr, Disziplin, Rolle, Tools, Beschreibung, Link, Bilder (Drag & Drop, Reihenfolge, Titelbild), Platzhalter-Grafik, Reihenfolge der Projekte |
| **Disziplinen** | Name, Einleitung, Stichworte, Tools, drei Arbeitsschritte |
| **Wer** | Text, Portrait, Bildunterschrift, Steckbrief-Zeilen, Status |
| **Galerien** | Galerien für Kund:innen anlegen, Dateien hochladen, Link und Passwort weitergeben |
| **Allgemein** | Kontakt-E-Mail, Social-Links, Backup herunterladen |

- **Speichern** (oder ⌘S) stellt die Änderungen sofort live. Der Server prüft dabei jedes Feld.
- Bilder werden schon **im Browser** auf 2400 px verkleinert, bevor sie hochgeladen werden.
- Wer ungespeicherte Änderungen hat oder einen Upload laufen lässt, wird beim Verlassen gewarnt.

---

## Download-Galerien

Über Galerien gebe ich Kund:innen Fotos und Videos von Anlässen weiter.

- Im CMS lege ich eine Galerie an: Titel, Datum, **Passwort** (wird automatisch erzeugt) und optional ein **Ablaufdatum**.
- Fotos und Videos ziehe ich einfach hinein, auch mehrere GB. Grosse Dateien werden in **Stücken** hochgeladen (bis 8 MB, angepasst an das Upload-Limit des Servers), mit Fortschrittsanzeige.
- „Link + Passwort kopieren“ ergibt einen fertigen Text für die Kund:innen.
- Die Kundenseite `galerie.php?g=…` zeigt nach der Passworteingabe alle Dateien. Fotos lassen sich gross ansehen und durchblättern, Videos abspielen und spulen. Herunterladen geht einzeln oder als **ZIP**.
- Die Dateien liegen im gesperrten Ordner `storage/`. Ausgeliefert werden sie nur über `api/file.php`, und zwar erst nach der Passwort-Prüfung. Direkte Links funktionieren nicht.
- Das ZIP wird ohne erneute Kompression erstellt (Fotos und Videos sind schon komprimiert) und zwischengespeichert, solange sich die Dateien nicht ändern.

---

## Bilder und Performance (Proxies)

Das Problem: Ursprünglich gab es jedes Bild nur in **einer** Grösse (2400 px, 300–800 KB). Dieselbe Datei lud im Slider, in 100 px kleinen Hover-Vorschauen und auf der Projektseite.

### Portfolio: Varianten mit `srcset`

```
Upload im CMS ──► Browser verkleinert auf max. 2400 px (JPG)
               ──► Server (PHP/GD) erzeugt WebP-Varianten:
                   bild.jpg → bild.w480.webp, bild.w960.webp, bild.w1600.webp, bild.w2400.webp
               ──► api/data.php liefert die Liste mit (IMAGES)
               ──► main.js baut <img srcset="…" sizes="…">, der Browser wählt die passende Grösse
```

- Für jede Stelle gebe ich mit `sizes` die ungefähre Anzeigebreite an, z.B. `120px` für die Hover-Vorschau oder `100vw` für das Titelbild.
- `width`/`height` verhindern, dass das Layout beim Laden springt. Das Titelbild lädt mit `fetchpriority="high"`, alles andere erst, wenn es ins Bild scrollt.
- **Ältere Bilder** bekommen ihre Varianten automatisch: `api/data.php` holt fehlende pro Aufruf nach, nur so viele, wie in 1,5 Sekunden passen.
- **Messung auf der Startseite:** **126 KB statt 389 KB Bilddaten (−68 %)**. Beispiel „ja mudda“: Original 283 KB, Variante 960 px 51 KB, Variante 480 px 27 KB.

### Galerien: Vorschauen statt Originale

| Ansicht | Was geladen wird |
|---|---|
| Übersicht | Vorschau mit 800 px (JPG) |
| Grossansicht | Vorschau mit 2000 px, das nächste Foto wird vorgeladen |
| Download / ZIP | Original |
| Video in der Übersicht | Standbild (wird beim Upload **im Browser** aus dem Video gezogen) |

Ein Test-Foto mit 19 MB ergibt in der Übersicht 0,2 MB und in der Grossansicht 1,4 MB. Vorschauen für ältere Fotos entstehen beim ersten Abruf. Handy-Fotos werden gemäss ihrer EXIF-Angabe richtig gedreht.

**Grenzen:**
- Videos werden in Originalqualität gestreamt. Kleinere Versionen bräuchten `ffmpeg`, und das gibt es auf normalem Webhosting nicht.
- HEIC-Fotos zeigen nur Safari-Browser an.

---

## Suchmaschinen (SEO)

- **Sitemap** unter `/sitemap.xml`: Sie wird aus den CMS-Inhalten erzeugt (`sitemap.php`), neue Projekte sind also automatisch drin.
- **`robots.txt`:** Die Website ist erlaubt, CMS, API und Kunden-Galerien sind gesperrt. Ausnahme ist `api/data.php`, damit Google die Inhalte laden kann.
- **Eine Adresse:** `www.` und `http://` leiten mit einer einzigen Weiterleitung auf `https://alessiorosano.ch` um. Jede Seite hat einen Canonical-Link.
- **Titel und Beschreibung** passend zu jeder Disziplin und jedem Projekt (gesetzt per JavaScript, das Google ausführt)
- **Vorschau beim Teilen** (Open Graph): eigenes Vorschaubild `img/og.jpg` mit 1200 × 630 px
- **Strukturierte Daten** (schema.org): `Person` auf der Startseite (mit Social-Links aus dem CMS) und `CreativeWork` für Projekte
- **Name als Text:** Der grosse animierte Name besteht aus einzelnen Buchstaben. Google liest ihn trotzdem korrekt als „Alessio Rosano“.
- Angemeldet ist die Seite in der Google Search Console, mit eingereichter Sitemap.

## Sicherheit

Die Sicherheit beruht nicht darauf, dass der Code geheim ist. Darum kann dieses Repository öffentlich sein.

**Zugang**
- Keine Zugangsdaten im Code oder im Git-Verlauf. FTP-Daten und CMS-Passwort sind nur GitHub-Secrets.
- Auf dem Server liegt nur ein **Hash** des CMS-Passworts. Ihn erzeugt der Deploy aus dem Secret.
- Nach 5 Fehlversuchen wird das Login 15 Minuten gesperrt (pro IP, auch für Galerie-Passwörter).
- Sitzungen sind mit Session-Cookies `HttpOnly`, `Secure` und `SameSite` geschützt, dazu Strict Mode und eine neue Sitzungs-ID nach dem Login. Nach 8 Stunden ohne Aktivität läuft die Sitzung ab.
- **CSRF-Token** bei jeder Änderung

**Uploads**
- Nur erlaubte Bild- und Videoformate. Geprüft wird der **echte Dateiinhalt**, nicht nur die Endung. SVG und HTML sind nie erlaubt.
- Dateien werden mit fester Dateiart, `nosniff` und einer **Sandbox-CSP** ausgeliefert. Selbst eine manipulierte Datei könnte kein Script ausführen.
- Dateinamen werden bereinigt, Pfad-Tricks (`../`) sind wirkungslos.
- Im Ordner `content/` kann kein Script ausgeführt werden.

**Inhalte**
- Der Server prüft beim Speichern jedes Feld: nur `https://`-Links, nur eigene Bildpfade, gültige E-Mail, Längenbegrenzungen.
- Alle Texte werden beim Einsetzen ins HTML escaped.

**Server**
- **Content-Security-Policy:** nur eigene Scripts, kein Einbetten in fremde Seiten. GSAP und Lenis liegen deshalb lokal statt auf einem CDN.
- HTTPS wird erzwungen, HSTS ist aktiv, dazu `X-Frame-Options`, `Referrer-Policy` und `Permissions-Policy`.
- Interne Dateien sind gesperrt: `api/config.local.php`, `api/lib.php`, `setup/`, `storage/`, `.htaccess`, `.user.ini`, README, Workflow.
- PHP-Fehlermeldungen erscheinen nie im Browser.
- Das CMS prüft selbst, ob `storage/` von aussen erreichbar ist, und warnt in diesem Fall rot.

**Deploy**
- Die GitHub Actions sind auf feste Commits festgenagelt, der Workflow hat nur Leserechte.
- Er startet nur bei einem Push auf `main` oder manuell, also nie durch fremde Pull Requests.

**Geprüft durch nachgestellte Angriffe:** SVG als Foto, HTML als Video, `javascript:`-Link, fremde Bildpfade, HTML in Feldern, direkter Zugriff auf Galerie-Dateien und interne Dateien, Brute Force auf Passwörter. Alle werden abgewehrt.

---

## Deploy: von Git zu Infomaniak

```
git push (main) ──► GitHub Action
                    1. CMS-Passwort-Hash aus dem Secret erzeugen (api/config.local.php)
                    2. per FTPS hochladen: nur geänderte Dateien, ohne content/ und storage/
                ──► beim ersten Aufruf: fehlende Ordner anlegen, Daten bei Bedarf umstellen
```

**Einmalig einrichten:** Auf GitHub unter *Settings → Secrets and variables → Actions*:

| Secret | Inhalt |
|---|---|
| `FTP_SERVER` | FTP-Host aus dem Infomaniak Manager |
| `FTP_USERNAME`, `FTP_PASSWORD` | FTP-Zugang |
| `FTP_DIR` | Website-Ordner auf dem Server |
| `ADMIN_PASSWORD` | Passwort fürs CMS |

**CMS-Passwort ändern:** das Secret anpassen, dann *Actions → Deploy zu Infomaniak → Run workflow*.

Auf einem leeren Server übernimmt die Seite beim ersten Aufruf die Startinhalte aus `setup/`.

---

## Lokal arbeiten

PHP ist über Homebrew installiert. Im Projektordner:

```bash
php -S localhost:8000
```

- Website: http://localhost:8000
- CMS: http://localhost:8000/admin

Das CMS-Passwort für lokal steht als Kommentar in `api/config.local.php`. Diese Datei ist nicht in Git, ich lege sie lokal selbst an.

Der PHP-Testserver beachtet die `.htaccess` nicht. Sperren und Sicherheits-Header greifen also nur auf dem echten Server. Lokal angelegte Inhalte bleiben lokal, die echten Inhalte pflege ich online im CMS.

---

## Backups

- Bei jedem Speichern hebt der Server die letzten 30 Stände von `data.json` in `storage/backups/` auf. Vor jeder automatischen Daten-Umstellung legt er ein zusätzliches Backup an.
- Unter **CMS → Allgemein → Backup herunterladen** gibt es Texte, Projektbilder und Galerie-Einstellungen als ZIP.
- Galerie-Dateien sind darin nicht enthalten, die Originale habe ich lokal.

---

## Arbeitsweise

Ich habe das Projekt mit **Claude Code** (KI-Assistent von Anthropic) als Pair-Programming-Partner entwickelt. Ziele, Gestaltung, Inhalte und Entscheidungen kamen von mir. Bei Code-Review, Umsetzung, Sicherheitsprüfung und Tests hat mich die KI unterstützt. Alle Änderungen habe ich lokal und live geprüft.

Gearbeitet habe ich in kleinen Schritten:
1. Änderung lokal mit dem PHP-Testserver umsetzen und im Browser prüfen
2. committen
3. auf `main` pushen
4. live nachkontrollieren

Für jeden grösseren Schritt gibt es einen eigenen Commit mit Beschreibung.

---

## Schwierigkeiten

**Lokal vs. online.** Mein erstes CMS schrieb über die File System Access API direkt in den Projektordner. Das war bequem, ging aber nur auf meinem Rechner und nur in Chromium-Browsern. Für die Pflege von unterwegs und für geschützte Galerien musste ich auf Server-Code umsteigen. Dabei musste ich überlegen, wo welche Daten liegen, damit Git und das CMS sich nicht gegenseitig überschreiben.

**Die eigene Entwicklungsumgebung.** Für PHP musste ich zuerst Homebrew aktualisieren, weil es meine macOS-Version nicht kannte. Der PHP-Testserver ignoriert ausserdem die `.htaccess`. Um die Sicherheits-Header und Sperren trotzdem lokal zu testen, habe ich sie mit einem kleinen Test-Router nachgebildet. Einmal war meine lokale Passwort-Datei verschwunden (vermutlich durch eine Git- oder OneDrive-Aktion). Online war das ohne Folgen, weil der Server sie beim Deploy selbst erzeugt.

**Browser-Cache.** Mehrmals zeigte der Browser nach einer Änderung noch die alte Version. Das sieht aus wie ein Fehler im Code, ist aber nur der Cache. Ein harter Reload (`Cmd + Shift + R`) hat geholfen.

**Die SVG-Lücke.** Meine erste Upload-Prüfung akzeptierte alles, was „irgendein Bild“ war. Eine SVG-Datei ist technisch ein Bild, kann aber JavaScript enthalten. Getarnt als `.jpg` wäre sie angenommen und auf meiner Domain ausgeführt worden. Gefunden habe ich das erst, als ich den Angriff gezielt nachgestellt habe. Die Lösung war eine feste Liste erlaubter Dateitypen und eine Auslieferung mit Sandbox.

**Content-Security-Policy.** Eine strenge CSP verbietet Inline-Scripts und fremde Script-Server. Ich musste deshalb zwei Inline-Scripts in eigene Dateien auslagern und GSAP und Lenis lokal einbinden statt über ein CDN. Danach habe ich jede Seite darauf geprüft, ob die Policy etwas blockiert.

**Der erste Deploy.** Der Upload landete im FTP-Startordner statt im Website-Ordner, und auf der Domain lief noch eine alte Seite. Erst der Blick ins Deploy-Log und eine Prüfung der Seite von aussen zeigten das. Dazu kam: Auf demselben Hosting läuft eine zweite Website, und meine `.htaccess` im Startordner hätte auch auf diese gewirkt. Beim Aufräumen musste ich deshalb genau darauf achten, nur meine eigenen Dateien zu löschen.

**HTTPS erzwingen.** Im Infomaniak Manager habe ich die Option dafür nicht gefunden. Ich habe die Umleitung deshalb selbst in die `.htaccess` geschrieben. Vorher habe ich geprüft, ob der Server HTTPS-Anfragen richtig erkennt, sonst hätte eine Endlosschleife die ganze Seite lahmgelegt. Dabei habe ich auch gelernt: Ein exportiertes SSL-Zertifikat enthält den privaten Schlüssel. Der gehört nie ins Projekt.

**Daten-Umstellung während des Deploys.** Als ich die Disziplinen umbenannt habe, mussten die Inhalte auf dem Server automatisch umgestellt werden. Die Umstellung startete aber, als ein Besucher die Seite aufrief, während der Upload noch lief und die neue Vorlage noch fehlte. Für einige Sekunden waren die Daten halb umgestellt. Sie hat sich zwar selbst korrigiert, seither wartet die Umstellung aber, bis alle Dateien da sind.

**Grenzen von normalem Webhosting.** Ich kenne die Upload-Limits des Servers nicht genau, darum meldet der Server sie dem CMS, und das CMS passt die Stückgrösse an. Kleinere Videoversionen würden `ffmpeg` brauchen, und das gibt es dort nicht. Die Video-Standbilder erzeugt deshalb der Browser beim Upload. Bei manchen iPhone-Formaten (HEVC) klappt das in Chrome nicht.

**Repository für den Dozenten freigeben.** Zuerst dachte ich, ich lade ihn einfach als Collaborator ins private Repository ein. Bei persönlichen GitHub-Konten bekommen Collaborators aber automatisch Schreibrechte. Damit könnten sie einen Deploy auslösen und über einen geänderten Workflow sogar die Secrets auslesen. Ein öffentliches Repository ist für reines Anschauen die sicherere Lösung.

---

## Learnings

- **Code und Inhalte trennen.** Das war die wichtigste Architektur-Entscheidung. Erst dadurch waren Git, automatischer Deploy und Online-CMS sauber nebeneinander möglich.
- **Statisch hat Grenzen.** Sobald Dateien wirklich geschützt sein sollen, braucht es Server-Code. Ein Passwort in JavaScript wäre nur Fassade.
- **Sicherheit muss man testen, nicht annehmen.** Erst das Nachstellen echter Angriffe hat die SVG-Lücke gezeigt. Wichtig sind mehrere Schutzschichten statt einer: Prüfung beim Upload, sichere Auslieferung, CSP.
- **Geheimnisse gehören nie in Git.** Zugangsdaten liegen als Secrets bei GitHub, auf dem Server nur ein Passwort-Hash. Deshalb kann das Repository öffentlich sein.
- **Performance hängt vor allem an den Bildern.** Bildvarianten mit `srcset` haben mehr gebracht als jede Code-Optimierung. Wichtig ist, für jede Stelle anzugeben, wie gross ein Bild wirklich angezeigt wird.
- **Weniger Code ist besser wartbar.** Eine Vorlage statt vier Seiten und Farben über CSS-Variablen statt Umrechnung: Das hat Fehler beseitigt und spätere Änderungen erleichtert.
- **Live prüfen, nicht nur lokal.** Lokal lief alles. Fehler wie der falsche Zielordner oder die zu frühe Daten-Umstellung zeigten sich erst online. Nach jedem Deploy prüfe ich deshalb von aussen nach.
- **Kleine Schritte mit klaren Commits.** So weiss ich bei jedem Problem, welche Änderung es verursacht hat, und könnte jederzeit zurück.
- **KI als Werkzeug, nicht als Autopilot.** Die KI hat mich schneller gemacht und mir Dinge erklärt, die ich vorher nicht kannte, etwa CSP, CSRF oder `srcset`. Die Entscheidungen und das Prüfen blieben aber bei mir.

---

## Ressourcen

**Animation und Frontend**
- GSAP und ScrollTrigger, Dokumentation: https://gsap.com/docs/v3/
- Lenis (Smooth Scroll): https://github.com/darkroomengineering/lenis
- MDN, Responsive Images (`srcset`, `sizes`): https://developer.mozilla.org/en-US/docs/Web/HTML/Responsive_images
- MDN, CSS `color-mix()`: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix
- Schriften über Google Fonts: Inter Tight, Instrument Serif, JetBrains Mono

**PHP und Server**
- PHP-Handbuch: https://www.php.net/manual/de/
  - `password_hash` / `password_verify`, Sessions, `finfo` (Dateityp-Erkennung)
  - GD (Bildbearbeitung, WebP), `ZipArchive`
- MDN, HTTP Range Requests (Video-Spulen): https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
- Infomaniak Hilfe (Webhosting, FTP, SSL, `.user.ini`): https://www.infomaniak.com/de/support

**Sicherheit**
- MDN, Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
  - File Upload, Cross-Site Request Forgery Prevention, Session Management, Cross-Site Scripting Prevention

**Git und Deploy**
- GitHub Actions, Dokumentation: https://docs.github.com/actions
- FTP-Deploy-Action: https://github.com/SamKirkland/FTP-Deploy-Action
- Homebrew (PHP lokal): https://brew.sh

**Werkzeuge**
- Visual Studio Code
- Claude Code (KI-Assistent): https://claude.com/claude-code
- Infomaniak Manager, GitHub

---

© 2026 Alessio Rosano. Code für Studienzwecke einsehbar; Bilder und Texte nicht zur Weiterverwendung.
