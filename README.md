# Budapest Metrói Társasjáték

Rövid leírás
- Egy egyszerű, böngészőben futó társasjáték-szimulátor: 4 körön át (M1–M4) metróvonalakat építesz egy 10×10 rácson.
- A játék statikus fájlokból tölti be a pályát és a vonalakat: [stations.json](stations.json), [lines.json](lines.json).

Gyors indítás
1. Főmenü: [index.html](index.html) — add meg a neved és Start.
2. Játék: [game.html](game.html).

Alapvető játékmechanika
- Minden fordulóban (egy vonal) 8 kártyát húzhatsz, minden kártya vagy építésre, vagy passzolásra használható.
- Az építési szabályok és részletek a [Játékszabályokban](rules.html) találhatók.

Pontozás (összefoglaló)
- Forduló pontszám:
  - Legyen $PK$ a különböző érintett kerületek száma,
  - $PM$ a legtöbb állomás egy kerületen belül,
  - $PD$ a Duna-átkelések száma.
  - Ekkor: $FP = (PK \times PM) + PD$.
- Végső pontszám: $\text{Összpontszám} = \sum FP + PP + \text{Csomópontok}$
  (PP = pályaudvarok első érintései, Csomópontok = +2/+5/+9 pont a 2/3/4-szer érintett állomásokért).

Fejlesztőknek / belső hivatkozások
- Játék inicializálása és fő logika: [`initGame`](game.js)
- Forduló indítása: [`startNewRound`](game.js)
- Kártyakezelés: [`drawCard`](game.js)
- Állomásra kattintás / építés: [`onStationClick`](game.js)
- Fordulópontszámítás: [`calculateRoundScore`](game.js)
- Játék vége: [`endGame`](game.js)

Fontos fájlok
- [game.html](game.html) — játék nézet
- [game.js](game.js) — játék logika (draw, validate, score)
- [style.css](style.css) — játék stílusok
- [index.html](index.html), [index.css](index.css), [menu.js](menu.js) — főmenü és scoreboard
- [stations.json](stations.json), [lines.json](lines.json) — pályaadatok
- [rules.html](rules.html) — részletes szabályok
- [LICENSE](LICENSE) — licenc

Hibakeresés / tippek
- Ha a pályafelépítés nem jelenik meg, ellenőrizd a böngésző konzolját: a JSON fájlok betöltése fetch-sel történik; CORS/filereader problémák esetén használj helyi szervert.
- SVG-vonalakat a [drawSegment](game.js) függvény hozza létre.