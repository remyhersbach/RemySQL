# RemySQL {{tag}}

## macOS-installatie

- De app krijgt tijdens het bouwen een geldige ad-hoc handtekening. macOS meldde eerder bij een gedownloade DMG dat RemySQL beschadigd was en naar de prullenmand moest; die melding is weg.
- Gatekeeper vraagt nog wel om bevestiging, want de app is niet genotariseerd. Sleep de app naar Programma's en kies in Systeeminstellingen bij Privacy en beveiliging voor Toch openen, of draai `xattr -dr com.apple.quarantine /Applications/RemySQL.app`.
- Staat er een Developer ID Application-certificaat in de keychain, dan wordt daar gewoon mee ondertekend en slaat de ad-hoc stap zichzelf over.

## Releasescript

- Het script opent de editor alleen nog in een echte terminal, zodat een release vanuit een script of CI niet meer vastloopt op vi.
- Zonder terminal is een expliciete versie verplicht en wordt er niet meer om een bevestiging gevraagd.
- Het versienummer wordt pas verhoogd nadat de release notes klaar zijn, zodat een afgebroken release geen half bijgewerkte package.json achterlaat.
