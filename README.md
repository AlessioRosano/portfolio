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
5. [Videos im Portfolio](#videos-im-portfolio)
6. [Download-Galerien](#download-galerien)
7. [Bilder und Performance (Proxies)](#bilder-und-performance-proxies)
8. [Suchmaschinen (SEO)](#suchmaschinen-seo)
9. [Sicherheit](#sicherheit)
10. [Deploy: von Git zu Infomaniak](#deploy-von-git-zu-infomaniak)
11. [Lokal arbeiten](#lokal-arbeiten)
12. [Backups](#backups)
13. [Arbeitsweise](#arbeitsweise)
14. [Schwierigkeiten](#schwierigkeiten)
15. [Learnings](#learnings)
16. [Ressourcen](#ressourcen)

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

### 8. Bei Google gefunden werden

Damit die Seite in der Google-Suche auftaucht, habe ich sie für Suchmaschinen vorbereitet:

- **Sitemap:** Unter `/sitemap.xml` liegt eine Liste aller Seiten. Sie wird aus den CMS-Inhalten erzeugt, neue Projekte sind also automatisch drin.
- **`robots.txt`:** Sie sagt Google, was es lesen darf und was nicht (CMS, API, Kunden-Galerien).
- **Eine einzige Adresse:** `www.` und `http://` leiten jetzt auf `https://alessiorosano.ch` um, dazu kommt ein Canonical-Link auf jeder Seite. Sonst sähe Google dieselbe Seite unter mehreren Adressen.
- **Titel und Beschreibung** für jede Disziplin und jedes Projekt
- **Vorschaubild für geteilte Links** (LinkedIn, WhatsApp usw.): Ich habe es mit PHP und meinen Schriften als `img/og.jpg` erzeugt.
- **Favicon für die Google-Suche:** Google zeigt kein Icon an, das nur als Code (Data-URL) im HTML steckt. Darum gibt es echte Dateien: `favicon.ico` (16/32/48 px), `favicon.svg`, `icon-192.png` und `apple-touch-icon.png`. Im Browser-Tab färbt `js/theme.js` das Icon trotzdem in der Besuchsfarbe ein.
- **Strukturierte Daten** (schema.org): Google erkennt mich als Person (mit Ort, Fachgebieten und Social-Links) und meine Projekte als Werke.
- **Google Search Console:** Ich habe die Domain per DNS-Eintrag bei Infomaniak bestätigt, die Sitemap eingereicht und die Indexierung beantragt.

### 9. Eine eigene Tonalität

Zum Schluss habe ich meinen Über-mich-Text neu geschrieben: direkt, mit einem Augenzwinkern und nah an den Menschen. Diesen Ton habe ich auf die ganze Website übertragen, von den Titeln („Das hier mache ich richtig gut.“, „Zusammen wird’s besser.“) über die Disziplin-Texte bis zu den Meldungen im Kontaktformular und in den Galerien. Lange Gedankenstriche habe ich dabei konsequent durch Punkte und Doppelpunkte ersetzt. Die Texte im CMS hat wieder eine automatische Umstellung angepasst, die nur ersetzt, was noch dem alten Stand entsprach.

### 10. Videos und Bilder, die nicht beschnitten werden

- **Filme** von YouTube oder Vimeo binde ich per Link ein. Auf der Projektseite stehen sie zuoberst, mit ihrem echten Vorschaubild. Der Player lädt erst beim Klick, vorher fliessen keine Daten zu YouTube oder Vimeo.
- **Kurze Video-Loops** (MP4, MOV, WebM) lade ich direkt ins CMS. Auf der Projektseite laufen sie automatisch und stumm.
- **„Nicht beschneiden“ pro Bild:** Plakate oder Bilder mit Text erscheinen auf der Projektseite vollständig, ohne Zuschnitt und Zoom. Fotos dürfen weiterhin zugeschnitten werden und zoomen beim Scrollen.

### 11. Feinschliff am Look

- **Slider:** Bilder ohne Rahmen und Bildunterschrift. Beim Hover werden sie farbig, zoomen leicht, und der Projekttitel erscheint in der Mitte. Loops starten beim Hover. Darunter sitzen mittig zwei Pfeile `<` `>` zum Blättern.
- **Zufällige Farbe pro Besuch:** Statt eines Farbschalters würfelt die Seite bei jedem Besuch Orange, Pink oder Blau. Die Farbe bleibt während des Besuchs gleich, Favicon und Browserfarbe passen sich an.
- **AR-Zeichen statt Name** im Header, dasselbe Zeichen wie im Browser-Tab
- Den Stern im Header der Startseite habe ich entfernt, damit der Kopf ruhiger wirkt.

### 12. «Zeig mal», Handy und Galerie-Layout

- **Neue Seite «Zeig mal»** (`arbeiten.html`): alle Arbeiten in einem Raster, filterbar nach Disziplin, im selben Look wie der Slider. Sie ist in der Navigation verlinkt und steht in der Sitemap.
- **Handy:** Das Scrollen läuft dort jetzt nativ mit Schwung, statt mit dem Smooth-Scrolling vom Desktop, das am Handy bremst und abrupt stoppt. Die Seite rechnet nicht mehr alles neu, wenn die Adressleiste ein- und ausfährt, und Inhalte blenden schneller und mit kürzeren Wegen ein.
- **Burger-Menü** auf dem Handy: ein farbiges Vollbild mit allen Menüpunkten
- **Startscreen am Handy:** Der Name ist etwas niedriger, „Video, Branding …“ steht links und „Weniger Lärm …“ rechts.
- **Galerie-Layout pro Bild:** Im CMS wähle ich für jedes Galeriebild **Quer** (ganze Breite) oder **Hoch** (halbe Breite, zwei nebeneinander). Neue Bilder bekommen die Einstellung automatisch nach ihrem Seitenverhältnis.
- **CMS fürs Handy:** Liste und Bearbeiten sind dort zwei Ansichten („← Alle Projekte“ führt zurück). Die Kopfzeile ist zweireihig mit wischbaren Tabs, und die Felder lösen beim Antippen keinen Zoom aus. Bilder und Videos lade ich direkt aus der Kamerarolle hoch.
- **Nichts ragt mehr über den Rand:** Die grosse Überschrift zur nächsten Disziplin war am Handy zu breit, dadurch liess sich die ganze Seite seitlich verschieben. Die Schrift skaliert jetzt mit, lange Titel brechen um, und ein Sicherheitsnetz (`overflow-x: clip` auf `html`) verhindert seitliches Verschieben grundsätzlich.

### 13. Weniger Text

Die Seiten waren mir noch zu textlastig. Statt Texte zu löschen, blende ich sie aus. So kann ich sie jederzeit zurückholen.

- **Disziplin-Seiten:** Einleitung, Stichworte, die Überschrift „Ein paar Beispiele.“ und der Abschnitt «So gehe ich vor» sind ausgeblendet. Übrig bleiben Titel, Projekte und der Link zur nächsten Disziplin. Die Projekte folgen jetzt direkt auf den Titel. Auf der Startseite erscheinen Einleitung und Stichworte weiterhin beim Hover über eine Disziplin.
- **Kein Stern mehr** unter den Seitentiteln (Disziplin- und Projektseiten)
- **Kein farbiger Rahmen** mehr um die Projektbilder auf den Disziplin-Seiten. Sie stehen jetzt frei, wie im Slider auf der Startseite.
- **Neues Feld «Kunde»** im CMS bei jedem Projekt. Auf der Projektseite steht es zuoberst im Steckbrief. Bleibt es leer, erscheint die Zeile gar nicht, ältere Projekte sehen also aus wie vorher.
- **Navigation:** «Zeig mal» steht jetzt an dritter Stelle: Was, Wer, Zeig mal, Kontakt.
- **Unterlängen nicht mehr abgeschnitten:** Beim «g» in „richtig gut.“ fehlte unten ein Stück. Die Zeilen der animierten Titel blenden mit `overflow: hidden` ein und hatten unten zu wenig Platz für die tiefen Unterlängen der Serifenschrift. Jetzt haben sie mehr Raum, ohne dass sich der Zeilenabstand ändert. Nachgemessen habe ich das im Browser: Vorher lag der Bogen vom «g» knapp 2 px unter der Kante, jetzt bleiben gut 6 px Luft.

---

## Was die Website kann

**Startseite (`index.html`)**
- Intro-Animation (nur beim ersten Besuch, danach ein kurzer Übergang)
- endloser Projekt-Slider zum Ziehen, der beim Scrollen beschleunigt: Bilder ohne Rahmen, schwarz-weiss. Beim Hover werden sie farbig und leicht grösser, der Projekttitel erscheint in der Mitte, und Video-Loops laufen an. Mit den Pfeilen `<` `>` darunter springt man ein Projekt weiter oder zurück. Am Handy gibt es kein Hover: Dort sind die Bilder gleich farbig, und Loops laufen, solange sie im Bild sind (ausserhalb pausieren sie und werden erst bei Bedarf geladen).
- **Was:** die vier Disziplinen mit Hover-Details und Vorschaubildern
- **Wer:** Text, der beim Scrollen Wort für Wort erscheint, mit Portrait und Steckbrief
- Kontaktformular (öffnet das Mail-Programm, es braucht keinen Server-Versand)

**Zeig mal (`arbeiten.html`)**: alle Arbeiten in einem Raster, Filter nach Disziplin (auch als Link teilbar, z.B. `arbeiten.html?d=video`). Beim Hover werden die Bilder farbig, der Titel erscheint, und Loops laufen an.

**Disziplin-Seite (`disziplin.html?d=video`)**: grosser Titel, Anzahl Projekte, die Projekte und ein Link zur nächsten Disziplin. Einleitung, Stichworte, „Ein paar Beispiele.“ und «So gehe ich vor» sind im Code noch da, aber ausgeblendet (eine CSS-Regel in `style.css`). Auf der Startseite stehen Einleitung und Stichworte weiterhin im Hover bei «Was».

**Projektseite (`projekt.html?p=…`)**: zuoberst der Film (falls vorhanden, Player lädt erst beim Klick), dann ein grosses Titelbild oder ein Video-Loop mit Zoom beim Scrollen, Beschreibung, Steckbrief (Kunde, Disziplin, Jahr, Rolle, Tools, Link), Galerie aus Bildern und Loops, Link zum nächsten Projekt. Pro Bild lässt sich im CMS festlegen, dass es nicht beschnitten wird. Plakate oder Bilder mit Text erscheinen dann vollständig, ohne Zuschnitt und Zoom.

**Überall**
- Jeder Besuch bekommt zufällig eine Farbe: Orange, Pink oder Blau. Sie bleibt während des Besuchs gleich, Favicon und Browserfarbe passen sich an. Der frühere Farbschalter ist im Code noch vorhanden, aber ausgeblendet.
- Im Header steht das AR-Zeichen statt des Namens. Die Navigation: Was, Wer, Zeig mal, Kontakt. Am Handy öffnet ein Burger dieselben Punkte als Vollbild-Menü.
- Am Handy: natives Scrollen mit Schwung, leichtere Animationen
- Live-Uhr, Scroll-Fortschritt, eigener Cursor, Seitenübergänge, Raster-Overlay mit Taste **G** (nur am Desktop; am Handy ist der Hinweis ausgeblendet)
- Rücksicht auf „Bewegung reduzieren“ in den Systemeinstellungen: keine automatisch laufenden Loops

Fotos erscheinen in den Übersichten schwarz-weiss und auf der Projektseite in Farbe.

---

## Technischer Aufbau

**Stack:** HTML, CSS (Custom Properties, `color-mix`), Vanilla JavaScript, GSAP 3 + ScrollTrigger, Lenis, PHP 8 (ohne Framework), Apache (`.htaccess`), GitHub Actions. Es gibt bewusst keinen Build-Schritt, kein npm und keine Datenbank. Die Inhalte liegen in einer JSON-Datei.

```
portfolio/
├── index.html, arbeiten.html, disziplin.html, projekt.html   Website (Inhalte per JS aus der API)
├── galerie.php                                Galerie-Seite für Kund:innen
├── css/style.css                              Gestaltung; alle Farben aus einer Variable --bx
├── js/
│   ├── main.js        Website: Inhalte laden, aufbauen, animieren
│   ├── art.js         Platzhalter-Grafiken als SVG
│   ├── utils.js       gemeinsame Helfer (Website + CMS)
│   ├── galerie.js     Grossansicht der Galerie
│   ├── theme.js       zufällige Besuchsfarbe, vor dem ersten Zeichnen (auch Favicon)
│   └── vendor/        GSAP, ScrollTrigger, Lenis (lokal statt CDN)
├── admin/             CMS (index.html + admin.js)
├── api/
│   ├── lib.php        Basis: Session, CSRF, Login-Sperre, Dateien, Bild-Proxies, Daten-Umstellung
│   ├── data.php       öffentlich: Inhalte + Bildvarianten als JSON
│   ├── admin.php      CMS-Schnittstelle (Login, Speichern, Uploads, Galerien, Backup)
│   ├── file.php       liefert Galerie-Dateien aus (nur mit Passwort)
│   └── zip.php        ganze Galerie als ZIP
├── setup/             Startinhalte für einen leeren Server
├── favicon.ico, favicon.svg, icon-192.png, apple-touch-icon.png   Icons (Browser, Google, iPhone)
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

Erreichbar unter `/admin`, geschützt mit einem Passwort. Es funktioniert am Desktop und am Handy.

| Tab | Was ich dort pflege |
|---|---|
| **Projekte** | Titel, Jahr, Disziplin, Rolle, Kunde, Tools, Beschreibung, Link, Film (YouTube/Vimeo), Bilder und Video-Loops (Drag & Drop, Reihenfolge, Titelbild, pro Bild «Nicht beschneiden» und Quer/Hoch in der Galerie), Platzhalter-Grafik, Reihenfolge der Projekte |
| **Disziplinen** | Name, Einleitung, Stichworte, Tools, drei Arbeitsschritte |
| **Wer** | Text, Portrait, Bildunterschrift, Steckbrief-Zeilen, Status |
| **Galerien** | Galerien für Kund:innen anlegen, Dateien hochladen, Link und Passwort weitergeben |
| **Allgemein** | Kontakt-E-Mail, Social-Links, Backup herunterladen |

- **Speichern** (oder ⌘S) stellt die Änderungen sofort live. Der Server prüft dabei jedes Feld.
- Bilder werden schon **im Browser** auf 2400 px verkleinert, bevor sie hochgeladen werden.
- Wer ungespeicherte Änderungen hat oder einen Upload laufen lässt, wird beim Verlassen gewarnt.

---

## Videos im Portfolio

Zwei Wege, je nach Länge:

- **Filme (YouTube oder Vimeo):** Im CMS trage ich nur den Link ein. Auf der Projektseite steht der Film **zuoberst**, mit seinem echten Vorschaubild und einem Play-Knopf. Das Vorschaubild holt der Server beim Speichern einmalig von YouTube bzw. Vimeo (oEmbed) und legt es mit WebP-Varianten auf dem eigenen Hosting ab. Der Player wird erst beim **Klick** geladen, mit `youtube-nocookie.com` bzw. Vimeo mit `dnt=1`. Vorher fliessen keine Daten zu YouTube oder Vimeo, und die Seite bleibt schnell. Die Content-Security-Policy erlaubt genau diese beiden Player und sonst keine fremden Frames.
- **Kurze Loops (MP4, MOV, M4V oder WebM, ohne Ton):** Ich ziehe sie ins selbe Feld wie Bilder. Das CMS prüft zuerst, ob der Browser das Video abspielen kann (HEVC oder ProRes zum Beispiel nicht), und legt MOV/M4V mit H.264 als `.mp4` ab. Sie werden in Stücken hochgeladen (bis 60 MB) und liegen in `content/video/`. Beim Upload zieht das CMS ein Standbild aus dem Video. Auf der Projektseite laufen Loops automatisch, stumm und endlos, als Titelbild oder in der Galerie. In allen Übersichten erscheint nur das Standbild, damit die Startseite kein einziges Video lädt. Wer „Bewegung reduzieren“ eingestellt hat, startet den Loop selbst.
- Empfehlung für Loops: 5–15 Sekunden, 1080p, H.264 (MP4), ohne Tonspur, unter 15 MB.

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

- **Sitemap** unter `/sitemap.xml`: Sie wird aus den CMS-Inhalten erzeugt (`sitemap.php`), mit Startseite, «Zeig mal», Disziplinen und Projekten. Neue Projekte sind also automatisch drin.
- **`robots.txt`:** Die Website ist erlaubt, CMS, API und Kunden-Galerien sind gesperrt. Ausnahme ist `api/data.php`, damit Google die Inhalte laden kann.
- **Eine Adresse:** `www.` und `http://` leiten mit einer einzigen Weiterleitung auf `https://alessiorosano.ch` um. Jede Seite hat einen Canonical-Link.
- **Titel und Beschreibung** passend zu jeder Disziplin und jedem Projekt (gesetzt per JavaScript, das Google ausführt)
- **Vorschau beim Teilen** (Open Graph): eigenes Vorschaubild `img/og.jpg` mit 1200 × 630 px
- **Favicon als echte Dateien** (`favicon.ico`, `favicon.svg`, `icon-192.png`, `apple-touch-icon.png`), damit Google es in den Suchergebnissen anzeigt
- **Strukturierte Daten** (schema.org): `Person` auf der Startseite (mit Social-Links aus dem CMS) und `CreativeWork` für Projekte
- **Name als Text:** Der grosse animierte Name besteht aus einzelnen Buchstaben. Google liest ihn trotzdem korrekt als „Alessio Rosano“.
- **Google Search Console:** Die Domain ist per TXT-Eintrag in der DNS-Zone bei Infomaniak bestätigt (Domain-Property, deckt `www` und `http` mit ab). Die Sitemap ist eingereicht, die Indexierung der Startseite beantragt. Dort sehe ich auch, wie oft und wofür die Seite in der Suche erscheint.
- **Wichtig:** Die Inhalte kommen per JavaScript aus `api/data.php`. Google führt dieses JavaScript aus, darum ist die API in der `robots.txt` ausdrücklich erlaubt. Ohne diese Ausnahme sähe Google nur leere Seiten.

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

**Google und JavaScript.** Weil die Inhalte erst per JavaScript geladen werden, muss Google die Daten-API lesen dürfen. Eine zu strenge `robots.txt` („alles unter `/api/` sperren“) hätte die Seite für Google leer gemacht. Ausserdem müssen die Projekt-Adressen in der Sitemap (PHP) exakt gleich berechnet werden wie auf der Website (JavaScript), auch bei Umlauten und Akzenten. Das habe ich mit Grenzfällen wie „Café Côte — Grösse & Ñandú“ in beiden Sprachen getestet.

**Loops, die stillschweigend nicht hochgeladen wurden.** Mein erster Loop-Import nahm nur MP4 und WebM an und ignorierte alles andere ohne Meldung. Eine MOV-Datei aus Premiere oder vom iPhone verschwand also einfach. Heute prüft das CMS vor dem Upload, ob der Browser das Video abspielen kann, nimmt MOV/M4V an und sagt klar, wenn etwas nicht geht (z.B. HEVC oder ProRes). Die Lehre: Nie etwas still verwerfen, immer erklären.

**Seite am Handy seitlich verschiebbar.** Ein einziges Element war am Handy breiter als der Bildschirm: die grosse Überschrift zur nächsten Disziplin mit einer festen Mindestgrösse von 56 px. Dadurch liess sich die ganze Seite seitlich wischen. Gefunden habe ich es, indem ich jede Seite in Handy-Breite gezielt nach überstehenden Elementen durchsucht habe. Die Lehre: Schriften mit Mindestgrössen immer mit dem längsten möglichen Text testen.

**Kurzer Ausfall nach vielen Abfragen.** Nach einer Reihe von Deploys mit automatischen Prüfungen war die Seite einige Minuten nicht erreichbar, obwohl das DNS stimmte und der Code in Ordnung war. Wahrscheinlich hat Infomaniak meinen Anschluss wegen der vielen Abfragen kurz gesperrt. Seither prüfe ich nach einem Deploy mit weniger und langsameren Abfragen.

**Repository für den Dozenten freigeben.** Zuerst dachte ich, ich lade ihn einfach als Collaborator ins private Repository ein. Bei persönlichen GitHub-Konten bekommen Collaborators aber automatisch Schreibrechte. Damit könnten sie einen Deploy auslösen und über einen geänderten Workflow sogar die Secrets auslesen. Ein öffentliches Repository ist für reines Anschauen die sicherere Lösung. Beim Hochladen hat GitHub dann einen Push blockiert, weil meine private E-Mail-Adresse in den Commits stand. Seither verwende ich die anonyme GitHub-Adresse (`…@users.noreply.github.com`).

---

## Learnings

- **Code und Inhalte trennen.** Das war die wichtigste Architektur-Entscheidung. Erst dadurch waren Git, automatischer Deploy und Online-CMS sauber nebeneinander möglich.
- **Statisch hat Grenzen.** Sobald Dateien wirklich geschützt sein sollen, braucht es Server-Code. Ein Passwort in JavaScript wäre nur Fassade.
- **Sicherheit muss man testen, nicht annehmen.** Erst das Nachstellen echter Angriffe hat die SVG-Lücke gezeigt. Wichtig sind mehrere Schutzschichten statt einer: Prüfung beim Upload, sichere Auslieferung, CSP.
- **Geheimnisse gehören nie in Git.** Zugangsdaten liegen als Secrets bei GitHub, auf dem Server nur ein Passwort-Hash. Deshalb kann das Repository öffentlich sein.
- **Gefunden werden ist Handarbeit.** Eine schöne Seite allein reicht nicht. Google braucht eine Sitemap, eine eindeutige Adresse pro Seite, gute Titel und Beschreibungen, und vor allem Links von anderen Orten wie LinkedIn, Instagram oder GitHub.
- **Ton ist Gestaltung.** Ein einheitlicher Ton in allen Texten (inklusive Fehlermeldungen) macht die Seite genauso stimmig wie Farben und Schrift.
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

**Suchmaschinen**
- Google Search Central, SEO-Grundlagen: https://developers.google.com/search/docs
- Google Search Console: https://search.google.com/search-console
- Sitemaps-Protokoll: https://www.sitemaps.org/
- schema.org (strukturierte Daten): https://schema.org/Person
- Open Graph Protocol (Vorschau beim Teilen): https://ogp.me/
- LinkedIn Post Inspector (Vorschau testen): https://www.linkedin.com/post-inspector/

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
