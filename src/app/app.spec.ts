import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createApp(): { fixture: ComponentFixture<App>; app: any } {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return { fixture, app: fixture.componentInstance as any };
  }

  function fillValidForm(app: any): void {
    app.contactName.set('Ada Lovelace');
    app.contactEmail.set('ada@example.com');
    app.contactMessage.set('Chcę porozmawiać o aplikacji.');
  }

  it('creates the application', () => {
    expect(createApp().app).toBeTruthy();
  });

  it('renders exactly two self-contained projects with stable identifiers', () => {
    const { fixture, app } = createApp();
    const projects = app.copy().projects;

    expect(projects).toHaveLength(2);
    expect(projects.map((project: { id: string }) => project.id)).toEqual([
      'ksiegowa-jdg',
      'technical-reporting-system',
    ]);
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(2);
  });

  it('only renders a live-project link when the project has a liveUrl', () => {
    const { fixture } = createApp();
    const root = fixture.nativeElement as HTMLElement;
    const cards = root.querySelectorAll<HTMLElement>('.project-card');

    expect(cards[0].querySelector<HTMLAnchorElement>('.project-card__links a')?.href).toBe(
      'https://www.ksiegowajdg.pl/',
    );
    expect(cards[1].querySelector('.project-card__links a')).toBeNull();
    expect(cards[1].querySelector('h3 a')).toBeNull();
  });

  it('contains complete primary copy in both languages', () => {
    const { app } = createApp();

    for (const language of ['pl', 'en'] as const) {
      app.setLanguage(language);
      const localized = app.copy();
      expect(localized.heroTitle).toBeTruthy();
      expect(localized.heroHighlight).toBeTruthy();
      expect(localized.heroDescription).toBeTruthy();
      expect(localized.form.submit).toBeTruthy();
      expect(localized.form.privacy).toBeTruthy();
      expect(localized.services).toHaveLength(3);
    }
  });

  it('renders a native Web3Forms POST fallback with data-processing information', () => {
    const { fixture } = createApp();
    const root = fixture.nativeElement as HTMLElement;
    const form = root.querySelector<HTMLFormElement>('.contact__form');

    expect(form?.action).toBe('https://api.web3forms.com/submit');
    expect(form?.method).toBe('post');
    expect(form?.noValidate).toBe(false);
    expect(form?.querySelector('input[name="access_key"]')).toBeTruthy();
    expect(form?.querySelector('input[name="from_name"]')).toBeTruthy();
    expect(form?.querySelector('input[name="botcheck"]')?.getAttribute('type')).toBe('checkbox');
    expect(form?.querySelector<HTMLInputElement>('input[name="name"]')?.required).toBe(true);
    expect(form?.querySelector<HTMLInputElement>('input[name="email"]')?.required).toBe(true);
    expect(form?.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.required).toBe(
      true,
    );
    expect(root.querySelector<HTMLAnchorElement>('.contact__privacy a')?.href).toBe(
      'https://web3forms.com/privacy',
    );
  });

  it('updates the document language, title and metadata when the language changes', () => {
    const { app } = createApp();
    const description = document.createElement('meta');
    description.name = 'description';
    document.head.append(description);
    const locale = document.createElement('meta');
    locale.setAttribute('property', 'og:locale');
    document.head.append(locale);
    app.setLanguage('en');

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toContain('Angular and .NET Developer');
    expect(description.getAttribute('content')).toContain('custom web applications');
    expect(locale.getAttribute('content')).toBe('en_US');
  });

  it('uses the active language path for in-page navigation', () => {
    const { fixture, app } = createApp();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector<HTMLAnchorElement>('.skip-link')?.getAttribute('href')).toBe(
      '/pl/#main-content',
    );
    expect(root.querySelector<HTMLAnchorElement>('.desktop-nav a')?.getAttribute('href')).toBe(
      '/pl/#about',
    );

    app.setLanguage('en');
    fixture.detectChanges();

    expect(root.querySelector<HTMLAnchorElement>('.skip-link')?.getAttribute('href')).toBe(
      '/en/#main-content',
    );
    expect(root.querySelector<HTMLAnchorElement>('.desktop-nav a')?.getAttribute('href')).toBe(
      '/en/#about',
    );
  });

  it('uses one class for mobile ordinal numbers', () => {
    const { fixture } = createApp();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.mobile-nav .ordinal-number')).toHaveLength(4);
    expect(root.querySelectorAll('.principle > .ordinal-number')).toHaveLength(3);
    expect(root.querySelectorAll('.project-card__number.ordinal-number')).toHaveLength(2);
    expect(root.querySelectorAll('.timeline-item__period.ordinal-number')).toHaveLength(3);
    expect(root.querySelectorAll('.process__grid .ordinal-number')).toHaveLength(3);
  });

  it('moves the active service marker as timeline items enter the mobile focus area', async () => {
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const observerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
    const mobileQuery = {
      matches: true,
      media: '(max-width: 760px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    const reducedMotionQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    let intersectionCallback!: IntersectionObserverCallback;
    let observer!: MockIntersectionObserver;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '-42% 0px -42% 0px';
      readonly thresholds = [0];
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
      readonly takeRecords = vi.fn(() => []);

      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
        observer = this;
      }
    }

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) =>
        query === '(max-width: 760px)' ? mobileQuery : reducedMotionQuery,
      ),
    });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: MockIntersectionObserver,
    });

    const { fixture } = createApp();
    try {
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const items = root.querySelectorAll<HTMLElement>('.timeline-item');
      expect(items[0].classList.contains('is-current')).toBe(true);

      const activate = (index: number) => {
        intersectionCallback(
          [
            {
              isIntersecting: true,
              target: items[index],
              boundingClientRect: { top: 300, height: 120 },
            } as unknown as IntersectionObserverEntry,
          ],
          observer,
        );
        fixture.detectChanges();

        expect(Array.from(items).filter((item) => item.classList.contains('is-current'))).toEqual([
          items[index],
        ]);
      };

      activate(1);
      activate(2);
      activate(1);
      activate(0);
    } finally {
      fixture.destroy();
      if (matchMediaDescriptor) {
        Object.defineProperty(window, 'matchMedia', matchMediaDescriptor);
      } else {
        Reflect.deleteProperty(window, 'matchMedia');
      }
      if (observerDescriptor) {
        Object.defineProperty(globalThis, 'IntersectionObserver', observerDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'IntersectionObserver');
      }
    }
  });

  it('does not send an empty form and focuses validation', async () => {
    const { app } = createApp();
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await app.submitContact(new Event('submit'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(app.formErrors()).toEqual({ name: 'required', email: 'required', message: 'required' });
    expect(app.formState()).toBe('idle');
  });

  it('reports an invalid email address without sending', async () => {
    const { app } = createApp();
    app.contactName.set('Ada');
    app.contactEmail.set('not-an-email');
    app.contactMessage.set('Wiadomość');
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await app.submitContact(new Event('submit'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(app.formErrors().email).toBe('email');
  });

  it('does not claim success before a confirmed API response', async () => {
    const { app } = createApp();
    fillValidForm(app);
    let resolveRequest!: (value: Response) => void;
    globalThis.fetch = vi.fn(
      () => new Promise<Response>((resolve) => (resolveRequest = resolve)),
    ) as typeof fetch;

    const request = app.submitContact(new Event('submit'));
    expect(app.formState()).toBe('sending');

    resolveRequest({ ok: true, json: async () => ({ success: true }) } as Response);
    await request;
    expect(app.formState()).toBe('success');
  });

  it('shows success and clears fields only after a 2xx successful response', async () => {
    const { app } = createApp();
    fillValidForm(app);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as typeof fetch;

    await app.submitContact(new Event('submit'));

    expect(app.formState()).toBe('success');
    expect(app.contactName()).toBe('');
    expect(app.contactEmail()).toBe('');
    expect(app.contactMessage()).toBe('');
  });

  it('shows an error for a rejected API response or network error', async () => {
    const { app } = createApp();
    fillValidForm(app);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    }) as typeof fetch;

    await app.submitContact(new Event('submit'));
    expect(app.formState()).toBe('error');

    app.formState.set('idle');
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network')) as typeof fetch;
    await app.submitContact(new Event('submit'));
    expect(app.formState()).toBe('error');
  });

  it('blocks duplicate submissions while a request is in progress', async () => {
    const { app } = createApp();
    fillValidForm(app);
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (resolveRequest = resolve)));
    globalThis.fetch = fetchMock as typeof fetch;

    const first = app.submitContact(new Event('submit'));
    const second = app.submitContact(new Event('submit'));
    expect(app.formState()).toBe('sending');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest({ ok: true, json: async () => ({ success: true }) } as Response);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
