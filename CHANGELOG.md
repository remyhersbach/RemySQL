# Changelog

Alle noemenswaardige wijzigingen in RemySQL staan in dit bestand.

Gebruik per release een kop zoals `## 0.2.4 - 2026-05-31`. Het release-script vult de inhoud vanuit `RELEASE_NOTES.md`.

## 0.2.15 - 2026-09-25

### UI en bediening

- Subtiele zebra-strepen en duidelijkere hover- en selectiestanden in het lichte en donkere thema.
- Een bredere, versleepbare zijbalk die de gekozen breedte onthoudt. De scheiding is ook met het toetsenbord te bedienen; dubbelklik herstelt de standaardbreedte.
- De actieve connectie, database en tabel zijn zichtbaar als breadcrumb. Omgevingsbadges voor Productie, Test en Ontwikkeling worden herkend uit naam of groep en zijn instelbaar per connectie.
- De kop behoudt dezelfde hoogte bij wisselen tussen tabs met en zonder omgevingsbadge.
- Verbindingsstatussen gebruiken grijs voor niet verbonden, groen voor actief en rood bij een mislukte verbinding. Een geslaagde nieuwe poging wist de foutstatus.
- Acties zoals SQL, backup en verversen staan bij elkaar bovenaan. Data, Structuur en kolomzichtbaarheid zijn gegroepeerd bij de tabelheader.
- Knoppen zijn duidelijker herkenbaar en hebben een zichtbare toetsenbordfocus. De filtermodusknoppen heten nu Tekst en Kolom.

### Filters, tabellen en wijzigingen

- Ingevulde filters krijgen een subtiele achtergrondkleur, met een teller voor actieve filters en een knop Wis filters.
- Filters worden automatisch toegepast; meerdere kolomfilters zijn expliciet verbonden met EN. Iedere tab behoudt zijn eigen filters.
- Kolommen zoeken via een subtiel oogje of tweemaal kort Cmd (Ctrl op Windows/Linux), zowel in Data als Structuur. Bij verborgen kolommen toont het oogje het zichtbare aantal, bijvoorbeeld 4/12. Esc of het kruisje toont alle kolommen opnieuw.
- Tabellen openen standaard gesorteerd op primary key aflopend, ook bij samengestelde sleutels. Sorteren gebeurt vóór het toepassen van de rijlimiet.
- De resultaten vermelden wanneer de ingestelde rijlimiet is bereikt, zodat duidelijk is dat er mogelijk meer rijen zijn.
- Naast Opslaan en Annuleren staat het aantal gewijzigde cellen en nieuwe rijen. Na gedeeltelijk opslaan toont de teller alleen de resterende wijzigingen.

### Import en onderhoud

- DBeaver-connecties importeren via het menu of de sidebar, met een instelbaar pad, opgeslagen inloggegevens, SSH-tunnels en een resultaat per connectie.
- Herhaald importeren slaat bestaande connecties over. Connecties met ontbrekende gegevens kunnen na import worden aangevuld.
- Electron bijgewerkt naar 44.4.5, electron-builder naar 26.15.3 en de MariaDB-driver naar 3.5.4; indirecte dependencies bijgewerkt.
- Het ontwikkelscript installeert de Electron-runtime vóór het aanpassen van de appnaam, passend bij de nieuwe installatieprocedure.

## 0.2.14 - 2026-06-19

### Wijzigingen

## 0.2.13 - 2026-06-19

### Wijzigingen
- Filters verbeterd
- Close button voor alle tabs toegevoegd
- Rechtermuisklik truncate table toegevoegd

## 0.2.12 - 2026-06-10

### Wijzigingen
- Kleine geitjes

## 0.2.11 - 2026-06-10

### Wijzigingen

- RemySQL staat nog maar één actieve app-instance toe, zodat een update/installatie niet per ongeluk meerdere processen tegelijk Keychain-toegang laat vragen.
- Connecties gebruiken een eigen versleutelde datasleutel in memory, zodat Keychain niet opnieuw nodig is bij elke connectie-read of -write.

## 0.2.10 - 2026-06-10

### Wijzigingen

- Connecties worden na de eerste decrypt in het main process gecached, zodat macOS Keychain na een update niet meerdere keren om toegang vraagt.

## 0.2.9 - 2026-06-10

### Wijzigingen

- Kolomfilters hebben nu ook `groter dan` en `kleiner dan`.
- Release notes worden voortaan handmatig beheerd in `RELEASE_NOTES.md`, zodat ze vooraf rustig kunnen worden voorbereid.
- De waardevelden bij `tussen` blijven compacter op een enkele regel, zodat er ruimte is om ook de tweede waarde in te vullen.
- Het release-script leest de GitHub Release-tekst uit `RELEASE_NOTES.md` en vult `{{version}}` en `{{tag}}` automatisch in.
- Het connectieformulier kan nu worden verplaatst, handig als een foutmelding of onderliggende context in de weg staat.
- Fouten bij het opslaan van een connectie verschijnen nu in het formulier zelf, zonder dat ingevulde gegevens verdwijnen.

## 0.2.8 - 2026-06-03

### Wijzigingen

- Tabs hun eigen filters geven.

## 0.2.7 - 2026-06-01

### Wijzigingen

- Meer ruimte gegeven aan de inhoud van filters.

## 0.2.6 - 2026-06-01

### Wijzigingen

## 0.2.5 - 2026-06-01

### Wijzigingen

## 0.2.3 - 2026-05-31

### Wijzigingen

- Changelog-venster bij de eerste start van een nieuwe versie.
- Update-check via GitHub Releases.
- Connection-acties verplaatst naar het contextmenu.
- Multi-row celbewerkingen passen dezelfde waarde toe op dezelfde kolom van alle geselecteerde rijen.
