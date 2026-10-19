# Portfolio Alessio Rosano

Website mit eigenem CMS (`/admin`) und passwortgeschützten Download-Galerien für Kund:innen.
Läuft auf Infomaniak (PHP). Code kommt per Git, Inhalte entstehen auf dem Server.

## Aufbau

| Ordner / Datei | Inhalt | In Git? |
|---|---|---|
| `index.html`, `disziplin.html`, `projekt.html` | Website | ja |
| `css/`, `js/` | Gestaltung, Animationen (`js/vendor/`: GSAP, Lenis) | ja |
| `admin/` | CMS (Login, Projekte, Disziplinen, Wer, Galerien, Allgemein) | ja |
| `galerie.php` | Galerie-Seite für Kund:innen | ja |
| `api/` | PHP: Login, Speichern, Uploads, Downloads | ja |
| `setup/` | Startinhalte — werden beim ersten Aufruf nach `content/` kopiert | ja |
| `content/` | Texte (`data.json`) und Projektbilder — **öffentlich** | nein, nur Server |
| `storage/` | Galerien, Backups, Login-Sperren — **von aussen gesperrt** | nein, nur Server |

## Veröffentlichen (einmalig einrichten)

1. In VS Code: **Source Control → Publish to GitHub** (privates Repository).
2. Auf GitHub im Repository unter **Settings → Secrets and variables → Actions** anlegen:
   - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` — aus dem Infomaniak Manager (FTP)
   - `ADMIN_PASSWORD` — dein Passwort fürs CMS (lang und einzigartig)
   - optional `FTP_DIR` — Zielordner auf dem Server, falls die Website nicht im FTP-Startordner liegt (z. B. `/web/`)
3. Danach lädt jeder Push auf `main` den Code automatisch hoch (Tab **Actions** auf GitHub zeigt den Stand).
4. Website öffnen, dann `/admin` — mit `ADMIN_PASSWORD` anmelden.

CMS-Passwort ändern: Secret `ADMIN_PASSWORD` ändern und unter **Actions → Deploy zu Infomaniak → Run workflow** neu deployen.

## Lokal arbeiten

PHP ist über Homebrew installiert. Im Projektordner:

```bash
php -S localhost:8000
```

Dann http://localhost:8000 (Website) und http://localhost:8000/admin (CMS).
Das lokale CMS-Passwort steht als Kommentar in `api/config.local.php` (nicht in Git).
Lokal angelegte Inhalte bleiben lokal — die echten Inhalte pflegst du online im CMS.

## Bilder und Tempo

- **Portfolio:** Das CMS verkleinert Bilder vor dem Upload auf max. 2400 px (JPG). Der Server legt daneben
  WebP-Varianten mit 480 / 960 / 1600 / 2400 px an (`bild.w960.webp` …); die Website lädt per `srcset`
  nur die passende Grösse. Fehlende Varianten (ältere Bilder) holt `api/data.php` automatisch nach.
- **Galerien:** Übersicht mit 800-px-Vorschau, Grossansicht mit 2000-px-Vorschau (beides in `thumbs/`,
  bei Bedarf erzeugt), Download immer im Original. Videos bekommen beim Upload im CMS ein Standbild.
- Empfehlung: Fotos als JPG (sRGB), Grafiken als PNG, lange Seite ab 2400 px. iPhone-Fotos besser als JPG
  (HEIC zeigen nur Safari-Browser an).

## Sicherheit

- Keine Zugangsdaten im Code: FTP-Daten und CMS-Passwort sind nur GitHub-Secrets; auf dem Server liegt nur der Passwort-Hash.
- CMS: Login mit Sperre nach 5 Fehlversuchen, CSRF-Schutz, Sitzung läuft nach 8 h Inaktivität ab.
- Uploads: nur Bilder/Videos, geprüft am echten Inhalt (kein SVG/HTML); Auslieferung mit fester Dateiart und Sandbox.
- Inhalte werden beim Speichern serverseitig geprüft (nur `https://`-Links, nur eigene Bildpfade).
- `.htaccess`: strenge Content-Security-Policy (nur eigene Scripts), interne Dateien und `storage/` gesperrt.
- Alle Scripts liegen im Projekt (`js/vendor/`), keine fremden Script-Server.
- Das CMS warnt rot, falls `storage/` je öffentlich erreichbar wäre.
- HTTPS wird per `.htaccess` erzwungen (http:// → https://); SSL-Zertifikat und HSTS kommen von Infomaniak.

## Backups

- Bei jedem Speichern hebt der Server die letzten 30 Stände von `data.json` in `storage/backups/` auf.
- CMS → **Allgemein → Backup herunterladen** lädt Texte, Projektbilder und Galerie-Einstellungen als ZIP.
- Galerie-Dateien (Fotos/Videos) sind darin nicht enthalten — die Originale hast du ohnehin lokal.
