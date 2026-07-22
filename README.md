# Łukasz Sroka Tech — portfolio

[![Łukasz Sroka Tech — Angular i .NET](https://esakis.github.io/og-image.png)](https://esakis.github.io/)

Portfolio Łukasza Sroki prezentujące dedykowane aplikacje webowe dla firm, rozwój systemów oraz integracje. Strona działa pod adresem [https://esakis.github.io/](https://esakis.github.io/).

## Technologie

- Angular 21, TypeScript i Angular SSR / prerendering statyczny
- Three.js (kosmiczne tło i efekty 3D)
- .NET / C#, ASP.NET Core Web API, Entity Framework Core
- PostgreSQL, SQL Server, Docker, Azure, RabbitMQ i Git

## Instalacja i uruchomienie lokalne

Wymagany jest Node.js 20.19 lub nowszy.

```bash
npm ci
npm start
```

Po uruchomieniu aplikacja jest dostępna pod adresem `http://localhost:4200/`.

## Testy i build produkcyjny

```bash
npm test
npm run build
```

Build wykonuje statyczny prerender Angulara. Wynik jest zapisywany w `dist/portfolio/browser` i może być hostowany bez serwera Node.js.

## Wdrożenie

Workflow GitHub Actions w `.github/workflows/deploy.yml` uruchamia `npm ci`, testy i produkcyjny build, a następnie publikuje `dist/portfolio/browser` w GitHub Pages. Wdrożenie następuje po pushu do gałęzi `master`.

## Struktura projektu

```text
src/app/                     komponent aplikacji, dane treści i formularz
src/app/space-background/    scena Three.js i modele planet
src/app/helix-scroll.ts       przejścia pomiędzy sekcjami na helisie 3D
public/                       obrazy, modele 3D, robots.txt i sitemap.xml
.github/workflows/            automatyczne wdrożenie GitHub Pages
```

## Języki

Portfolio ma prerenderowane wersje: [polską](https://esakis.github.io/pl/) i [angielską](https://esakis.github.io/en/). Przełącznik prowadzi do właściwej statycznej wersji, która zawiera odpowiedni język dokumentu i metadane SEO.

## Formularz kontaktowy

Formularz wysyła wiadomości przez istniejącą usługę Web3Forms. Klucz publiczny usługi jest przeznaczony do użycia po stronie klienta; nie przechowuj w repozytorium żadnych prywatnych kluczy, tokenów ani sekretów.
