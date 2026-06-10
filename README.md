# RemySQL

Een eerste basis voor een DBeaver/SQL Ace-achtige desktop database-manager in Electron.

## Wat zit erin?

- MariaDB connecties aanmaken via het app-menu of de knop in de sidebar.
- SQLite connecties blijven beschikbaar als lokale testoptie.
- Connecties persistent bewaren in Electron user data.
- Tabellen bekijken en openen in tabs.
- Per tab schakelen tussen `Data` en `Structuur`.
- Data filteren met een globale zoekfilter.
- Foreign key-relaties direct zien in een rechter sidebar.
- Sample database generator om meteen iets te testen.

## Runnen

```bash
npm install
npm run create:sample
npm start
```

MariaDB werkt via de meegeleverde Node-driver. Je hoeft dus geen lokale `mariadb` of `mysql` command line client te installeren.

Open daarna in de app:

1. `Connecties` -> `Nieuwe MariaDB connectie...`
2. Vul host, poort, user, wachtwoord en database in.
3. Open een tabel links in de structuurboom.

Voor de lokale SQLite demo:

1. `Connecties` -> `Nieuwe SQLite connectie...`
2. Kies `sample/demo.sqlite`
3. Open een tabel links.

## Release maken

Gebruik het release-script vanaf een schone git worktree. `RELEASE_NOTES.md` mag al handmatig aangepast zijn; dat bestand wordt meegenomen in de release-commit.

```bash
npm run release
```

Het script verhoogt het versienummer, dwingt een `CHANGELOG.md`-sectie af voor de in-app changelog, leest de GitHub Release-notes uit `RELEASE_NOTES.md`, draait syntax-checks, bouwt een macOS DMG met `npm run build:mac`, maakt een release-commit plus git-tag, en pusht naar GitHub.

Gebruik `RELEASE_NOTES.md` voor de tekst op GitHub Releases. De tokens `{{version}}` en `{{tag}}` worden tijdens de release automatisch ingevuld.

Wil je de DMG ook direct als GitHub Release asset uploaden, zet `REMYSQL_GH_TOKEN` met `contents:write` en gebruik:

```bash
npm run release:publish
```

## Eerste scope

Deze versie gebruikt de officiële MariaDB Node-driver voor MariaDB en de lokale `sqlite3` command line tool voor de demo. Wachtwoorden worden in deze eerste iteratie lokaal in Electron user data opgeslagen; dat is prima voor een prototype, maar de volgende stap is opslag via Keychain/credential store.
