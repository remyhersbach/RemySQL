# RemySQL {{tag}}

## Wijzigingen

- RemySQL staat nog maar één actieve app-instance toe, zodat een update/installatie niet per ongeluk meerdere processen tegelijk Keychain-toegang laat vragen.
- Connecties gebruiken een eigen versleutelde datasleutel in memory, zodat Keychain niet opnieuw nodig is bij elke connectie-read of -write.
