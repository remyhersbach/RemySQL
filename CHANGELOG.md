# Changelog

Alle noemenswaardige wijzigingen in RemySQL staan in dit bestand.

Gebruik per release een kop zoals `## 0.2.4 - 2026-05-31`. Het release-script vult de inhoud vanuit `RELEASE_NOTES.md`.

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
