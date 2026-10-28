# Portfolio Alessio Rosano

**Live:** https://alessiorosano.ch

Mein Portfolio für **Video, Branding/Web, Kampagnen und Architektur**, entstanden im Modul **Interaktive Medien** an der FH Graubünden. Angefangen hat es als statische Seite. Geworden ist daraus ein kleines, selbst gebautes System:

- eine animierte Portfolio-Website
- ein eigenes **CMS** unter `/admin`, mit dem ich alles online pflege, ohne Code anzufassen
- **passwortgeschützte Download-Galerien**, über die ich Kund:innen Fotos und Videos übergebe
- ein **automatischer Deploy**: Ich pushe auf GitHub, der Code landet bei Infomaniak

---

## Inhalt

1. [Technik](#technik)
2. [Projektverlauf](#projektverlauf)
3. [Schwierigkeiten](#schwierigkeiten)
4. [Learnings](#learnings)
5. [Arbeitsweise](#arbeitsweise)
6. [Lokal arbeiten](#lokal-arbeiten)
7. [Ressourcen](#ressourcen)

---

## Technik

**Stack:** HTML, CSS (Custom Properties, `color-mix`), Vanilla JavaScript, GSAP 3 + ScrollTrigger, Lenis, PHP 8 ohne Framework, Apache (`.htaccess`), GitHub Actions. Bewusst ohne Build-Schritt, ohne npm und ohne Datenbank. Die Inhalte liegen in einer JSON-Datei.

```
portfolio/
├── index.html, arbeiten.html, disziplin.html, projekt.html   Website (Inhalte per JS aus der API)
├── galerie.php          Galerie-Seite für Kund:innen
├── render.php           liefert die Seiten mit fertigem Inhalt für Crawler ohne JavaScript
├── sitemap.php          Sitemap mit Bildern aus den CMS-Inhalten (/sitemap.xml)
├── llms.php             Kurzfassung für KI-Systeme (/llms.txt)
├── css/style.css        Gestaltung; alle Farben aus einer Variable --bx
├── js/
│   ├── main.js          Inhalte laden, Seiten aufbauen, animieren
│   ├── art.js           Platzhalter-Grafiken als SVG
│   ├── utils.js         gemeinsame Helfer für Website und CMS
│   ├── galerie.js       Grossansicht der Galerie
│   ├── theme.js         zufällige Besuchsfarbe, vor dem ersten Zeichnen
│   └── vendor/          GSAP, ScrollTrigger, Lenis (lokal statt CDN)
├── admin/               CMS (index.html + admin.js)
├── api/
│   ├── lib.php          Session, CSRF, Login-Sperre, Dateien, Bildvarianten, Daten-Umstellung
│   ├── data.php         öffentlich: Inhalte + Bildvarianten als JSON
│   ├── seo.php          gemeinsame Helfer für render.php, Sitemap und llms.txt (Meta, schema.org)
│   ├── admin.php        CMS-Schnittstelle (Login, Speichern, Uploads, Galerien, Backup)
│   ├── file.php, zip.php   Galerie-Dateien, nur mit Passwort
├── setup/               Startinhalte für einen leeren Server
└── .github/workflows/deploy.yml
```

### Code und Inhalte getrennt

Die wichtigste Entscheidung im ganzen Projekt:

| | Wo es liegt | Wie es auf den Server kommt |
|---|---|---|
| **Code** (HTML, CSS, JS, PHP) | Git / GitHub | automatisch per GitHub Action |
| **Inhalte** (`content/`: Texte, Bilder, Loops) und **Geschütztes** (`storage/`: Galerien, Backups) | nur auf dem Server | über das CMS |

So überschreibt ein Deploy nie meine Inhalte, und grosse Kundenvideos landen nie in Git. `main.js` lädt beim Start `api/data.php` und baut daraus die Seiten auf. Erst danach starten Intro und Animationen.

### Website

- **Seiten:** Startseite mit Intro, endlosem Slider und den Bereichen Was, Wer und Kontakt. Dazu «Zeig mal» (alle Arbeiten, filterbar), je eine Disziplin-Seite (`disziplin.html?d=…`) und Projektseiten (`projekt.html?p=…`). Für vier Disziplinen gibt es eine einzige Vorlage.
- **Bilder mit Rollen:** Das Titelbild (erstes Bild oder Loop) ist die Vorschau im Slider. Für «Zeig mal» (Querformat), die Disziplin-Seite (abwechselnd Hoch- und Querformat) und die kleinen Bilder beim Hover über eine Disziplin auf der Startseite (Hochformat) kann ich im CMS eigene Vorschaubilder setzen, sonst gilt das Titelbild.
- **Projektseite:** zuoberst die Filme, bei Projekten ohne Film das **Keyvisual**. Dann der Text, dann die Galerie. Bilder mit einer Rolle stehen nicht noch einmal in der Galerie. Hat ein Projekt sonst nichts, springt das Titelbild ein.
- **Typografie:** Neue Haas Grotesk Display (Adobe Fonts) als Grundschrift, für Text in Medium, für Überschriften und die grossen Namen in Bold. Dazu Instrument Serif kursiv für Akzente und JetBrains Mono für kleine Labels. Gewichte und Laufweite sind als Stufen in `style.css` festgelegt (`--w-*`, `--track-*`), von den grossen Namen (enger) bis zum Fliesstext (minimal weiter). Die Schrift kommt von Adobes Servern; dabei sieht Adobe die IP-Adresse der Besuchenden, setzt aber keine Cookies.
- **Look:** Pro Besuch würfelt die Seite eine Farbe (Orange, Pink oder Blau), Favicon inklusive. Fotos sind farbig. Nur im Slider der Startseite und auf «Zeig mal» sind sie schwarz-weiss und werden beim Hover farbig, am Handy sind sie dort gleich farbig.
- **Desktop vs. Handy:** Am Desktop gibt es Smooth-Scroll mit Lenis, Hover-Effekte und einen eigenen Cursor. Am Handy scrollt die Seite nativ, Bilder sind gleich farbig, und es gibt ein Burger-Menü.
- **Videos:** Pro Projekt gehen beliebig viele Filme von YouTube oder Vimeo (bis 20). Der Player ist direkt eingebettet, ohne eigenes Overlay davor, und lädt erst, wenn er ins Bild scrollt (`youtube-nocookie.com`, Vimeo mit `dnt=1`). Das Vorschaubild für die Übersichten holt der Server einmalig und legt es selbst ab. Eigene kurze Loops (MP4/WebM) laufen stumm: am Desktop im Slider und auf «Zeig mal» beim Hover, auf den Disziplin-Seiten solange sie im Bild sind (`playInView`). Am Handy laufen sie überall immer (`playAlways`). In Übersichten erscheint nur ihr Standbild, damit die Startseite kein Video lädt.
- **Rücksicht:** Wer «Bewegung reduzieren» eingestellt hat, bekommt keine automatisch laufenden Loops.

### CMS

Erreichbar unter `/admin`, mit Passwort, am Desktop und am Handy. Dort pflege ich Projekte (Texte, Kunde, mehrere Film-Links, Bilder und Loops per Drag & Drop, pro Bild «Nicht beschneiden», Quer/Hoch in der Galerie und die Rollen Keyvisual, Vorschau «Zeig mal» und Vorschau Disziplin), Disziplinen, den Wer-Bereich, Social-Links und die Kunden-Galerien. In der Beschreibung lege ich mit `[Wort](https://…)` einen Link hinter ein Wort. Pro Projekt lade ich **PDFs** hoch (Plakat, Broschüre, Präsentation), die auf der Projektseite im Steckbrief als Links erscheinen, und lege auf Wunsch die **Adresse** selbst fest (z. B. `projekt.html?p=certum-50plus` statt einer aus dem Titel). Projekte kann ich **ausblenden** statt löschen: Neue Projekte starten als Entwurf und erscheinen erst, wenn ich sie einblende. Angemeldet sehe ich Entwürfe trotzdem über «Projekt ansehen», mit dem Hinweis «Entwurf». Der Tab **Medien** zeigt alle hochgeladenen Fotos, Loops und Film-Vorschauen auf einen Blick, mit dem Projekt, in dem sie stecken. Was nirgends mehr verwendet wird, ist markiert. **Speichern** (oder ⌘S) stellt alles sofort live. Der Server prüft dabei jedes Feld (`cleanData()`) und hebt die letzten 30 Stände als Backup auf. Grosse Dateien lädt das CMS in Stücken hoch, die Stückgrösse richtet sich nach dem Upload-Limit, das der Server meldet.

### Galerien

Eine Galerie hat einen Titel, ein automatisch erzeugtes Passwort und optional ein Ablaufdatum. Die **Adresse** (`galerie.php?g=…`) entsteht aus dem Titel oder ich lege sie selbst fest. Auch später lässt sie sich ändern: Der Server verschiebt dann Ordner und Einstellungen, und das CMS warnt, dass der alte Link nicht mehr funktioniert. Neben Fotos und Videos nimmt sie auch **PDFs** auf (z. B. Offerten, Druckdaten, Präsentationen): Sie erscheinen als eigene Kachel, öffnen sich im PDF-Betrachter des Browsers und landen im ZIP. Die Dateien liegen im gesperrten Ordner `storage/` und kommen nur über `api/file.php` raus, erst nach der Passwort-Prüfung. Die Übersicht zeigt Vorschauen mit 800 px, die Grossansicht 2000 px, heruntergeladen wird das Original oder alles als ZIP.

### Performance

Bilder lädt der Browser als WebP-Varianten mit `srcset` (480 bis 2400 px), passend zur Anzeigegrösse. Die Varianten erzeugt der Server mit PHP/GD (`makeVariants()`), für ältere Bilder holt er sie nach und nach nach. **Ergebnis: Die Startseite lädt 126 KB statt 389 KB Bilddaten (−68 %).** In den Galerien wird ein 19-MB-Foto in der Übersicht zu 0,2 MB.

### SEO

Google führt JavaScript aus, die meisten KI-Crawler (ChatGPT, Claude, Perplexity) und Link-Vorschauen tun das nicht. Für sie wären die Seiten leer gewesen. Darum laufen die vier Seiten über `render.php`: Der Server setzt Titel, Beschreibung, Canonical, Vorschaubild und strukturierte Daten direkt ins HTML, dazu Überschrift, Texte und Links zu allen Disziplinen und Projekten. Danach baut `main.js` die Seite wie gewohnt auf, sichtbar ändert sich nichts. Unbekannte Projekte melden einen echten 404.

- **Strukturierte Daten (schema.org):** `WebSite`, `ProfilePage` und `Person` (Fachgebiete aus den Disziplinen und Stichworten, Sprachen, Social-Links), `CollectionPage` für «Zeig mal» und die Disziplinen, `CreativeWork` pro Projekt (mit Kunde, Bild, Rolle und Tools) und Breadcrumbs.
- **`/llms.txt`:** eine Kurzfassung für KI-Systeme nach llmstxt.org: wer ich bin, Steckbrief, Disziplinen, alle Projekte mit Link, Kontakt. Sie baut sich wie die Sitemap aus den CMS-Inhalten.
- **Sitemap mit Bildern**, eine einzige Adresse (`https://` ohne `www`, Canonical fest auf `alessiorosano.ch`), `robots.txt`, Favicon als echte Dateien, Sprache `de-CH`. Die Domain ist in der Google Search Console bestätigt.
- **Sicherheitsnetz:** Klappt in `render.php` etwas nicht, kommt die unveränderte HTML-Datei. Die Seite fällt nie aus.

### Sicherheit

Die Sicherheit beruht nicht darauf, dass der Code geheim ist. Darum ist das Repository öffentlich.

- **Zugang:** keine Zugangsdaten in Git, auf dem Server nur ein Hash des CMS-Passworts. Nach 5 Fehlversuchen ist 15 Minuten Pause. Sichere Session-Cookies und ein CSRF-Token bei jeder Änderung.
- **Uploads:** Geprüft wird der echte Dateiinhalt, nicht die Endung. SVG und HTML sind nie erlaubt. PDFs müssen wirklich PDFs sein (Dateiart und die Kennung `%PDF-` am Anfang), sonst lehnt der Server sie ab. Für PDFs gilt eine eigene CSP ohne Einbett-Verbot, sonst zeigt Chrome sie nicht an. Getestet habe ich das mit einem echten Apache, weil ein Fehler in der `.htaccess` die ganze Seite lahmlegt. Ausgeliefert wird mit fester Dateiart, `nosniff` und einer Sandbox-CSP.
- **Inhalte:** nur `https://`-Links und eigene Bildpfade, alle Texte werden escaped. Ausgeblendete Projekte filtert der Server heraus, bevor etwas öffentlich wird (Website, Sitemap, `llms.txt`), und die Rohdatei `content/data.json` ist von aussen gesperrt.
- **Server:** strenge Content-Security-Policy (nur eigene Scripts, als fremde Frames nur YouTube und Vimeo), HTTPS mit HSTS, interne Dateien gesperrt, keine PHP-Fehler im Browser.
- **Geprüft durch nachgestellte Angriffe:** SVG als Foto, HTML als Video, `javascript:`-Links, direkter Zugriff auf Galerie-Dateien, Brute Force. Alle werden abgewehrt.

### Deploy

```
git push (main) ──► GitHub Action
                    1. CMS-Passwort-Hash aus dem Secret erzeugen
                    2. per FTPS hochladen, ohne content/ und storage/
                ──► beim ersten Aufruf: Ordner anlegen, Daten bei Bedarf umstellen (mit Backup)
```

Die Secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`, `ADMIN_PASSWORD`) liegen nur bei GitHub. Die Actions sind auf feste Commits festgenagelt, der Workflow darf das Repository nur lesen.

---

## Projektverlauf

1. **Statische Website (September 2026):** HTML/CSS/JS mit GSAP, ScrollTrigger und Lenis. Gepflegt habe ich die Inhalte anfangs mit einem lokalen CMS, das über die File System Access API in `js/data.js` schrieb. Danach musste ich jedes Mal von Hand hochladen.
2. **Aufräumen:** eine Vorlage statt vier fast gleicher Disziplin-Seiten, Grafikfarben über CSS-Variablen, gemeinsame Helfer. Rund 15 % weniger Code bei gleichem Aussehen.
3. **Eigenes Online-CMS mit PHP:** Inhalte online pflegen und geschützte Galerien anbieten, das geht mit einer statischen Seite nicht. Ein Git-basiertes CMS hatte ich geprüft und verworfen: Geschützte Galerien und Videos passen nicht in ein Repository.
4. **Sicherheitsprüfung:** alle Angriffe lokal nachgestellt, eine echte Lücke und neun weitere Schwachstellen behoben.
5. **Live auf Infomaniak:** mit Zielordner als Secret, alte Dateien entfernt, HTTPS erzwungen.
6. **Inhalte und Daten-Umstellung:** neue Disziplinen, Standort St.Gallen, Wer-Bereich und Social-Links im CMS. Weil die Inhalte auf dem Server liegen, stellt eine automatische Umstellung sie nach dem Deploy um (`migrateContent()`).
7. **Bildvarianten:** `srcset` mit WebP, Vorschauen für Galerien, −68 % Bilddaten auf der Startseite.
8. **Google:** Sitemap, Canonical, Vorschau-Tags, strukturierte Daten, Search Console.
9. **Eigene Tonalität:** Über-mich-Text neu geschrieben und den Ton auf die ganze Seite übertragen, bis zu den Fehlermeldungen.
10. **Videos:** Filme mit Klick-zum-Laden, eigene Loops direkt aus dem CMS, Bilder auf Wunsch ohne Zuschnitt.
11. **Feinschliff:** Slider ohne Rahmen mit Hover-Effekt, zufällige Farbe pro Besuch statt Farbschalter, AR-Zeichen im Header.
12. **«Zeig mal» und Handy:** neue Seite mit allen Arbeiten, natives Scrollen und Burger-Menü am Handy, CMS fürs Handy, Quer/Hoch pro Galeriebild.
13. **Weniger Text:** Auf den Disziplin-Seiten sind Einleitung, Stichworte und «So gehe ich vor» ausgeblendet, nicht gelöscht (eine CSS-Regel). Dazu Loops, die auch dort laufen, und ein neues Feld «Kunde».
14. **Aufräumen, zweite Runde:** Doppelter Code in Website, CMS und PHP ist zusammengelegt (z. B. `loopVideo`, `galleryOrDeny()`). Jede Regel steht nur noch an einer Stelle. Getestet habe ich das, indem ich alte und neue Version nebeneinander laufen liess und die fertigen Seiten verglichen habe.
15. **Mehr Film, weniger Doppeltes:** mehrere Filme pro Projekt, Textlinks in der Beschreibung und der Tab «Medien» im CMS. Das Titelbild ist jetzt nur noch Vorschau und wiederholt sich auf der Projektseite nicht mehr. Filme stehen direkt als Player da, statt hinter einem Abspiel-Overlay.
16. **Bilder mit Rollen:** Für «Zeig mal» und die Disziplin-Seite braucht es mal Quer-, mal Hochformate. Darum kann ich pro Projekt eigene Vorschaubilder (für «Zeig mal», die Disziplin-Seite und die Startseite) und ein Keyvisual für die Projektseite wählen. Schwarz-weiss sind Fotos nur noch im Slider und auf «Zeig mal». Und im Über-mich-Text steht kein Wort mehr allein auf der letzten Zeile: Die letzten zwei Wörter jedes Absatzes hängen mit einem geschützten Leerzeichen zusammen. Das CMS sagt mir dabei, welches Format die Disziplin-Seite an dieser Stelle braucht.
17. **SEO und GEO:** Die Seiten kommen jetzt mit fertigem Inhalt vom Server (`render.php`), dazu mehr strukturierte Daten, eine Sitemap mit Bildern und `/llms.txt` für KI-Systeme.
18. **Entwürfe:** Projekte lassen sich im CMS ausblenden, ohne sie zu löschen. So kann ich in Ruhe an einem Beitrag arbeiten, bevor er online geht.
19. **Neue Typografie:** Neue Haas Grotesk Display statt Inter Tight, mit neu abgestimmten Gewichten, Laufweiten und Wortabständen. Dazu Umlaute, die in den grossen Titeln nicht mehr abgeschnitten werden.
20. **PDFs und eigene Adressen:** Im CMS lassen sich PDFs zu Projekten und in die passwortgeschützten Galerien hochladen, und die Adresse jeder Projektseite und jeder Galerie lässt sich selbst bestimmen.

---

## Schwierigkeiten

**Lokal vs. online.** Mein erstes CMS lief nur auf meinem Rechner und nur in Chromium. Für die Pflege von unterwegs musste ich auf Server-Code umsteigen und klären, wo welche Daten liegen, damit sich Git und CMS nicht gegenseitig überschreiben.

**Die SVG-Lücke.** Meine erste Upload-Prüfung nahm alles an, was «irgendein Bild» war. Eine SVG-Datei mit Script, getarnt als `.jpg`, wäre auf meiner Domain ausgeführt worden. Gefunden habe ich das erst, als ich den Angriff gezielt nachgestellt habe. Seither gibt es eine feste Liste erlaubter Typen und eine Auslieferung mit Sandbox.

**Content-Security-Policy.** Eine strenge CSP verbietet Inline-Scripts und fremde Script-Server. Ich musste Scripts auslagern, GSAP und Lenis lokal einbinden und danach jede Seite prüfen, ob etwas blockiert wird.

**Der erste Deploy.** Der Upload landete im FTP-Startordner statt im Website-Ordner. Auf demselben Hosting läuft eine zweite Website, also musste ich beim Aufräumen genau darauf achten, nur meine eigenen Dateien zu löschen.

**Daten-Umstellung während des Deploys.** Die Umstellung startete, als jemand die Seite aufrief, während der Upload noch lief. Für einige Sekunden waren die Daten halb umgestellt. Seither wartet sie, bis alle Dateien da sind.

**Grenzen von Webhosting.** Es gibt kein `ffmpeg`. Video-Standbilder erzeugt deshalb der Browser beim Upload, und die Upload-Limits meldet der Server dem CMS selbst.

**Google und JavaScript.** Die Inhalte kommen per JavaScript aus der API. Eine zu strenge `robots.txt` hätte die Seite für Google leer gemacht. Und die Projekt-Adressen müssen in PHP (Sitemap) und JavaScript exakt gleich berechnet werden, auch bei Umlauten.

**KI-Suchen sehen kein JavaScript.** Google kam mit meiner Seite klar, KI-Crawler und Link-Vorschauen sahen aber nur leere Hüllen mit dem Titel «Projekt». Statt die ganze Seite umzubauen, füllt jetzt `render.php` die bestehenden HTML-Dateien vor. Heikel daran: Läuft sie für alle Seiten, darf sie nie abstürzen. Darum fällt sie bei jedem Fehler auf die normale Datei zurück, und die Adresse im Canonical kommt fest aus dem Code, nicht aus der Anfrage. Sonst könnte jemand eine fremde Domain unterschieben.

**Loops, die still verschwanden.** Der erste Loop-Import ignorierte MOV-Dateien ohne Meldung. Heute prüft das CMS vorher, ob der Browser das Video abspielen kann, und sagt klar, wenn nicht. Die Lehre: Nie etwas still verwerfen.

**Seitlich verschiebbar am Handy.** Eine einzige Überschrift mit fester Mindestgrösse war breiter als der Bildschirm. Gefunden habe ich sie, indem ich jede Seite in 375 px Breite nach überstehenden Elementen durchsucht habe.

**Aus einem Film werden viele.** Online liegen Projekte mit einem einzelnen Feld `video`. Statt die Live-Daten umzubauen, liest die Website beide Formen, und das CMS macht beim nächsten Speichern daraus eine Liste. So geht beim Deploy nichts verloren, und es braucht keine eigene Daten-Umstellung.

**Textlinks ohne HTML.** In der Beschreibung darf kein HTML stehen, sonst könnte jemand Script einschleusen. Darum escapt die Website zuerst den ganzen Text und wandelt danach nur das Muster `[Wort](https://…)` in einen Link um. `javascript:`-Links und HTML bleiben so harmloser Text.

**Entwürfe, die nicht durchsickern.** Ausblenden per JavaScript wäre nur Fassade gewesen: Die Daten hätte trotzdem jeder abrufen können, sogar direkt als `content/data.json`. Darum filtert der Server, und die Rohdatei ist gesperrt. Damit die Projektadressen nicht springen, wenn ich etwas aus- oder einblende, berechnet der Server sie über alle Projekte.

**Loops, die beim Antippen stoppten.** Am Handy liefen die Videos im Slider nur, solange ich ihn nicht berührte. Der Grund: Antippen und Wischen lösen dieselben Ereignisse aus wie das Verlassen mit der Maus, und die Hover-Logik hielt das Video an. Jetzt hört sie nur noch auf die Maus.

**Umlaute mit abgeschnittenen Punkten.** Die grossen Titel fliegen Buchstabe für Buchstabe ein, jeder in einer eigenen Maske. Die war oben zu knapp: Ein «Ä» reicht bis 0,95 Schriftgrössen über die Grundlinie, die Maske nur bis 0,82. Die Punkte schwebten abgehackt über dem Buchstaben. Jetzt hat die Maske oben mehr Platz, ein negativer Rand gleicht das aus, und die Buchstaben starten tiefer, damit vor dem Einfliegen nichts herausblitzt. Am Handy hängen Kurzwörter wie «im» am nächsten Wort, und Zeilen mit Umlaut bekommen etwas mehr Abstand.

**Eine Schrift, die nicht einfach auf den Server darf.** Neue Haas Grotesk war als Desktop-Schrift auf meinem Mac installiert. Die Datei erlaubt aber keine Einbettung, und in einem öffentlichen Repository hätte sie jeder herunterladen können. Die saubere Lösung ist Adobe Fonts: in meinem Creative-Cloud-Abo enthalten, mit Web-Lizenz. Dafür musste die CSP genau zwei Adobe-Adressen erlauben. Beim Umstellen zeigte sich: Inter Tight vertrug viel negative Laufweite, Neue Haas Grotesk nicht. Grosse Wörter klebten aneinander. Darum gibt es jetzt feste Stufen für Gewicht und Laufweite statt einzelner Werte.

**Eigene Adressen, die anderen nichts wegnehmen.** Wer selbst einen Slug wählt, kann versehentlich die Adresse eines anderen Projekts erwischen. Das andere Projekt würde dann still zu «…-2», und alle Links darauf wären kaputt. Darum warnt das CMS schon beim Tippen, und der Server lehnt das Speichern ab. Browser und Server berechnen die Adressen nach genau denselben Regeln, getestet mit Umlauten, Akzenten und doppelten Titeln.

**Abgeschnittene Unterlängen.** Animierte Titel blenden zeilenweise mit `overflow: hidden` ein. Das «g» der Serifenschrift ragte knapp 2 px über die Kante. Nachgemessen im Browser und mit mehr Platz unten behoben, ohne den Zeilenabstand zu ändern.

**Gesperrt nach vielen Abfragen.** Nach einer Reihe von Deploys mit automatischen Prüfungen war die Seite zweimal einige Minuten nicht erreichbar. Wahrscheinlich hat Infomaniak meinen Anschluss wegen der vielen Abfragen kurz gesperrt. Seither prüfe ich nach einem Deploy einmal, nach etwa einer Minute.

**Repository für den Dozenten.** Collaborators bekommen bei persönlichen GitHub-Konten automatisch Schreibrechte und könnten so über einen geänderten Workflow die Secrets auslesen. Ein öffentliches Repository ist zum Anschauen sicherer. Dabei hat GitHub einen Push wegen meiner privaten E-Mail in den Commits blockiert. Seither nutze ich die `noreply`-Adresse.

---

## Learnings

- **Code und Inhalte trennen.** Erst dadurch passen Git, automatischer Deploy und Online-CMS zusammen.
- **Statisch hat Grenzen.** Sobald Dateien wirklich geschützt sein sollen, braucht es Server-Code. Ein Passwort in JavaScript ist nur Fassade.
- **Sicherheit testen, nicht annehmen.** Erst das Nachstellen echter Angriffe hat die SVG-Lücke gezeigt. Mehrere Schutzschichten sind besser als eine.
- **Geheimnisse gehören nie in Git.** Darum kann das Repository öffentlich sein.
- **Performance hängt an den Bildern.** `srcset` hat mehr gebracht als jede Code-Optimierung.
- **Weniger ist mehr, auch im Code.** Eine Vorlage statt vier Seiten, eine Funktion statt drei Kopien. Und auf der Seite selbst: weniger Text, mehr Wirkung.
- **Ton ist Gestaltung.** Ein einheitlicher Ton bis in die Fehlermeldungen macht die Seite so stimmig wie Farbe und Schrift.
- **Gefunden werden heisst heute auch: von KI gelesen werden.** Was nur im Browser entsteht, existiert für viele Crawler nicht. Inhalte gehören ins HTML, das der Server schickt.
- **Live prüfen, aber mit Mass.** Manche Fehler zeigten sich erst online. Zu viele Abfragen schaden aber auch.
- **Kleine Schritte, klare Commits.** So weiss ich bei jedem Problem, woher es kommt.

---

## Arbeitsweise

Ich habe das Projekt mit **Claude Code** (KI-Assistent von Anthropic) als Pair-Programming-Partner entwickelt. Ziele, Gestaltung, Inhalte und Entscheidungen kamen von mir, bei Umsetzung, Code-Review, Sicherheitsprüfung und Tests hat mich die KI unterstützt. Sie hat mich schneller gemacht und mir Dinge wie CSP, CSRF oder `srcset` erklärt. Geprüft habe ich jede Änderung selbst, lokal und live.

Ablauf pro Schritt: lokal umsetzen und im Browser testen, committen, auf `main` pushen, live nachkontrollieren.

---

## Lokal arbeiten

```bash
php -S localhost:8000
```

Website unter http://localhost:8000, CMS unter `/admin`. Das lokale CMS-Passwort steht in `api/config.local.php`, die nicht in Git ist. Der PHP-Testserver ignoriert die `.htaccess`, Sperren und Sicherheits-Header greifen also nur auf dem echten Server.

---

## Ressourcen

- GSAP und ScrollTrigger: https://gsap.com/docs/v3/
- Lenis: https://github.com/darkroomengineering/lenis
- MDN (Responsive Images, `color-mix()`, CSP, Range Requests): https://developer.mozilla.org/
- PHP-Handbuch (`password_hash`, Sessions, `finfo`, GD, `ZipArchive`): https://www.php.net/manual/de/
- OWASP Cheat Sheets (File Upload, CSRF, Sessions, XSS): https://cheatsheetseries.owasp.org/
- Google Search Central: https://developers.google.com/search/docs
- schema.org und Open Graph: https://schema.org/, https://ogp.me/
- GitHub Actions und FTP-Deploy-Action: https://docs.github.com/actions, https://github.com/SamKirkland/FTP-Deploy-Action
- Infomaniak Hilfe: https://www.infomaniak.com/de/support
- Schriften: Neue Haas Grotesk Display (Adobe Fonts), Instrument Serif und JetBrains Mono (Google Fonts)

---

© 2026 Alessio Rosano. Code für Studienzwecke einsehbar; Bilder und Texte nicht zur Weiterverwendung.
