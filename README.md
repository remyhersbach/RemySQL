# SQL Base Manager

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

Voor MariaDB heb je een lokale client nodig:

```bash
brew install mariadb
```

Of zet `SQL_BASE_MYSQL_CLIENT` naar een eigen `mariadb`/`mysql` binary.

Open daarna in de app:

1. `Connecties` -> `Nieuwe MariaDB connectie...`
2. Vul host, poort, user, wachtwoord en database in.
3. Open een tabel links in de structuurboom.

Voor de lokale SQLite demo:

1. `Connecties` -> `Nieuwe SQLite connectie...`
2. Kies `sample/demo.sqlite`
3. Open een tabel links.

## Eerste scope

Deze versie gebruikt lokale command line clients via Electron IPC: `mariadb`/`mysql` voor MariaDB en `sqlite3` voor de demo. Dat houdt de basis klein en vermijdt native Node database-drivers. Wachtwoorden worden in deze eerste iteratie lokaal in Electron user data opgeslagen; dat is prima voor een prototype, maar de volgende stap is opslag via Keychain/credential store.
