# Portfolio Alessio Rosano

Website mit eigenem CMS (`/admin`) und passwortgeschützten Download-Galerien für Kund:innen.
Läuft auf Infomaniak (PHP). Code kommt per Git, Inhalte entstehen auf dem Server.

## Aufbau

| Ordner / Datei | Inhalt | In Git? |
|---|---|---|
| `index.html`, `disziplin.html`, `projekt.html` | Website | ja |
| `css/`, `js/`, `img/` | Gestaltung, Animationen, feste Bilder | ja |
| `admin/` | CMS (Login, Projekte, Galerien, Disziplinen) | ja |
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

## Backups

- Bei jedem Speichern hebt der Server die letzten 30 Stände von `data.json` in `storage/backups/` auf.
- CMS → **Allgemein → Backup herunterladen** lädt Texte, Projektbilder und Galerie-Einstellungen als ZIP.
- Galerie-Dateien (Fotos/Videos) sind darin nicht enthalten — die Originale hast du ohnehin lokal.
