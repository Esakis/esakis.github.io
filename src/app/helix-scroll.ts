import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/**
 * Karuzela-helisa 3D: sekcje krążą wokół centralnego słupa Drogi Mlecznej,
 * schodząc w dół po spirali. 6 paneli × 60° = pełny obrót 360° na stronę.
 *
 * Przewijanie jest stronicowane (snap): kółko myszy, klawiatura i dotyk
 * zawsze animują przejście do CAŁEJ następnej/poprzedniej karty — scena
 * nigdy nie zatrzymuje się między kartami. Ręczne przeciągnięcie paska
 * przewijania jest dociągane do najbliższej karty po chwili bezczynności.
 *
 * Panel na wprost jest w pełni widoczny i klikalny; poprzedni i następny
 * pozostają czytelnie widoczne po bokach słupa. Na wąskich ekranach oraz
 * przy `prefers-reduced-motion` helisa przechodzi w zwykły układ pionowy
 * (klasa `helix--flat`).
 */
@Directive({
  selector: '[appHelix]',
})
export class HelixScroll {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  // Geometria helisy.
  private readonly STEP = 60; // stopnie obrotu między panelami (6×60=360)
  private readonly DROP = 220; // zjazd w dół (px) między panelami
  private readonly TILT = 0; // pochylenie sceny (deg); 0 = karty idealnie na wprost
  private readonly SNAP_MS = 760; // czas animacji przejścia między kartami
  private readonly ZOOM_MS = 480; // czas animacji powiększania karty

  private stage?: HTMLElement;
  private panels: HTMLElement[] = [];
  private spanPx = 0;
  private radius = 1123; // promień cylindra (px), liczony z szerokości panelu
  private frameId = 0;
  private flat = false;
  private cleanupFns: Array<() => void> = [];

  // Stan stronicowania (snap).
  private index = 0;
  private animating = false;
  private animFrameId = 0;
  private cooldownUntil = 0; // wygasza bezwładność touchpada po przejściu
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private touchStartY = 0;

  // Stan powiększenia karty (klik → pełny ekran, ESC/wstecz → powrót).
  private expandedIndex: number | null = null;
  private zooming = false; // blokuje aktualizacje sceny na czas animacji
  private zoomTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender(() => this.init());
  }

  private init(): void {
    const root = this.host.nativeElement;
    this.stage = root.querySelector<HTMLElement>('.helix-stage') ?? undefined;
    this.panels = Array.from(root.querySelectorAll<HTMLElement>('.helix-panel'));
    if (!this.stage || this.panels.length === 0) return;

    this.evaluateMode();

    const onResize = () => {
      if (this.expandedIndex !== null) this.collapseNow();
      this.evaluateMode();
      this.layout();
      this.requestUpdate();
    };
    window.addEventListener('resize', onResize);
    this.cleanupFns.push(() => window.removeEventListener('resize', onResize));

    const onScroll = () => {
      this.requestUpdate();
      this.scheduleSettle();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', onScroll));

    const onWheel = (event: WheelEvent) => this.onWheel(event);
    window.addEventListener('wheel', onWheel, { passive: false });
    this.cleanupFns.push(() => window.removeEventListener('wheel', onWheel));

    const onKeyDown = (event: KeyboardEvent) => this.onKeyDown(event);
    window.addEventListener('keydown', onKeyDown);
    this.cleanupFns.push(() => window.removeEventListener('keydown', onKeyDown));

    const onTouchStart = (event: TouchEvent) => {
      this.touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (event: TouchEvent) => this.onTouchEnd(event);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    this.cleanupFns.push(() => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    });

    const onClick = (event: MouseEvent) => this.onClick(event);
    document.addEventListener('click', onClick);
    this.cleanupFns.push(() => document.removeEventListener('click', onClick));

    const onMouseMove = (event: MouseEvent) => this.updateLinkHover(event);
    document.addEventListener('mousemove', onMouseMove);
    this.cleanupFns.push(() => document.removeEventListener('mousemove', onMouseMove));

    // Strzałka wstecz przeglądarki zamyka powiększoną kartę.
    const onPopState = () => {
      if (this.expandedIndex !== null) this.collapseNow();
    };
    window.addEventListener('popstate', onPopState);
    this.cleanupFns.push(() => window.removeEventListener('popstate', onPopState));

    this.layout();
    this.index = Math.round(this.progress());
    this.update();
  }

  /** Decyduje, czy używać helisy, czy płaskiego układu awaryjnego. */
  private evaluateMode(): void {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const narrow = window.innerWidth <= 1000;
    this.flat = reduced || narrow;
    this.host.nativeElement.classList.toggle('helix--flat', this.flat);
  }

  /** Ustala statyczne pozycje paneli na cylindrze i wysokość toru scrolla. */
  private layout(): void {
    if (this.flat) {
      this.host.nativeElement.style.height = '';
      this.panels.forEach((panel) => {
        panel.style.transform = '';
        panel.style.opacity = '';
        panel.style.visibility = '';
        panel.style.pointerEvents = '';
        panel.style.zIndex = '';
      });
      if (this.stage) this.stage.style.transform = '';
      return;
    }

    this.spanPx = window.innerHeight;
    // Tor scrolla: jeden „ekran" na każdy panel (ostatni domyka pełen obrót).
    this.host.nativeElement.style.height = `${this.panels.length * this.spanPx}px`;

    // Promień taki, by sąsiednie panele się nie przecinały:
    // cięciwa 2·R·sin(STEP/2) ≥ szerokość panelu (+4% zapasu).
    const panelWidth = this.panels[0].offsetWidth || 1080;
    const halfStepRad = ((this.STEP / 2) * Math.PI) / 180;
    this.radius = Math.round((panelWidth / (2 * Math.sin(halfStepRad))) * 1.04);

    this.panels.forEach((panel, i) => {
      // Kolejność ma znaczenie: najpierw centrowanie i zjazd w układzie
      // ekranu, dopiero potem obrót i wysunięcie na promień cylindra.
      panel.style.transform =
        `translate(-50%, -50%) translateY(${i * this.DROP}px) ` +
        `rotateY(${i * this.STEP}deg) translateZ(${this.radius}px)`;
    });
  }

  /** Pozycja na helisie w jednostkach paneli (0 … liczba-1), z ograniczeniem. */
  private progress(): number {
    const top = this.host.nativeElement.offsetTop;
    const raw = (window.scrollY - top) / (this.spanPx || 1);
    return Math.max(0, Math.min(this.panels.length - 1, raw));
  }

  /** Pozycja scrolla, przy której ostatnia karta jest na wprost. */
  private lastCardScrollY(): number {
    return this.host.nativeElement.offsetTop + (this.panels.length - 1) * this.spanPx;
  }

  /** Czy scroll znajduje się poniżej ostatniej karty (strefa stopki). */
  private inFooterZone(): boolean {
    return window.scrollY > this.lastCardScrollY() + 2;
  }

  private requestUpdate(): void {
    if (this.flat) return;
    cancelAnimationFrame(this.frameId);
    this.frameId = requestAnimationFrame(() => this.update());
  }

  /** Aktualizuje obrót/zjazd sceny oraz widoczność paneli wg pozycji scrolla. */
  private update(force = false): void {
    if (this.flat || !this.stage) return;
    if ((this.zooming || this.expandedIndex !== null) && !force) return;

    const p = this.progress();

    // Scena cofnięta o promień, by aktywny panel siedział w płaszczyźnie
    // ekranu (skala 1:1); translateY kompensuje zjazd spirali oraz
    // uniesienie panelu wynikające z pochylenia rotateX.
    const tiltRad = (this.TILT * Math.PI) / 180;
    const dy = -p * this.DROP + this.radius * Math.sin(tiltRad);
    this.stage.style.transform =
      `translateZ(${-this.radius}px) rotateX(${this.TILT}deg) ` +
      `translateY(${dy}px) rotateY(${-p * this.STEP}deg)`;

    // Tylko karta na wprost pozostaje widoczna, aby tekst kart na helisie
    // nie nakładał się optycznie na sąsiednie, obrócone panele.
    this.panels.forEach((panel, i) => {
      const active = i === Math.round(p);
      panel.style.opacity = active ? '1' : '0';
      panel.style.visibility = active ? 'visible' : 'hidden';
      panel.style.pointerEvents = active ? 'auto' : 'none';
      panel.style.zIndex = active ? '2' : '1';
    });
  }

  // --- Stronicowanie: karty przechodzą zawsze w całości -------------------

  /** Przejście o jedną kartę w zadanym kierunku (±1). */
  private stepBy(direction: number): void {
    const next = Math.max(0, Math.min(this.panels.length - 1, this.index + direction));
    if (next !== this.index) this.animateToIndex(next);
  }

  private onWheel(event: WheelEvent): void {
    if (this.flat) return;
    if (this.expandedIndex !== null) {
      const panel = this.panels[this.expandedIndex];
      if (panel) panel.scrollTop += event.deltaY;
      event.preventDefault();
      return;
    }
    if (this.zooming) {
      event.preventDefault();
      return;
    }
    const direction = Math.sign(event.deltaY);
    if (!direction) return;

    // Przewijanie wewnątrz pola tekstowego z własnym scrollem obsługujemy
    // natywnie — nie przełączamy wtedy kart helisy.
    const textarea = (event.target as HTMLElement | null)?.closest('textarea');
    if (textarea && textarea.scrollHeight > textarea.clientHeight) {
      const atTop = textarea.scrollTop <= 0;
      const atBottom = textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight - 1;
      if ((direction < 0 && !atTop) || (direction > 0 && !atBottom)) return;
    }

    // Rozbudowane case studies mają własny scroll wewnątrz karty helisy.
    // Dopóki zawartość nie dotrze do krawędzi, kółko nie przełącza sekcji.
    const scrollPanel = (event.target as HTMLElement | null)?.closest<HTMLElement>('.helix-panel');
    if (scrollPanel && scrollPanel.scrollHeight > scrollPanel.clientHeight) {
      const atTop = scrollPanel.scrollTop <= 0;
      const atBottom =
        scrollPanel.scrollTop + scrollPanel.clientHeight >= scrollPanel.scrollHeight - 1;
      if ((direction < 0 && !atTop) || (direction > 0 && !atBottom)) return;
    }

    if (this.inFooterZone()) {
      // W strefie stopki: w dół natywnie, w górę wracamy na ostatnią kartę.
      if (direction < 0) {
        event.preventDefault();
        if (!this.animating) this.animateToIndex(this.panels.length - 1);
      }
      return;
    }

    // Na ostatniej karcie scroll w dół odsłania stopkę natywnie.
    if (direction > 0 && !this.animating && this.index >= this.panels.length - 1) {
      return;
    }

    event.preventDefault();
    if (this.animating || performance.now() < this.cooldownUntil) return;
    this.stepBy(direction);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.flat) return;
    const target = event.target as HTMLElement | null;
    if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;

    // ESC zamyka powiększoną kartę (przez historię — spójnie z „wstecz").
    if (this.expandedIndex !== null || this.zooming) {
      if (event.key === 'Escape' && this.expandedIndex !== null) {
        event.preventDefault();
        history.back();
      }
      return;
    }

    const downKeys = ['ArrowDown', 'PageDown'];
    const upKeys = ['ArrowUp', 'PageUp'];
    const isDown = downKeys.includes(event.key) || (event.key === ' ' && !event.shiftKey);
    const isUp = upKeys.includes(event.key) || (event.key === ' ' && event.shiftKey);
    if (!isDown && !isUp) return;

    if (this.inFooterZone()) {
      if (isUp) {
        event.preventDefault();
        if (!this.animating) this.animateToIndex(this.panels.length - 1);
      }
      return;
    }

    if (isDown && this.index >= this.panels.length - 1) return;

    event.preventDefault();
    if (this.animating) return;
    this.stepBy(isDown ? 1 : -1);
  }

  private onTouchEnd(event: TouchEvent): void {
    if (this.flat || this.animating) return;
    if (this.expandedIndex !== null || this.zooming) return;
    const endY = event.changedTouches[0]?.clientY ?? this.touchStartY;
    const delta = this.touchStartY - endY; // >0 = przesunięcie w górę = dalej
    if (Math.abs(delta) < 60) return;
    if (this.inFooterZone()) {
      if (delta < 0) this.animateToIndex(this.panels.length - 1);
      return;
    }
    this.stepBy(Math.sign(delta));
  }

  /** Po ręcznym scrollu (pasek przewijania) dociąga do najbliższej karty. */
  private scheduleSettle(): void {
    if (this.flat || this.animating) return;
    if (this.expandedIndex !== null || this.zooming) return;
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (this.animating || this.inFooterZone()) return;
      const p = this.progress();
      const nearest = Math.round(p);
      if (Math.abs(p - nearest) > 0.01) {
        this.animateToIndex(nearest);
      } else {
        this.index = nearest;
      }
    }, 160);
  }

  /** Animuje scroll do karty o zadanym indeksie (easing, bez zatrzymań). */
  private animateToIndex(index: number): void {
    const startY = window.scrollY;
    const targetY = this.host.nativeElement.offsetTop + index * this.spanPx;
    if (Math.abs(targetY - startY) < 1) {
      this.index = index;
      return;
    }

    this.animating = true;
    cancelAnimationFrame(this.animFrameId);
    const start = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / this.SNAP_MS);
      const y = startY + (targetY - startY) * easeInOutCubic(t);
      window.scrollTo({ top: y, behavior: 'instant' });
      if (t < 1) {
        this.animFrameId = requestAnimationFrame(frame);
      } else {
        this.index = index;
        this.animating = false;
        this.cooldownUntil = performance.now() + 350;
      }
    };
    this.animFrameId = requestAnimationFrame(frame);
  }

  /** Obsługa kliknięć: linki kotwiczące oraz powiększanie aktywnej karty. */
  private onClick(event: MouseEvent): void {
    if (this.flat) return;
    const target = event.target as HTMLElement | null;

    // Linki kotwiczące (#id) → animacja do właściwego panelu.
    const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (anchor) {
      const id = anchor.getAttribute('href')?.slice(1) ?? '';
      if (!id || id === 'main-content') return;
      const index = this.panels.findIndex((panel) => panel.id === id);
      if (index < 0) return;
      event.preventDefault();
      if (this.expandedIndex !== null) {
        // Najpierw zamknij powiększenie; nawigacja przy kolejnym kliknięciu.
        history.back();
        return;
      }
      this.animateToIndex(index);
      return;
    }

    // Pola formularza i etykiety obsługujemy natywnie — kliknięcie w nie
    // ma ustawiać kursor/fokus, a nie powiększać ani zwijać karty.
    if (target?.closest('input, textarea, select, label')) return;

    // Przekształcenia 3D mogą kierować kliknięcie w viewport zamiast w konkretny
    // element karty. Odtwarzamy trafienie na podstawie pozycji kursora: linki
    // i przyciski klikamy, a pola formularza tylko fokusujemy — nigdy nie
    // powiększamy wtedy karty.
    const activeIndex = Math.round(this.progress());
    const activePanel = this.panels[activeIndex];
    if (activePanel && !target?.closest('a, button, input, textarea, select, label')) {
      const hit = Array.from(
        activePanel.querySelectorAll<HTMLElement>('a, button, input, textarea, select'),
      ).find((item) => {
        const bounds = item.getBoundingClientRect();
        return (
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        );
      });
      if (hit) {
        if (
          hit instanceof HTMLInputElement ||
          hit instanceof HTMLTextAreaElement ||
          hit instanceof HTMLSelectElement
        ) {
          hit.focus();
        } else {
          hit.click(); // link lub przycisk (np. wyślij formularz)
        }
        return;
      }
    }

    if (target?.closest('a, button, input, textarea, select, label')) return;

    // Klik w powiększoną kartę → powrót (przez historię, spójnie z ESC).
    if (this.expandedIndex !== null) {
      const bounds = activePanel?.getBoundingClientRect();
      if (
        bounds &&
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      ) {
        history.back();
      }
      return;
    }

    // Klik w aktywną kartę → powiększenie na cały ekran.
    if (this.zooming || this.animating) return;
    const bounds = activePanel?.getBoundingClientRect();
    if (
      bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    ) {
      this.expand(activeIndex);
    }
  }

  private updateLinkHover(event: MouseEvent): void {
    if (this.flat) return;

    const activePanel = this.panels[Math.round(this.progress())];
    for (const panel of this.panels) {
      for (const link of panel.querySelectorAll<HTMLAnchorElement>('a.is-hovered')) {
        link.classList.remove('is-hovered');
      }
    }
    if (!activePanel) return;

    for (const link of activePanel.querySelectorAll<HTMLAnchorElement>('a')) {
      const bounds = link.getBoundingClientRect();
      const isHovered =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      link.classList.toggle('is-hovered', isHovered);
    }
  }

  /**
   * Powiększa kartę do rozmiaru okna z zachowaniem proporcji (scale).
   * Scena przechodzi do neutralnej pozy (bez pochyłu), pozostałe karty gasną.
   */
  private expand(index: number): void {
    const panel = this.panels[index];
    this.expandedIndex = index;
    this.zooming = true;
    clearTimeout(this.zoomTimer);
    this.host.nativeElement.classList.add('helix--zoom');

    // Karta mieści się w obszarze POD górnym paskiem, z małym odstępem
    // od paska u góry i symetrycznym marginesem u dołu.
    const headerHeight = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 80;
    const gap = 24;
    const scale = Math.min(
      (window.innerWidth * 0.88) / panel.offsetWidth,
      (window.innerHeight - headerHeight - gap * 2) / panel.offsetHeight,
    );

    if (this.stage) {
      // Zsunięcie sceny o pół wysokości paska centruje kartę w obszarze
      // poniżej paska — odstęp od niego jest wtedy zawsze ≥ gap.
      this.stage.style.transform =
        `translateZ(${-this.radius}px) ` +
        `translateY(${headerHeight / 2 - index * this.DROP}px) ` +
        `rotateY(${-index * this.STEP}deg)`;
    }
    panel.style.transform =
      `translate(-50%, -50%) translateY(${index * this.DROP}px) ` +
      `rotateY(${index * this.STEP}deg) translateZ(${this.radius}px) ` +
      `scale(${scale})`;
    panel.classList.add('helix-panel--expanded');
    this.panels.forEach((other, i) => {
      if (i !== index) other.style.opacity = '0.12';
    });

    history.pushState({ helixZoom: true }, '');
    this.zoomTimer = setTimeout(() => (this.zooming = false), this.ZOOM_MS);
  }

  /** Przywraca kartę na słup (wywoływane z popstate — ESC/wstecz). */
  private collapseNow(): void {
    if (this.expandedIndex === null) return;
    const panel = this.panels[this.expandedIndex];
    panel.classList.remove('helix-panel--expanded');
    this.expandedIndex = null;
    this.zooming = true;
    clearTimeout(this.zoomTimer);

    // Klasa .helix--zoom zostaje na czas animacji powrotu (przejścia CSS).
    this.layout();
    this.update(true);
    this.zoomTimer = setTimeout(() => {
      this.zooming = false;
      this.host.nativeElement.classList.remove('helix--zoom');
      this.requestUpdate();
    }, this.ZOOM_MS);
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frameId);
      cancelAnimationFrame(this.animFrameId);
    }
    clearTimeout(this.settleTimer);
    clearTimeout(this.zoomTimer);
    this.cleanupFns.forEach((fn) => fn());
  }
}
