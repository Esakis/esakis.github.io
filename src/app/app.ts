import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { SpaceBackground } from './space-background/space-background';
import { HelixScroll } from './helix-scroll';

type Language = 'pl' | 'en';
type FormState = 'idle' | 'sending' | 'success' | 'error';
type FormField = 'name' | 'email' | 'message';
type FieldError = 'required' | 'email';

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
    metaTitle: 'Programista .NET i Angular Kraków | Łukasz Sroka Tech',
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
    eyebrow: 'Aplikacje webowe / Full-stack',
    heroTitle: 'Tworzę oprogramowanie, które',
    heroHighlight: 'wspiera Twój biznes.',
    heroDescription:
      'Projektuję, buduję i rozwijam aplikacje webowe - od pierwszej wersji produktu po rozbudowę istniejących systemów.',
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
      'Python',
    ],
    projectsKicker: '02 / Realizacje',
    projectsTitle: 'Case studies: od produktu po stabilne systemy.',
    projectsIntro: 'Wybrane realizacje pokazujące problem, zakres pracy i zastosowane rozwiązania.',
    projectRoleLabel: 'Rola i zakres',
    projectProblemLabel: 'Problem użytkownika',
    projectFeaturesLabel: 'Najważniejsze funkcje',
    projectArchitectureLabel: 'Architektura i technologia',
    projectStageLabel: 'Obecny etap',
    projectLive: 'Zobacz aplikację',
    projects: [
      {
        number: '01',
        title: 'Księgowa JDG',
        category: 'Produkt SaaS / FinTech',
        description:
          'Aplikacja webowa wspierająca jednoosobowe działalności gospodarcze w wystawianiu faktur, obsłudze KSeF, rejestrowaniu kosztów i pilnowaniu terminów podatkowych.',
        role:
          'Autor rozwiązania: projekt produktu, frontend Angular, backend .NET, baza danych, integracje z usługami zewnętrznymi, wdrożenie i utrzymanie.',
        problem:
          'Właściciel JDG potrzebuje jednego miejsca do obsługi dokumentów i bieżących obowiązków bez ręcznego łączenia wielu narzędzi oraz terminów.',
        features: [
          'KSeF i faktury',
          'Koszty ze zdjęcia paragonu',
          'KPiR i JPK_V7M',
          'Rozliczenia VAT oraz ZUS',
          'Przypomnienia o terminach',
        ],
        architecture:
          'Angular, .NET, relacyjna baza danych oraz integracje KSeF i usług wspierających księgowość.',
        stage: 'Publicznie dostępny produkt rozwijany i utrzymywany na bieżąco.',
        tags: ['Angular', '.NET', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        screenshots: [
          {
            src: 'ksiegowa-jdg-pulpit.png',
            alt: 'Pulpit Księgowej JDG dla firmy testowej z zadaniami i zobowiązaniami',
          },
          {
            src: 'ksiegowa-jdg-faktury.png',
            alt: 'Widok faktur Księgowej JDG dla firmy testowej',
          },
        ],
        visualTitle: '',
        visualText: '',
        url: 'https://www.ksiegowajdg.pl',
      },
      {
        number: '02',
        title: 'System raportowania i edycji dokumentów technicznych',
        category: 'Anonimowa realizacja / Angular',
        description:
          'Aplikacja Angular umożliwiająca edycję raportów na interaktywnym obszarze roboczym oraz eksport do PDF i formatów graficznych.',
        role: 'Projektowanie i implementacja frontendu Angular dla złożonego procesu edycji dokumentów.',
        problem:
          'Użytkownicy potrzebowali przygotowywać i aktualizować dokumentację techniczną bez ręcznego składania raportów w osobnych narzędziach.',
        features: [
          'Interaktywny obszar roboczy',
          'Edycja raportów',
          'Eksport do PDF',
          'Eksport formatów graficznych',
        ],
        architecture: 'Angular oraz komponenty interaktywnego obszaru roboczego z mechanizmem eksportu dokumentów.',
        stage: 'Zrealizowany projekt klienta; nazwa i materiały objęte poufnością.',
        tags: ['Angular', 'TypeScript', 'PDF', 'Eksport'],
        accent: 'lime',
        screenshots: [],
        visualTitle: 'Edytor raportów',
        visualText: 'Angular / PDF / grafika',
        url: null,
      },
    ],
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
    metaTitle: '.NET and Angular Developer Krakow | Łukasz Sroka Tech',
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
    eyebrow: 'Web applications / Full-stack',
    heroTitle: 'I build software that',
    heroHighlight: 'moves your business forward.',
    heroDescription:
      "I design, build and develop web applications - from a product's first version to the expansion of existing systems.",
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
      'Python',
    ],
    projectsKicker: '02 / Work',
    projectsTitle: 'Case studies: from product to resilient systems.',
    projectsIntro: 'Selected work showing the problem, scope and solutions behind each project.',
    projectRoleLabel: 'Role and scope',
    projectProblemLabel: 'User problem',
    projectFeaturesLabel: 'Key features',
    projectArchitectureLabel: 'Architecture and technology',
    projectStageLabel: 'Current stage',
    projectLive: 'View application',
    projects: [
      {
        number: '01',
        title: 'Księgowa JDG',
        category: 'SaaS product / FinTech',
        description:
          'A web application that helps sole proprietors issue invoices, work with KSeF, register expenses and stay on top of tax deadlines.',
        role:
          'Solution author: product design, Angular frontend, .NET backend, database, external-service integrations, deployment and maintenance.',
        problem:
          'A sole proprietor needs one place to manage documents and recurring obligations instead of manually coordinating separate tools and deadlines.',
        features: [
          'KSeF and invoices',
          'Receipt-photo expenses',
          'Tax ledger and JPK_V7M',
          'VAT and ZUS settlements',
          'Deadline reminders',
        ],
        architecture:
          'Angular, .NET, a relational database, and KSeF integrations plus services that support accounting workflows.',
        stage: 'A publicly available product that is actively developed and maintained.',
        tags: ['Angular', '.NET', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        screenshots: [
          {
            src: 'ksiegowa-jdg-pulpit.png',
            alt: 'Księgowa JDG dashboard for a test company with tasks and obligations',
          },
          {
            src: 'ksiegowa-jdg-faktury.png',
            alt: 'Księgowa JDG invoice view for a test company',
          },
        ],
        visualTitle: '',
        visualText: '',
        url: 'https://www.ksiegowajdg.pl',
      },
      {
        number: '02',
        title: 'Technical reporting and document-editing system',
        category: 'Anonymous project / Angular',
        description:
          'An Angular application for editing reports in an interactive workspace and exporting them to PDF and image formats.',
        role: 'Design and implementation of an Angular frontend for a complex document-editing workflow.',
        problem:
          'Users needed to prepare and update technical documentation without assembling reports manually in separate tools.',
        features: [
          'Interactive workspace',
          'Report editing',
          'PDF export',
          'Image-format export',
        ],
        architecture: 'Angular and interactive-workspace components with a document-export mechanism.',
        stage: 'Delivered client project; the name and materials are confidential.',
        tags: ['Angular', 'TypeScript', 'PDF', 'Export'],
        accent: 'lime',
        screenshots: [],
        visualTitle: 'Report editor',
        visualText: 'Angular / PDF / images',
        url: null,
      },
    ],
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
  imports: [SpaceBackground, HelixScroll],
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

  // Stan formularza kontaktowego.
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactMessage = signal('');
  protected readonly honeypot = signal(''); // pułapka antyspamowa
  protected readonly formState = signal<FormState>('idle');
  protected readonly formErrors = signal<Partial<Record<FormField, FieldError>>>({});

  // Sygnały antybotowe: czas pierwszej interakcji z formularzem i liczba
  // zdarzeń wpisywania. Bot wypełnia pola i klika „wyślij" w ułamku sekundy,
  // człowiek potrzebuje na to co najmniej kilku sekund pisania.
  private formFirstInputAt = 0;
  private formInputEvents = 0;
  private static readonly MIN_FILL_TIME_MS = 3000;
  private static readonly MIN_INPUT_EVENTS = 6;

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

  protected onFieldInput(field: FormField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'name') this.contactName.set(value);
    else if (field === 'email') this.contactEmail.set(value);
    else this.contactMessage.set(value);

    if (this.formFirstInputAt === 0) this.formFirstInputAt = Date.now();
    this.formInputEvents++;

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

    // Warstwy antyspamowe — botowi udajemy sukces, ale niczego nie wysyłamy:
    // 1) honeypot: ukryte pole wypełniają tylko boty;
    // 2) bramka czasowa: wypełnienie i wysłanie szybciej niż w ~3 s to bot;
    // 3) realne wpisywanie: brak zdarzeń input = wartości wstrzyknięte skryptem.
    const filledTooFast =
      this.formFirstInputAt === 0 || Date.now() - this.formFirstInputAt < App.MIN_FILL_TIME_MS;
    if (
      this.honeypot().trim() !== '' ||
      filledTooFast ||
      this.formInputEvents < App.MIN_INPUT_EVENTS
    ) {
      this.formState.set('success');
      return;
    }

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
      return;
    }

    this.formState.set('sending');
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
    }
  }
}
