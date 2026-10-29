# <img src="public/fehu.svg" alt="Runa Fehu" width="28" height="28" align="top"> Łukasz Sroka Tech — portfolio

[![Łukasz Sroka Tech — Angular i .NET](https://esakis.github.io/og-image.png)](https://esakis.github.io/pl/)

Dwujęzyczne portfolio Łukasza Sroki prezentujące dedykowane aplikacje webowe dla firm, rozwój systemów oraz integracje. Wersja polska działa pod adresem [https://esakis.github.io/pl/](https://esakis.github.io/pl/), a angielska pod [https://esakis.github.io/en/](https://esakis.github.io/en/).

## Najważniejsze funkcje

- statycznie prerenderowane wersje polska i angielska z osobnymi metadanymi SEO,
- helisa 3D na szerokich ekranach i czytelny układ pionowy na urządzeniach mobilnych,
- tło Three.js — żywa architektura systemu sterowana scrollem, z pełnym profilem desktopowym i lżejszym profilem mobilnym, na statycznej „zorzy” (miękkie światła i ziarno; w scenie WebGL i — dla trybu awaryjnego — w CSS),
- automatyczne obniżanie gęstości pikseli tła, gdy GPU nie nadąża — bez utraty płynności,
- intro marki przy pierwszej wizycie w sesji, nagłówki wjeżdżające słowo po słowie (`words.pipe.ts`), kinowe przejścia kart ze świetlną smugą, „dekodowanie” nadtytułów i odliczanie statystyk (`scramble-text.ts`), pasek technologii oraz zrzuty projektów w ramce laptopa (`motion.scss`),
- mikrointerakcje kursora: pierścień z podpisem kontekstowym, magnetyczne przyciski, przechylanie kart projektów z paralaksą (`pointer-effects.ts`), a w tle kursor jako węzeł sieci, który rozświetla i łączy pobliskie usługi,
- aktywny znacznik aktualnego etapu usług podczas przewijania strony na telefonie,
- formularz kontaktowy z walidacją i obsługą stanów wysyłania.

## Technologie projektu

- Angular 21, TypeScript i Angular SSR / prerendering statyczny,
- Three.js i własne shadery GLSL,
- SCSS,
- Vitest oraz Angular TestBed.

Portfolio prezentuje również doświadczenie z .NET / C#, ASP.NET Core Web API, Entity Framework Core, PostgreSQL, SQL Server, Dockerem, Azure i RabbitMQ.

## Instalacja i uruchomienie lokalne

Wymagany jest Node.js 20.19 lub nowszy.

```bash
npm ci
npm start
```

Po uruchomieniu wersje językowe są dostępne pod adresami `http://localhost:4200/pl/` i `http://localhost:4200/en/`.

## Testy i build produkcyjny

```bash
npm test
npm run build
```

Build wykonuje statyczny prerender tras `/pl/` i `/en/`. Wynik jest zapisywany w `dist/portfolio/browser` i może być hostowany bez serwera Node.js.

## Wdrożenie

Workflow GitHub Actions w `.github/workflows/deploy.yml` uruchamia `npm ci`, testy i produkcyjny build, a następnie publikuje `dist/portfolio/browser` w GitHub Pages. Wdrożenie następuje po pushu do gałęzi `master`.

## Struktura projektu

```text
src/app/app.*                 komponent aplikacji, treści, responsywność i formularz
src/app/helix-scroll.ts       przejścia pomiędzy sekcjami na helisie 3D
src/app/effects-policy.ts     wybór profilu efektów full, compact lub static
src/app/space-background/     scena Three.js: architektura systemu (shadery GLSL)
public/                       obrazy, robots.txt i sitemap.xml
.github/workflows/            testy, build i wdrożenie GitHub Pages
```

## Języki

Portfolio ma prerenderowane wersje: [polską](https://esakis.github.io/pl/) i [angielską](https://esakis.github.io/en/). Przełącznik prowadzi do właściwej statycznej wersji, która zawiera odpowiedni język dokumentu, canonical, `hreflang` i metadane społecznościowe.

## Responsywność i dostępność

Na telefonach helisa przechodzi w pionowy układ, numeracja elementów zachowuje jeden styl, a aktywna kropka osi usług podąża za aktualnie oglądaną pozycją. `prefers-reduced-motion` wyłącza płynne przejścia CSS, zatrzymuje animację tła i korzysta z układu płaskiego.

Tło to żywa architektura systemu (`system-graph.ts`): klastry usług — aplikacja webowa, API, baza danych, kolejka zdarzeń, integracje i chmura — połączone łukami przepływów, po których płyną pakiety danych. Każda karta helisy przybliża kamerę do kolejnej warstwy, która się rozświetla i dostaje etykietę w wolnym marginesie obok karty; przy kontakcie świeci cały system. Scena nie pobiera tekstur ani modeli, ruch pakietów liczą shadery, animacja zależy od czasu (nie od liczby klatek), a shadery kompilują się asynchronicznie. Profile:

- `full` — DPR do 1,5, wygładzanie krawędzi, paralaksa kursora,
- `compact` działa do `1000px`, przy `Save-Data` lub ograniczonej pamięci i liczbie rdzeni; bez wygładzania krawędzi i paralaksy,
- `static` obsługuje `prefers-reduced-motion`, renderując pojedynczą klatkę.

## Formularz kontaktowy

Formularz wysyła wiadomości przez istniejącą usługę Web3Forms. Klucz publiczny usługi jest przeznaczony do użycia po stronie klienta; nie przechowuj w repozytorium żadnych prywatnych kluczy, tokenów ani sekretów.
