import { DOCUMENT, isPlatformBrowser, PlatformLocation } from '@angular/common';
import { PLATFORM_ID, afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpaceBackground } from './space-background/space-background';
import { HelixScroll } from './helix-scroll';

type Language = 'pl' | 'en';
type FormState = 'idle' | 'sending' | 'success' | 'error';
type FormField = 'name' | 'email' | 'message';
type FieldError = 'required' | 'email';

const SITE_URL = 'https://esakis.github.io';
const LANGUAGE_PATHS: Record<Language, string> = {
  pl: '/pl/',
  en: '/en/',
};

interface PortfolioScreenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Complete, self-contained data for a single portfolio case study. */
interface PortfolioProject {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  role: string;
  result: string;
  status: string;
  features: readonly string[];
  tags: readonly string[];
  accent: 'cyan' | 'lime';
  screenshots: readonly PortfolioScreenshot[];
  visualTitle: string;
  visualText: string;
  liveUrl?: string;
  repositoryUrl?: string;
}

// Klucz publiczny Web3Forms (z założenia trafia do bundla frontendu).
const WEB3FORMS_ACCESS_KEY = 'dfc5ddeb-3ac2-455e-bbbb-996e1cd77cec';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE = {
  name: 'Łukasz Sroka Tech',
  initials: 'LS',
  email: 'lukaszsrokatech@gmail.com',
  github: 'https://github.com/Esakis',
} as const;

const CONTENT = {
  pl: {
    metaTitle: 'Programista Angular i .NET | Dedykowane aplikacje dla firm – Łukasz Sroka',
    metaDescription:
      'Tworzę i rozwijam dedykowane aplikacje webowe dla firm w Angular i .NET. Systemy biznesowe, integracje API, modernizacja aplikacji i wdrożenia.',
    ogTitle: 'Programista Angular i .NET | Łukasz Sroka Tech',
    ogDescription:
      'Dedykowane aplikacje webowe dla firm — Angular, .NET, integracje API i rozwój systemów.',
    ogLocale: 'pl_PL',
    skipLink: 'Przejdź do treści',
    nav: [
      { label: 'O firmie', id: 'about' },
      { label: 'Realizacje', id: 'projects' },
      { label: 'Usługi', id: 'services' },
      { label: 'Kontakt', id: 'contact' },
    ],
    homeLabel: 'Łukasz Sroka Tech - strona główna',
    mainNavigationLabel: 'Główna nawigacja',
    mobileNavigationLabel: 'Nawigacja mobilna',
    languageSwitcherLabel: 'Wybór języka',
    menuLabel: 'Otwórz menu',
    closeMenuLabel: 'Zamknij menu',
    availability: 'Przyjmuję nowe projekty',
    eyebrow: 'Dedykowane aplikacje webowe / Angular + .NET',
    heroTitle: 'Tworzę aplikacje webowe',
    heroHighlight: 'dla firm w Angular i .NET.',
    heroDescription:
      'Projektuję nowe systemy, rozwijam istniejące aplikacje i integruję je z zewnętrznymi usługami — od analizy i implementacji po wdrożenie oraz dalszy rozwój.',
    heroPrimary: 'Zobacz realizacje',
    heroSecondary: 'Porozmawiajmy o projekcie',
    heroNote: 'Kraków, Polska · Współpraca zdalna',
    terminalLabel: 'firma.ts',
    terminalRole: 'Full-stack development',
    terminalFocus: ['Angular', '.NET', 'SQL'],
    terminalStatus: 'otwarty na nowe projekty',
    scrollLabel: 'Przewiń, aby poznać ofertę',
    statisticsLabel: 'Najważniejsze informacje o firmie',
    stats: [
      { value: '5+', label: 'lat doświadczenia w web developmencie' },
      { value: 'Angular + .NET', label: 'specjalizacja technologiczna' },
      { value: 'B2', label: 'język angielski' },
    ],
    aboutKicker: '01 / O firmie',
    aboutTitle: 'Technologia ma wartość wtedy, gdy pomaga rozwijać biznes.',
    aboutLead:
      'Łukasz Sroka Tech tworzy aplikacje webowe dopasowane do konkretnych potrzeb produktu i jego użytkowników.',
    aboutBody:
      'Pomagam zamieniać pomysły w działające rozwiązania oraz rozwijać istniejące systemy. Łączę frontend, backend i bazy danych, aby powstawały stabilne aplikacje gotowe na kolejne etapy rozwoju.',
    principles: [
      {
        number: '01',
        title: 'Kompleksowa realizacja',
        text: 'Od analizy potrzeb po wdrożenie działającego produktu.',
      },
      {
        number: '02',
        title: 'Skalowalny kod',
        text: 'Czytelne rozwiązania gotowe na rozwój i utrzymanie.',
      },
      {
        number: '03',
        title: 'Przejrzysta współpraca',
        text: 'Regularna komunikacja i skupienie na biznesowym celu projektu.',
      },
    ],
    skillsLabel: 'Główny stack',
    skills: [
      'Angular',
      'TypeScript',
      '.NET / C#',
      'ASP.NET Core Web API',
      'Entity Framework Core',
      'PostgreSQL / SQL Server',
      'Docker',
      'Azure',
      'RabbitMQ',
      'Git',
    ],
    projectsKicker: '02 / Realizacje',
    projectsTitle: 'Case studies: od produktu po stabilne systemy.',
    projectsIntro: 'Wybrane realizacje pokazujące problem, zakres pracy i zastosowane rozwiązania.',
    projectRoleLabel: 'Rola i zakres',
    projectProblemLabel: 'Problem użytkownika',
    projectSolutionLabel: 'Zaprojektowane rozwiązanie',
    projectFeaturesLabel: 'Najważniejsze funkcje',
    projectResultLabel: 'Rezultat i zakres',
    projectStatusLabel: 'Status projektu',
    projectLive: 'Zobacz aplikację',
    projects: [
      {
        id: 'ksiegowa-jdg',
        number: '01',
        title: 'Księgowa JDG',
        category: 'Produkt SaaS / FinTech',
        description:
          'Aplikacja webowa wspierająca jednoosobowe działalności gospodarcze w wystawianiu faktur, obsłudze KSeF, rejestrowaniu kosztów i pilnowaniu terminów podatkowych.',
        role: 'Autor rozwiązania: projekt produktu, frontend Angular, backend .NET, baza danych, integracje z usługami zewnętrznymi, wdrożenie i utrzymanie.',
        problem:
          'Właściciel JDG potrzebuje jednego miejsca do obsługi dokumentów i bieżących obowiązków bez ręcznego łączenia wielu narzędzi oraz terminów.',
        solution:
          'Aplikacja łączy wystawianie faktur, obsługę dokumentów kosztowych i przypomnienia o obowiązkach w jednym środowisku.',
        features: [
          'KSeF i faktury',
          'Koszty ze zdjęcia paragonu',
          'KPiR i JPK_V7M',
          'Rozliczenia VAT oraz ZUS',
          'Przypomnienia o terminach',
        ],
        result:
          'Aktualna wersja obejmuje obsługę faktur, kosztów, KPiR, JPK_V7M oraz bieżących rozliczeń i terminów.',
        status: 'Publicznie dostępny produkt rozwijany i utrzymywany na bieżąco.',
        tags: ['Angular', '.NET', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        screenshots: [
          {
            src: 'ksiegowa-jdg-pulpit.png',
            alt: 'Pulpit Księgowej JDG dla firmy testowej z zadaniami i zobowiązaniami',
            width: 2000,
            height: 1250,
          },
          {
            src: 'ksiegowa-jdg-faktury.png',
            alt: 'Widok faktur Księgowej JDG dla firmy testowej',
            width: 2000,
            height: 1250,
          },
        ],
        visualTitle: '',
        visualText: '',
        liveUrl: 'https://www.ksiegowajdg.pl',
      },
      {
        id: 'technical-reporting-system',
        number: '02',
        title: 'System raportowania i edycji dokumentów technicznych',
        category: 'Anonimowa realizacja / Angular',
        description:
          'Aplikacja Angular umożliwiająca edycję raportów na interaktywnym obszarze roboczym oraz eksport do PDF i formatów graficznych.',
        role: 'Projektowanie i implementacja frontendu Angular dla złożonego procesu edycji dokumentów.',
        problem:
          'Użytkownicy potrzebowali przygotowywać i aktualizować dokumentację techniczną bez ręcznego składania raportów w osobnych narzędziach.',
        solution:
          'Interaktywny obszar roboczy porządkuje edycję raportów i przygotowanie eksportów w jednym procesie.',
        features: [
          'Interaktywny obszar roboczy',
          'Edycja raportów',
          'Eksport do PDF',
          'Eksport formatów graficznych',
        ],
        result:
          'Zakres dostarczonego frontendu obejmował edycję raportów oraz eksport dokumentów do PDF i formatów graficznych.',
        status: 'Zrealizowany projekt klienta; nazwa i materiały objęte poufnością.',
        tags: ['Angular', 'TypeScript', 'PDF', 'Eksport'],
        accent: 'lime',
        screenshots: [],
        visualTitle: 'Edytor raportów',
        visualText: 'Angular / PDF / grafika',
        liveUrl: undefined,
      },
    ] satisfies readonly PortfolioProject[],
    servicesKicker: '03 / Usługi',
    servicesTitle: 'Od koncepcji do sprawnie działającego produktu.',
    services: [
      {
        period: '01',
        role: 'Dedykowane aplikacje biznesowe',
        company: 'Angular + .NET',
        description:
          'Projektowanie i budowa aplikacji internetowych dopasowanych do procesów firmy — frontend Angular, backend .NET, baza danych i wdrożenie.',
        highlights: ['Angular', '.NET', 'SQL'],
      },
      {
        period: '02',
        role: 'Rozwój i modernizacja systemów',
        company: 'Istniejące aplikacje',
        description:
          'Dodawanie nowych funkcji, modernizacja starszego kodu, migracje do nowszych wersji Angulara i .NET oraz poprawa wydajności.',
        highlights: ['Angular', '.NET', 'Entity Framework Core'],
      },
      {
        period: '03',
        role: 'Integracje i automatyzacje',
        company: 'Procesy i dane',
        description:
          'Integracje API, KSeF, systemy płatności, wymiana danych, generowanie dokumentów oraz automatyzacja powtarzalnych procesów.',
        highlights: ['API', 'KSeF', 'RabbitMQ'],
      },
    ],
    servicesNote:
      'Po wdrożeniu zapewniam także wsparcie techniczne, diagnozowanie problemów i dalszy rozwój działających produktów.',
    processLabel: 'Współpraca projektowa',
    process: [
      {
        number: '01',
        title: 'Analiza',
        text: 'Poznaję cel projektu, użytkowników i najważniejsze wymagania.',
      },
      {
        number: '02',
        title: 'Budowa',
        text: 'Tworzę rozwiązanie etapami, z regularną informacją o postępach.',
      },
      {
        number: '03',
        title: 'Rozwój',
        text: 'Wdrażam, optymalizuję i wspieram produkt po jego uruchomieniu.',
      },
    ],
    contactKicker: '04 / Kontakt',
    contactTitle: 'Masz pomysł na produkt?',
    contactHighlight: 'Zbudujmy go.',
    contactText:
      'Napisz, nad czym pracujesz i czego potrzebujesz. Wspólnie ustalimy, jak najlepiej zrealizować Twój projekt.',
    form: {
      nameLabel: 'Imię',
      namePlaceholder: 'Jak się do Ciebie zwracać?',
      emailLabel: 'E-mail',
      emailPlaceholder: 'twoj@email.pl',
      messageLabel: 'Wiadomość',
      messagePlaceholder: 'Napisz, nad czym pracujesz i jak mogę pomóc.',
      submit: 'Wyślij wiadomość',
      sending: 'Wysyłanie…',
      success: 'Dziękuję! Wiadomość została wysłana. Odezwę się najszybciej, jak to możliwe.',
      error:
        'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę lub napisz bezpośrednio na podany adres e-mail.',
      errorRequired: 'To pole jest wymagane.',
      errorEmail: 'Podaj poprawny adres e-mail.',
    },
    socialLabel: 'Zobacz także',
    footerNote: 'Aplikacje webowe tworzone z dbałością o detal.',
    backToTop: 'Wróć na górę',
  },
  en: {
    metaTitle: 'Angular and .NET Developer | Custom web applications for businesses – Łukasz Sroka',
    metaDescription:
      'I build and develop custom web applications for businesses with Angular and .NET. Business systems, API integrations, application modernization and delivery.',
    ogTitle: 'Angular and .NET Developer | Łukasz Sroka Tech',
    ogDescription:
      'Custom web applications for businesses — Angular, .NET, API integrations and system development.',
    ogLocale: 'en_US',
    skipLink: 'Skip to content',
    nav: [
      { label: 'About', id: 'about' },
      { label: 'Work', id: 'projects' },
      { label: 'Services', id: 'services' },
      { label: 'Contact', id: 'contact' },
    ],
    homeLabel: 'Łukasz Sroka Tech - home',
    mainNavigationLabel: 'Main navigation',
    mobileNavigationLabel: 'Mobile navigation',
    languageSwitcherLabel: 'Language selector',
    menuLabel: 'Open menu',
    closeMenuLabel: 'Close menu',
    availability: 'Available for new projects',
    eyebrow: 'Custom web applications / Angular + .NET',
    heroTitle: 'I build web applications',
    heroHighlight: 'for businesses with Angular and .NET.',
    heroDescription:
      'I design new systems, develop existing applications and integrate them with external services — from analysis and implementation to delivery and continued development.',
    heroPrimary: 'Explore the work',
    heroSecondary: "Let's discuss your project",
    heroNote: 'Krakow, Poland · Remote collaboration',
    terminalLabel: 'company.ts',
    terminalRole: 'Full-stack development',
    terminalFocus: ['Angular', '.NET', 'SQL'],
    terminalStatus: 'available for new projects',
    scrollLabel: 'Scroll to explore the offer',
    statisticsLabel: 'Key company information',
    stats: [
      { value: '5+', label: 'years in web development' },
      { value: 'Angular + .NET', label: 'technology specialization' },
      { value: 'B2', label: 'English proficiency' },
    ],
    aboutKicker: '01 / About',
    aboutTitle: 'Technology matters when it helps a business grow.',
    aboutLead:
      'Łukasz Sroka Tech builds web applications tailored to the needs of each product and its users.',
    aboutBody:
      'I turn ideas into working solutions and develop existing systems. By combining frontend, backend and databases, I deliver reliable applications ready for their next stage of growth.',
    principles: [
      {
        number: '01',
        title: 'End-to-end delivery',
        text: 'From understanding the need to launching a working product.',
      },
      {
        number: '02',
        title: 'Scalable code',
        text: 'Clear solutions built for further development and maintenance.',
      },
      {
        number: '03',
        title: 'Clear collaboration',
        text: 'Regular communication and a focus on the project’s business goal.',
      },
    ],
    skillsLabel: 'Core stack',
    skills: [
      'Angular',
      'TypeScript',
      '.NET / C#',
      'ASP.NET Core Web API',
      'Entity Framework Core',
      'PostgreSQL / SQL Server',
      'Docker',
      'Azure',
      'RabbitMQ',
      'Git',
    ],
    projectsKicker: '02 / Work',
    projectsTitle: 'Case studies: from product to resilient systems.',
    projectsIntro: 'Selected work showing the problem, scope and solutions behind each project.',
    projectRoleLabel: 'Role and scope',
    projectProblemLabel: 'User problem',
    projectSolutionLabel: 'Designed solution',
    projectFeaturesLabel: 'Key features',
    projectResultLabel: 'Result and scope',
    projectStatusLabel: 'Project status',
    projectLive: 'View application',
    projects: [
      {
        id: 'ksiegowa-jdg',
        number: '01',
        title: 'Księgowa JDG',
        category: 'SaaS product / FinTech',
        description:
          'A web application that helps sole proprietors issue invoices, work with KSeF, register expenses and stay on top of tax deadlines.',
        role: 'Solution author: product design, Angular frontend, .NET backend, database, external-service integrations, deployment and maintenance.',
        problem:
          'A sole proprietor needs one place to manage documents and recurring obligations instead of manually coordinating separate tools and deadlines.',
        solution:
          'The application brings invoice issuing, expense documents and obligation reminders into one environment.',
        features: [
          'KSeF and invoices',
          'Receipt-photo expenses',
          'Tax ledger and JPK_V7M',
          'VAT and ZUS settlements',
          'Deadline reminders',
        ],
        result:
          'The current version covers invoices, expenses, the tax ledger, JPK_V7M, and ongoing settlements and deadlines.',
        status: 'A publicly available product that is actively developed and maintained.',
        tags: ['Angular', '.NET', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        screenshots: [
          {
            src: 'ksiegowa-jdg-pulpit.png',
            alt: 'Księgowa JDG dashboard for a test company with tasks and obligations',
            width: 2000,
            height: 1250,
          },
          {
            src: 'ksiegowa-jdg-faktury.png',
            alt: 'Księgowa JDG invoice view for a test company',
            width: 2000,
            height: 1250,
          },
        ],
        visualTitle: '',
        visualText: '',
        liveUrl: 'https://www.ksiegowajdg.pl',
      },
      {
        id: 'technical-reporting-system',
        number: '02',
        title: 'Technical reporting and document-editing system',
        category: 'Anonymous project / Angular',
        description:
          'An Angular application for editing reports in an interactive workspace and exporting them to PDF and image formats.',
        role: 'Design and implementation of an Angular frontend for a complex document-editing workflow.',
        problem:
          'Users needed to prepare and update technical documentation without assembling reports manually in separate tools.',
        solution:
          'An interactive workspace brings report editing and export preparation into one workflow.',
        features: ['Interactive workspace', 'Report editing', 'PDF export', 'Image-format export'],
        result:
          'The delivered frontend scope included report editing and document exports to PDF and image formats.',
        status: 'Delivered client project; the name and materials are confidential.',
        tags: ['Angular', 'TypeScript', 'PDF', 'Export'],
        accent: 'lime',
        screenshots: [],
        visualTitle: 'Report editor',
        visualText: 'Angular / PDF / images',
        liveUrl: undefined,
      },
    ] satisfies readonly PortfolioProject[],
    servicesKicker: '03 / Services',
    servicesTitle: 'From concept to a product that runs smoothly.',
    services: [
      {
        period: '01',
        role: 'Custom business applications',
        company: 'Angular + .NET',
        description:
          'Designing and building web applications tailored to company processes — Angular frontend, .NET backend, database and deployment.',
        highlights: ['Angular', '.NET', 'SQL'],
      },
      {
        period: '02',
        role: 'System development and modernization',
        company: 'Existing applications',
        description:
          'Adding features, modernizing legacy code, migrating to newer Angular and .NET versions, and improving performance.',
        highlights: ['Angular', '.NET', 'Entity Framework Core'],
      },
      {
        period: '03',
        role: 'Integrations and automation',
        company: 'Processes and data',
        description:
          'API integrations, KSeF, payment systems, data exchange, document generation and automation of repetitive processes.',
        highlights: ['API', 'KSeF', 'RabbitMQ'],
      },
    ],
    servicesNote:
      'After deployment, I also provide technical support, issue diagnosis and continued development for live products.',
    processLabel: 'Project collaboration',
    process: [
      {
        number: '01',
        title: 'Analysis',
        text: 'I learn the project goal, its users and the essential requirements.',
      },
      {
        number: '02',
        title: 'Build',
        text: 'I deliver the solution in stages and keep progress visible throughout.',
      },
      {
        number: '03',
        title: 'Develop',
        text: 'I launch, optimize and support the product after it goes live.',
      },
    ],
    contactKicker: '04 / Contact',
    contactTitle: 'Have a product idea?',
    contactHighlight: "Let's build it.",
    contactText:
      'Tell me what you are working on and what you need. Together, we can define the best way to deliver your project.',
    form: {
      nameLabel: 'Name',
      namePlaceholder: 'How should I address you?',
      emailLabel: 'E-mail',
      emailPlaceholder: 'your@email.com',
      messageLabel: 'Message',
      messagePlaceholder: 'Tell me what you are working on and how I can help.',
      submit: 'Send message',
      sending: 'Sending…',
      success: 'Thank you! Your message has been sent. I will get back to you as soon as possible.',
      error:
        'The message could not be sent. Please try again shortly or write directly to the e-mail address provided.',
      errorRequired: 'This field is required.',
      errorEmail: 'Please enter a valid e-mail address.',
    },
    socialLabel: 'Also available here',
    footerNote: 'Web applications built with attention to detail.',
    backToTop: 'Back to top',
  },
} as const;

@Component({
  selector: 'app-root',
  imports: [SpaceBackground, HelixScroll, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(PlatformLocation);

  protected readonly language = signal<Language>(this.languageFromPath());
  protected readonly menuOpen = signal(false);
  protected readonly copy = computed(() => CONTENT[this.language()]);
  protected readonly profile = PROFILE;
  protected readonly currentYear = new Date().getFullYear();

  // Stan formularza kontaktowego.
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactMessage = signal('');
  protected readonly honeypot = signal(''); // pułapka antyspamowa
  protected readonly formState = signal<FormState>('idle');
  protected readonly formErrors = signal<Partial<Record<FormField, FieldError>>>({});

  private static readonly CONTACT_REQUEST_TIMEOUT_MS = 15_000;

  constructor() {
    this.applyLanguage(this.language());
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.isStaticLanguagePath()) return;
      const savedLanguage = this.readSavedLanguage();
      if (savedLanguage) this.setLanguage(savedLanguage);
    });
  }

  protected setLanguage(language: Language): void {
    this.applyLanguage(language);
    if (isPlatformBrowser(this.platformId) && !this.isStaticLanguagePath()) {
      try {
        window.localStorage.setItem('portfolio-language', language);
      } catch {
        // Privacy settings can deny storage; the language still changes for this visit.
      }
    }
  }

  protected languageHref(language: Language): string {
    return LANGUAGE_PATHS[language];
  }

  protected fragmentHref(fragment: string): string {
    return `${LANGUAGE_PATHS[this.language()]}#${fragment}`;
  }

  private applyLanguage(language: Language): void {
    this.language.set(language);
    this.document.documentElement.lang = language;
    this.updateMetadata(language);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onFieldInput(field: FormField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'name') this.contactName.set(value);
    else if (field === 'email') this.contactEmail.set(value);
    else this.contactMessage.set(value);

    // Czyścimy błąd edytowanego pola oraz status z poprzedniej próby.
    if (this.formErrors()[field]) {
      const next = { ...this.formErrors() };
      delete next[field];
      this.formErrors.set(next);
    }
    if (this.formState() === 'error' || this.formState() === 'success') {
      this.formState.set('idle');
    }
  }

  protected async submitContact(event: Event): Promise<void> {
    event.preventDefault();
    if (this.formState() === 'sending') return; // blokada wielokrotnego wysłania

    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const message = this.contactMessage().trim();

    const errors: Partial<Record<FormField, FieldError>> = {};
    if (!name) errors.name = 'required';
    if (!email) errors.email = 'required';
    else if (!EMAIL_PATTERN.test(email)) errors.email = 'email';
    if (!message) errors.message = 'required';
    this.formErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.formState.set('idle');
      this.focusFirstInvalidField(errors);
      return;
    }

    // Honeypot zatrzymuje podejrzane zgłoszenie, ale nigdy nie udaje sukcesu.
    if (this.honeypot().trim() !== '') {
      this.formState.set('idle');
      return;
    }

    this.formState.set('sending');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), App.CONTACT_REQUEST_TIMEOUT_MS);
    try {
      // FormData (multipart/form-data) to „proste" żądanie — nie wywołuje
      // preflightu CORS, w przeciwieństwie do application/json.
      const formData = new FormData();
      formData.append('access_key', WEB3FORMS_ACCESS_KEY);
      formData.append('subject', `Nowa wiadomość z portfolio — ${name}`);
      formData.append('from_name', PROFILE.name);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('message', message);

      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = (await response.json()) as { success?: boolean };
      if (response.ok && data.success) {
        this.formState.set('success');
        this.contactName.set('');
        this.contactEmail.set('');
        this.contactMessage.set('');
      } else {
        this.formState.set('error');
      }
    } catch {
      this.formState.set('error');
    } finally {
      clearTimeout(timeout);
    }
  }

  private focusFirstInvalidField(errors: Partial<Record<FormField, FieldError>>): void {
    const firstField: FormField | undefined = (['name', 'email', 'message'] as const).find(
      (field) => !!errors[field],
    );
    this.document.getElementById(firstField ? `contact-${firstField}` : '')?.focus();
  }

  private updateMetadata(language: Language): void {
    const metadata = CONTENT[language];
    const canonicalUrl = `${SITE_URL}${this.canonicalPath(language)}`;
    this.document.title = metadata.metaTitle;
    this.setMetaContent('meta[name="description"]', metadata.metaDescription);
    this.setMetaContent('meta[property="og:title"]', metadata.ogTitle);
    this.setMetaContent('meta[property="og:description"]', metadata.ogDescription);
    this.setMetaContent('meta[property="og:locale"]', metadata.ogLocale);
    this.setMetaContent('meta[name="twitter:title"]', metadata.ogTitle);
    this.setMetaContent('meta[name="twitter:description"]', metadata.ogDescription);
    this.setMetaContent('meta[property="og:url"]', canonicalUrl);
    this.setLinkHref('link[rel="canonical"]', canonicalUrl);
  }

  private setMetaContent(selector: string, content: string): void {
    this.document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
  }

  private setLinkHref(selector: string, href: string): void {
    this.document.querySelector<HTMLLinkElement>(selector)?.setAttribute('href', href);
  }

  private languageFromPath(): Language {
    return this.pathname().startsWith('/en') ? 'en' : 'pl';
  }

  private canonicalPath(language: Language): string {
    const pathname = this.pathname();
    if (pathname.startsWith('/pl')) return LANGUAGE_PATHS.pl;
    if (pathname.startsWith('/en')) return LANGUAGE_PATHS.en;
    return LANGUAGE_PATHS[language];
  }

  private isStaticLanguagePath(): boolean {
    return /^\/(pl|en)(?:\/|$)/.test(this.pathname());
  }

  private pathname(): string {
    if (isPlatformBrowser(this.platformId)) return window.location.pathname;
    return this.location.pathname;
  }

  private readSavedLanguage(): Language | undefined {
    try {
      const language = window.localStorage.getItem('portfolio-language');
      return language === 'pl' || language === 'en' ? language : undefined;
    } catch {
      return undefined;
    }
  }
}
