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
  projects: [
    {
      liveUrl: 'https://www.ksiegowajdg.pl',
    },
  ],
} as const;

const CONTENT = {
  pl: {
    metaTitle: 'Łukasz Sroka Tech | Aplikacje webowe',
    skipLink: 'Przejdź do treści',
    nav: [
      { label: 'O firmie', id: 'about' },
      { label: 'Realizacje', id: 'projects' },
      { label: 'Usługi', id: 'experience' },
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
      { value: 'Full-stack', label: 'aplikacje webowe' },
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
      '.NET Core',
      'C#',
      'TypeScript',
      'JavaScript',
      'React',
      'Node.js',
      'Python',
      'PostgreSQL',
      'MSSQL',
      'Entity Framework',
      'Docker',
      'Azure',
      'Git',
    ],
    projectsKicker: '02 / Realizacje',
    projectsTitle: 'Produkt gotowy do codziennej pracy.',
    projectsIntro: 'Wybrana aplikacja dostępna publicznie.',
    projectLive: 'Otwórz aplikację',
    projects: [
      {
        number: '01',
        title: 'Księgowa JDG',
        category: 'FinTech / Aplikacja webowa',
        description:
          'Księgowość online dla jednoosobowej działalności: faktury z KSeF, koszty ze zdjęcia paragonu, KPiR, JPK_V7M, VAT, ZUS i przypomnienia o terminach.',
        result: 'KSeF · KPiR · JPK_V7M',
        tags: ['Angular', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        visual: 'dashboard',
      },
    ],
    experienceKicker: '03 / Usługi',
    experienceTitle: 'Od koncepcji do sprawnie działającego produktu.',
    experience: [
      {
        period: '01',
        role: 'Aplikacje webowe',
        company: 'Nowe produkty',
        description:
          'Budowa aplikacji od pierwszego pomysłu po gotowe wdrożenie - z frontendem, backendem i bazą danych.',
        highlights: ['Angular', 'React', 'Node.js'],
      },
      {
        period: '02',
        role: 'Rozwój systemów',
        company: 'Istniejące aplikacje',
        description:
          'Rozbudowa funkcji, migracje i optymalizacja aplikacji, aby lepiej odpowiadały na aktualne potrzeby biznesu.',
        highlights: ['.NET Core', 'Entity Framework', 'SQL'],
      },
      {
        period: '03',
        role: 'Wsparcie techniczne',
        company: 'Stabilne rozwiązania',
        description:
          'Diagnozowanie problemów, praca z bazami danych i wsparcie techniczne dla działających produktów.',
        highlights: ['Docker', 'Azure', 'PostgreSQL'],
      },
    ],
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
    metaTitle: 'Łukasz Sroka Tech | Web applications',
    skipLink: 'Skip to content',
    nav: [
      { label: 'About', id: 'about' },
      { label: 'Work', id: 'projects' },
      { label: 'Services', id: 'experience' },
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
      { value: 'Full-stack', label: 'web applications' },
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
      '.NET Core',
      'C#',
      'TypeScript',
      'JavaScript',
      'React',
      'Node.js',
      'Python',
      'PostgreSQL',
      'MSSQL',
      'Entity Framework',
      'Docker',
      'Azure',
      'Git',
    ],
    projectsKicker: '02 / Work',
    projectsTitle: 'A product ready for everyday use.',
    projectsIntro: 'A selected application available to the public.',
    projectLive: 'Open application',
    projects: [
      {
        number: '01',
        title: 'Księgowa JDG',
        category: 'FinTech / Web application',
        description:
          'Online accounting for sole proprietors: KSeF invoices, receipt photo expenses, tax ledger, JPK_V7M, VAT, ZUS and deadline reminders.',
        result: 'KSeF · Tax ledger · JPK_V7M',
        tags: ['Angular', 'KSeF', 'JPK_V7M'],
        accent: 'cyan',
        visual: 'dashboard',
      },
    ],
    experienceKicker: '03 / Services',
    experienceTitle: 'From concept to a product that runs smoothly.',
    experience: [
      {
        period: '01',
        role: 'Web applications',
        company: 'New products',
        description:
          'Building applications from the initial idea to a production-ready release - with frontend, backend and database included.',
        highlights: ['Angular', 'React', 'Node.js'],
      },
      {
        period: '02',
        role: 'System development',
        company: 'Existing applications',
        description:
          'Extending features, migrating and optimizing applications to meet current business needs.',
        highlights: ['.NET Core', 'Entity Framework', 'SQL'],
      },
      {
        period: '03',
        role: 'Technical support',
        company: 'Reliable solutions',
        description:
          'Diagnosing issues, working with databases and providing technical support for live products.',
        highlights: ['Docker', 'Azure', 'PostgreSQL'],
      },
    ],
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
