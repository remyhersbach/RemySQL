# RemySQL {{tag}}

## Thema en tabelbeheer

- De themakeuze bevat nu Licht, Donker en Volg systeemvoorkeuren. Volg systeemvoorkeuren is de standaard voor nieuwe instellingen en past het thema direct aan bij een wijziging van het systeemthema.
- Bestaande expliciete voorkeuren voor Licht of Donker blijven bewaard.
- Het rechtermuisknopmenu op een tabel bevat nu Drop table, met bevestiging voordat de tabel inclusief data en structuur wordt verwijderd. De actie is geblokkeerd voor views en alleen-lezen-connecties.

## CSV-export

- Naast Backup tabel staat nu Exporteer als CSV. De export bevat alle rijen en kolommen met de actieve filters en sortering, zonder de ingestelde weergavelimiet.
- Bij eigen SQL wordt het volledige teruggegeven resultaat geëxporteerd, met behoud van een eventuele expliciete SQL-LIMIT en zonder de query opnieuw uit te voeren.
- Tabelexports worden rechtstreeks naar het bestand geschreven, zodat ook meer dan 5.000 rijen en grote resultaten kunnen worden geëxporteerd. Komma's, aanhalingstekens, regeleinden en Unicode blijven behouden.
- Een mislukte export overschrijft geen bestaand CSV-bestand.
