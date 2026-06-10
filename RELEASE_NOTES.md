# RemySQL {{tag}}

## Wijzigingen

- Kolomfilters hebben nu ook `groter dan` en `kleiner dan`.
- Release notes worden voortaan handmatig beheerd in `RELEASE_NOTES.md`, zodat ze vooraf rustig kunnen worden voorbereid.
- De waardevelden bij `tussen` blijven compacter op een enkele regel, zodat er ruimte is om ook de tweede waarde in te vullen.
- Het release-script leest de GitHub Release-tekst uit `RELEASE_NOTES.md` en vult `{{version}}` en `{{tag}}` automatisch in.
- Het connectieformulier kan nu worden verplaatst, handig als een foutmelding of onderliggende context in de weg staat.
- Fouten bij het opslaan van een connectie verschijnen nu in het formulier zelf, zonder dat ingevulde gegevens verdwijnen.
