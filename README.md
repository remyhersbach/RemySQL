# RemySQL

Een eerste basis voor een DBeaver/SQL Ace-achtige desktop database-manager in Electron.

## Wat zit erin?

- MariaDB connecties aanmaken via het app-menu of de knop in de sidebar.
- SQLite connecties blijven beschikbaar als lokale testoptie.
- Connecties persistent bewaren in Electron user data.
- MySQL-, MariaDB- en SQLite-connecties uit DBeaver importeren, inclusief opgeslagen inloggegevens en SSH-tunnels.
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

## DBeaver-connecties importeren

Kies `Connecties` → `Importeer connecties uit DBeaver...` of klik op het importicoon naast de plusknop. Je kunt het pad typen of een map kiezen. De standaardmap is `/Users/${USER}/Library/DBeaverData/workspace6/General/.dbeaver/` (de thuismap van de huidige gebruiker).

De import leest `data-sources.json` en, indien aanwezig, `credentials-config.json`. De projectmetadata en projectinstellingen zijn niet nodig. MySQL en MariaDB worden als MariaDB-connecties opgeslagen; lokale SQLite-bestanden blijven SQLite-connecties. Gewone SSH-tunnels met wachtwoord, sleutelbestand of SSH-agent worden meegenomen, evenals mappen en alleen-lezen-instellingen. Inloggegevens worden in de bestaande versleutelde RemySQL-opslag bewaard.

Tijdens de import wordt geen databaseverbinding gemaakt. Bestaande connecties worden overgeslagen, ook bij opnieuw importeren. Connecties met ontbrekende instellingen krijgen `Nog aanvullen`; klik erop om het bewerkformulier te openen. Het resultaat vermeldt per connectie wat is geïmporteerd of overgeslagen. Andere databases, SSL/proxyhandlers, aangepaste JDBC-opties, SSH-jumpservers en opgeslagen sleutelpassphrases worden nog niet ondersteund. Credentials uit een master-password-/externe credential store moet je zelf aanvullen.

## Tests

```bash
npm test
```

De importtests gebruiken tijdelijke fixtures en controleren ook de IPC-opslag, versleuteling en dubbele imports. Ze gebruiken geen echte databaseverbindingen of je eigen connectieopslag.

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

Deze versie gebruikt de officiële MariaDB Node-driver voor MariaDB en de lokale `sqlite3` command line tool voor de demo. Connecties worden versleuteld met AES-256-GCM; de datasleutel wordt beschermd via Electron safeStorage (op macOS de Keychain).
