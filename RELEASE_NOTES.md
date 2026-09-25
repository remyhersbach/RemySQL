# RemySQL {{tag}}

## UI en bediening

- Subtiele zebra-strepen en duidelijkere hover- en selectiestanden in het lichte en donkere thema.
- Een bredere, versleepbare zijbalk die de gekozen breedte onthoudt. De scheiding is ook met het toetsenbord te bedienen; dubbelklik herstelt de standaardbreedte.
- De actieve connectie, database en tabel zijn zichtbaar als breadcrumb. Omgevingsbadges voor Productie, Test en Ontwikkeling worden herkend uit naam of groep en zijn instelbaar per connectie.
- De kop behoudt dezelfde hoogte bij wisselen tussen tabs met en zonder omgevingsbadge.
- Verbindingsstatussen gebruiken grijs voor niet verbonden, groen voor actief en rood bij een mislukte verbinding. Een geslaagde nieuwe poging wist de foutstatus.
- Acties zoals SQL, backup en verversen staan bij elkaar bovenaan. Data, Structuur en kolomzichtbaarheid zijn gegroepeerd bij de tabelheader.
- Knoppen zijn duidelijker herkenbaar en hebben een zichtbare toetsenbordfocus. De filtermodusknoppen heten nu Tekst en Kolom.

## Filters, tabellen en wijzigingen

- Ingevulde filters krijgen een subtiele achtergrondkleur, met een teller voor actieve filters en een knop Wis filters.
- Filters worden automatisch toegepast; meerdere kolomfilters zijn expliciet verbonden met EN. Iedere tab behoudt zijn eigen filters.
- Kolommen zoeken via een subtiel oogje of tweemaal kort Cmd (Ctrl op Windows/Linux), zowel in Data als Structuur. Bij verborgen kolommen toont het oogje het zichtbare aantal, bijvoorbeeld 4/12. Esc of het kruisje toont alle kolommen opnieuw.
- Tabellen openen standaard gesorteerd op primary key aflopend, ook bij samengestelde sleutels. Sorteren gebeurt vóór het toepassen van de rijlimiet.
- De resultaten vermelden wanneer de ingestelde rijlimiet is bereikt, zodat duidelijk is dat er mogelijk meer rijen zijn.
- Naast Opslaan en Annuleren staat het aantal gewijzigde cellen en nieuwe rijen. Na gedeeltelijk opslaan toont de teller alleen de resterende wijzigingen.

## Import en onderhoud

- DBeaver-connecties importeren via het menu of de sidebar, met een instelbaar pad, opgeslagen inloggegevens, SSH-tunnels en een resultaat per connectie.
- Herhaald importeren slaat bestaande connecties over. Connecties met ontbrekende gegevens kunnen na import worden aangevuld.
- Electron bijgewerkt naar 44.4.5, electron-builder naar 26.15.3 en de MariaDB-driver naar 3.5.4; indirecte dependencies bijgewerkt.
- Het ontwikkelscript installeert de Electron-runtime vóór het aanpassen van de appnaam, passend bij de nieuwe installatieprocedure.
