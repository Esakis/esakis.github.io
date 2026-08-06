# <img src="public/fehu.svg" alt="Runa Fehu" width="28" height="28" align="top"> Łukasz Sroka Tech — portfolio

[![Łukasz Sroka Tech — Angular i .NET](https://esakis.github.io/og-image.png)](https://esakis.github.io/pl/)

Dwujęzyczne portfolio Łukasza Sroki prezentujące dedykowane aplikacje webowe dla firm, rozwój systemów oraz integracje. Wersja polska działa pod adresem [https://esakis.github.io/pl/](https://esakis.github.io/pl/), a angielska pod [https://esakis.github.io/en/](https://esakis.github.io/en/).

## Najważniejsze funkcje

- statycznie prerenderowane wersje polska i angielska z osobnymi metadanymi SEO,
- helisa 3D na szerokich ekranach i czytelny układ pionowy na urządzeniach mobilnych,
- kosmiczne tło Three.js z pełnym profilem desktopowym i lżejszym profilem mobilnym,
- automatyczne ograniczanie modeli, cząstek, rozdzielczości i liczby klatek przy `Save-Data` lub ograniczonych zasobach urządzenia,
- aktywny znacznik aktualnego etapu usług podczas przewijania strony na telefonie,
- formularz kontaktowy z walidacją i obsługą stanów wysyłania.

## Technologie projektu

- Angular 21, TypeScript i Angular SSR / prerendering statyczny,
- Three.js i modele GLTF,
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
src/app/space-background/     scena Three.js i modele planet
public/                       obrazy, modele 3D, robots.txt i sitemap.xml
.github/workflows/            testy, build i wdrożenie GitHub Pages
```

## Języki

Portfolio ma prerenderowane wersje: [polską](https://esakis.github.io/pl/) i [angielską](https://esakis.github.io/en/). Przełącznik prowadzi do właściwej statycznej wersji, która zawiera odpowiedni język dokumentu, canonical, `hreflang` i metadane społecznościowe.

## Responsywność i dostępność

Na telefonach helisa przechodzi w pionowy układ, numeracja elementów zachowuje jeden styl, a aktywna kropka osi usług podąża za aktualnie oglądaną pozycją. `prefers-reduced-motion` wyłącza płynne przejścia CSS, zatrzymuje animację tła i korzysta z układu płaskiego.

Scena Three.js korzysta z trzech profili:

- `full` zachowuje pełną jakość i modele planet na szerokich ekranach,
- `compact` działa do `1000px`, przy `Save-Data` lub ograniczonej pamięci i liczbie rdzeni; używa 30 FPS, DPR 1,5, połowy cząstek i nie pobiera modeli planet,
- `static` obsługuje `prefers-reduced-motion`, renderując pojedynczą klatkę bez planet.

## Formularz kontaktowy

Formularz wysyła wiadomości przez istniejącą usługę Web3Forms. Klucz publiczny usługi jest przeznaczony do użycia po stronie klienta; nie przechowuj w repozytorium żadnych prywatnych kluczy, tokenów ani sekretów.
