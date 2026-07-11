import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

type Language = 'pl' | 'en';

const PROFILE = {
  name: 'Jan Kowalski',
  initials: 'JK',
  email: 'jan.kowalski.dev@gmail.com',
  linkedin: 'https://www.linkedin.com/in/jan-kowalski',
  github: 'https://github.com/jankowalski',
  projects: [
    {
      liveUrl: 'https://example.com/flowboard',
      codeUrl: 'https://github.com/jankowalski/flowboard',
    },
    {
      liveUrl: 'https://example.com/staywise',
      codeUrl: 'https://github.com/jankowalski/staywise',
    },
    {
      liveUrl: 'https://example.com/habit-os',
      codeUrl: 'https://github.com/jankowalski/habit-os',
    },
  ],
} as const;

const CONTENT = {
  pl: {
    metaTitle: 'Jan Kowalski | Frontend Developer',
    skipLink: 'Przejdź do treści',
    nav: [
      { label: 'O mnie', id: 'about' },
      { label: 'Projekty', id: 'projects' },
      { label: 'Doświadczenie', id: 'experience' },
      { label: 'Kontakt', id: 'contact' },
    ],
    homeLabel: 'Jan Kowalski - strona główna',
    mainNavigationLabel: 'Główna nawigacja',
    mobileNavigationLabel: 'Nawigacja mobilna',
    languageSwitcherLabel: 'Wybór języka',
    menuLabel: 'Otwórz menu',
    closeMenuLabel: 'Zamknij menu',
    availability: 'Dostępny na nowe wyzwania',
    eyebrow: 'Frontend Developer / Angular',
    heroTitle: 'Buduję interfejsy, które',
    heroHighlight: 'pracują na wynik.',
    heroDescription:
      'Łączę solidny kod, przemyślany UX i dbałość o detale. Tworzę szybkie, dostępne aplikacje webowe, które rozwiązują realne problemy użytkowników.',
    heroPrimary: 'Zobacz moje projekty',
    heroSecondary: 'Porozmawiajmy',
    heroNote: 'Wrocław, Polska · Praca zdalna / hybrydowa',
    terminalLabel: 'profil.ts',
    terminalRole: 'Frontend Developer',
    terminalFocus: ['Angular', 'TypeScript', 'UX'],
    terminalStatus: 'gotowy do współpracy',
    scrollLabel: 'Przewiń, aby poznać mnie lepiej',
    stats: [
      { value: '3+', label: 'lata doświadczenia' },
      { value: '12', label: 'wdrożonych projektów' },
      { value: '96', label: 'średni wynik Lighthouse' },
    ],
    aboutKicker: '01 / O mnie',
    aboutTitle: 'Technologia ma znaczenie dopiero wtedy, gdy służy ludziom.',
    aboutLead:
      'Jestem frontend developerem skoncentrowanym na Angularze i dopracowanych produktach cyfrowych.',
    aboutBody:
      'Najlepiej czuję się na styku developmentu, designu i biznesu. Lubię porządkować złożone wymagania, zamieniać je w intuicyjne interfejsy i dowozić rozwiązania, które dobrze się skalują. W pracy cenię odpowiedzialność, komunikację i ciągłe doskonalenie warsztatu.',
    principles: [
      {
        number: '01',
        title: 'Jakość kodu',
        text: 'Czytelne rozwiązania, testy i świadome decyzje techniczne.',
      },
      {
        number: '02',
        title: 'Produktowe myślenie',
        text: 'Najpierw problem użytkownika, potem technologia.',
      },
      {
        number: '03',
        title: 'Dobra współpraca',
        text: 'Transparentna komunikacja i odpowiedzialność za wynik.',
      },
    ],
    skillsLabel: 'Główny stack',
    skills: ['Angular', 'TypeScript', 'RxJS', 'SCSS', 'REST API', 'Git', 'Figma', 'Vitest'],
    projectsKicker: '02 / Wybrane projekty',
    projectsTitle: 'Produkty zaprojektowane z myślą o prawdziwym użyciu.',
    projectsIntro:
      'Przykładowe case studies pokazujące sposób, w jaki łączę warstwę wizualną z logiką aplikacji.',
    projectLive: 'Podgląd projektu',
    projectCode: 'Kod źródłowy',
    projects: [
      {
        number: '01',
        title: 'Flowboard',
        category: 'SaaS / Analityka',
        description:
          'Panel operacyjny, który zamienia rozproszone dane zespołu w czytelne wskaźniki i alerty w czasie rzeczywistym.',
        result: '−34% czasu raportowania',
        tags: ['Angular', 'RxJS', 'Chart.js'],
        accent: 'cyan',
        visual: 'dashboard',
      },
      {
        number: '02',
        title: 'Staywise',
        category: 'Travel / Booking',
        description:
          'Responsywny proces rezerwacji apartamentów z inteligentnym filtrowaniem, płynnym checkoutem i panelem gospodarza.',
        result: '+21% ukończonych rezerwacji',
        tags: ['Angular', 'Signals', 'Stripe'],
        accent: 'lime',
        visual: 'booking',
      },
      {
        number: '03',
        title: 'Habit OS',
        category: 'Productivity / PWA',
        description:
          'Minimalistyczna aplikacja do budowania nawyków, działająca offline i prezentująca postęp bez zbędnego szumu.',
        result: '4.8 / 5 w testach użytkowników',
        tags: ['Angular', 'PWA', 'IndexedDB'],
        accent: 'coral',
        visual: 'mobile',
      },
    ],
    experienceKicker: '03 / Doświadczenie',
    experienceTitle: 'Rozwijam produkty, nie tylko funkcje.',
    experience: [
      {
        period: '2024 — obecnie',
        role: 'Frontend Developer',
        company: 'Northstar Digital',
        description:
          'Rozwój aplikacji B2B w Angularze, projektowanie komponentów współdzielonych i współpraca z product designerami oraz backendem.',
        highlights: ['Angular', 'Design system', 'Code review'],
      },
      {
        period: '2022 — 2024',
        role: 'Junior Frontend Developer',
        company: 'Bright Apps Studio',
        description:
          'Budowa responsywnych serwisów i paneli administracyjnych, integracje REST API oraz optymalizacja wydajności frontendu.',
        highlights: ['TypeScript', 'REST API', 'Performance'],
      },
      {
        period: '2021 — 2022',
        role: 'Freelance Web Developer',
        company: 'Projekty komercyjne',
        description:
          'Samodzielna realizacja stron dla małych firm: od ustalenia potrzeb, przez prototyp, po wdrożenie i utrzymanie.',
        highlights: ['UI development', 'Figma', 'SEO'],
      },
    ],
    processLabel: 'Jak pracuję',
    process: [
      {
        number: '01',
        title: 'Rozumiem',
        text: 'Pytam, analizuję kontekst i definiuję właściwy problem.',
      },
      {
        number: '02',
        title: 'Projektuję',
        text: 'Upraszczam przepływy i szybko weryfikuję założenia.',
      },
      { number: '03', title: 'Dowożę', text: 'Implementuję, testuję i mierzę jakość rozwiązania.' },
    ],
    contactKicker: '04 / Kontakt',
    contactTitle: 'Masz projekt lub rolę, do której pasuję?',
    contactHighlight: 'Porozmawiajmy.',
    contactText:
      'Chętnie poznam zespół, produkt i wyzwania, nad którymi pracujecie. Najszybciej odpowiadam mailowo.',
    contactButton: 'Napisz wiadomość',
    socialLabel: 'Znajdź mnie także tutaj',
    footerNote: 'Zaprojektowane i zbudowane z dbałością o detal.',
    backToTop: 'Wróć na górę',
  },
  en: {
    metaTitle: 'Jan Kowalski | Frontend Developer',
    skipLink: 'Skip to content',
    nav: [
      { label: 'About', id: 'about' },
      { label: 'Projects', id: 'projects' },
      { label: 'Experience', id: 'experience' },
      { label: 'Contact', id: 'contact' },
    ],
    homeLabel: 'Jan Kowalski - home',
    mainNavigationLabel: 'Main navigation',
    mobileNavigationLabel: 'Mobile navigation',
    languageSwitcherLabel: 'Language selector',
    menuLabel: 'Open menu',
    closeMenuLabel: 'Close menu',
    availability: 'Available for new opportunities',
    eyebrow: 'Frontend Developer / Angular',
    heroTitle: 'I build interfaces that',
    heroHighlight: 'drive real outcomes.',
    heroDescription:
      'I combine solid engineering, thoughtful UX and attention to detail. I create fast, accessible web applications that solve real user problems.',
    heroPrimary: 'Explore my work',
    heroSecondary: "Let's talk",
    heroNote: 'Wrocław, Poland · Remote / hybrid',
    terminalLabel: 'profile.ts',
    terminalRole: 'Frontend Developer',
    terminalFocus: ['Angular', 'TypeScript', 'UX'],
    terminalStatus: 'open to work',
    scrollLabel: 'Scroll to learn more about me',
    stats: [
      { value: '3+', label: 'years of experience' },
      { value: '12', label: 'projects delivered' },
      { value: '96', label: 'average Lighthouse score' },
    ],
    aboutKicker: '01 / About',
    aboutTitle: 'Technology only matters when it works for people.',
    aboutLead: 'I am a frontend developer focused on Angular and well-crafted digital products.',
    aboutBody:
      'I thrive at the intersection of development, design and business. I enjoy untangling complex requirements, turning them into intuitive interfaces and shipping solutions that scale. I value ownership, clear communication and continuous improvement.',
    principles: [
      {
        number: '01',
        title: 'Code quality',
        text: 'Readable solutions, tests and deliberate technical decisions.',
      },
      {
        number: '02',
        title: 'Product mindset',
        text: 'The user problem comes first, technology comes second.',
      },
      {
        number: '03',
        title: 'True collaboration',
        text: 'Transparent communication and shared ownership of outcomes.',
      },
    ],
    skillsLabel: 'Core stack',
    skills: ['Angular', 'TypeScript', 'RxJS', 'SCSS', 'REST API', 'Git', 'Figma', 'Vitest'],
    projectsKicker: '02 / Selected work',
    projectsTitle: 'Products designed for real-world use.',
    projectsIntro: 'Sample case studies showing how I combine visual craft with application logic.',
    projectLive: 'View project',
    projectCode: 'Source code',
    projects: [
      {
        number: '01',
        title: 'Flowboard',
        category: 'SaaS / Analytics',
        description:
          'An operations dashboard that turns scattered team data into clear metrics and real-time alerts.',
        result: '−34% reporting time',
        tags: ['Angular', 'RxJS', 'Chart.js'],
        accent: 'cyan',
        visual: 'dashboard',
      },
      {
        number: '02',
        title: 'Staywise',
        category: 'Travel / Booking',
        description:
          'A responsive apartment booking flow with smart filtering, frictionless checkout and a host dashboard.',
        result: '+21% completed bookings',
        tags: ['Angular', 'Signals', 'Stripe'],
        accent: 'lime',
        visual: 'booking',
      },
      {
        number: '03',
        title: 'Habit OS',
        category: 'Productivity / PWA',
        description:
          'A minimal offline-first habit tracker that makes progress visible without unnecessary noise.',
        result: '4.8 / 5 in user testing',
        tags: ['Angular', 'PWA', 'IndexedDB'],
        accent: 'coral',
        visual: 'mobile',
      },
    ],
    experienceKicker: '03 / Experience',
    experienceTitle: 'I grow products, not just features.',
    experience: [
      {
        period: '2024 — present',
        role: 'Frontend Developer',
        company: 'Northstar Digital',
        description:
          'Building Angular B2B applications, designing shared components and partnering with product designers and backend engineers.',
        highlights: ['Angular', 'Design system', 'Code review'],
      },
      {
        period: '2022 — 2024',
        role: 'Junior Frontend Developer',
        company: 'Bright Apps Studio',
        description:
          'Built responsive websites and admin panels, integrated REST APIs and improved frontend performance.',
        highlights: ['TypeScript', 'REST API', 'Performance'],
      },
      {
        period: '2021 — 2022',
        role: 'Freelance Web Developer',
        company: 'Commercial projects',
        description:
          'Delivered websites for small businesses end to end: discovery, prototyping, implementation and maintenance.',
        highlights: ['UI development', 'Figma', 'SEO'],
      },
    ],
    processLabel: 'How I work',
    process: [
      {
        number: '01',
        title: 'Understand',
        text: 'I ask questions, explore context and define the right problem.',
      },
      { number: '02', title: 'Design', text: 'I simplify flows and validate assumptions early.' },
      {
        number: '03',
        title: 'Deliver',
        text: 'I implement, test and measure the quality of the solution.',
      },
    ],
    contactKicker: '04 / Contact',
    contactTitle: 'Have a project or a role that fits?',
    contactHighlight: "Let's talk.",
    contactText:
      'I would be happy to learn about your team, product and current challenges. Email is the fastest way to reach me.',
    contactButton: 'Send a message',
    socialLabel: 'You can also find me here',
    footerNote: 'Designed and built with attention to detail.',
    backToTop: 'Back to top',
  },
} as const;

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);

  protected readonly language = signal<Language>('pl');
  protected readonly menuOpen = signal(false);
  protected readonly copy = computed(() => CONTENT[this.language()]);
  protected readonly profile = PROFILE;
  protected readonly currentYear = new Date().getFullYear();

  protected setLanguage(language: Language): void {
    this.language.set(language);
    this.document.documentElement.lang = language;
    this.document.title = CONTENT[language].metaTitle;
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
