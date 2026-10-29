import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';

/** Podpisy pierścienia kursora w języku strony. */
export interface CursorLabels {
  readonly open: string;
  readonly write: string;
  readonly scroll: string;
}

/** Elementy, nad którymi pierścień kursora się powiększa. */
const INTERACTIVE = 'a, button, input, textarea, select, label';
/** Przyciski przyciągane do kursora (efekt magnetyczny). */
const MAGNETIC = '.button, .contact__button';
/** Promień (px) poza przyciskiem, w którym zaczyna działać przyciąganie. */
const MAGNET_RADIUS = 28;
/** Maksymalne przechylenie karty projektu (°). */
const TILT = 5;

/**
 * Mikrointerakcje kursora: pierścień podążający z płynnym opóźnieniem i z
 * podpisem zależnym od miejsca („Otwórz" nad projektem, „Napisz" nad polem
 * formularza, „Przewiń" w hero), magnetyczne przyciski oraz przechylanie kart
 * projektów w 3D z odblaskiem i paralaksą ramki laptopa.
 *
 * Trafienia liczone są geometrycznie (getBoundingClientRect), a nie przez
 * `event.target`: w helisie 3D zdarzenia trafiają w viewport zamiast w
 * elementy karty (tak samo działa obsługa linków w HelixScroll).
 * Wyłączone na ekranach dotykowych i przy `prefers-reduced-motion`.
 */
@Directive({
  selector: '[appPointerEffects]',
})
export class PointerEffects {
  readonly cursorLabels = input<CursorLabels>({ open: '', write: '', scroll: '' });

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private pointerX = -100;
  private pointerY = -100;
  private ringX = -100;
  private ringY = -100;
  private lastTime = 0;
  private lastMove = 0;
  private frameId = 0;
  private magnet?: HTMLElement;
  private tilted?: HTMLElement;
  private lastScope?: HTMLElement;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (coarse || reduced) return;
      this.init();
    });
  }

  private init(): void {
    const ring = this.host.nativeElement;
    // Ukryty do pierwszego ruchu myszy — inaczej stałby w lewym górnym rogu.
    ring.classList.add('is-enabled', 'is-idle');

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      if (!this.lastMove) {
        // Pierwszy ruch: pierścień startuje od razu przy kursorze.
        this.ringX = this.pointerX;
        this.ringY = this.pointerY;
      }
      this.lastMove = performance.now();
    };
    const onLeave = () => ring.classList.add('is-idle');
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    this.frameId = requestAnimationFrame(this.frame);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.frameId);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      this.releaseMagnet();
      this.releaseTilt();
    });
  }

  private frame = (now: number): void => {
    this.frameId = requestAnimationFrame(this.frame);
    const dt = Math.min(Math.max(now - (this.lastTime || now), 0), 100) / 1000;
    this.lastTime = now;
    if (!this.lastMove) return;

    // Pierścień dogania kursor z opóźnieniem niezależnym od liczby klatek.
    const follow = 1 - Math.exp(-dt * 16);
    this.ringX += (this.pointerX - this.ringX) * follow;
    this.ringY += (this.pointerY - this.ringY) * follow;
    const ring = this.host.nativeElement;
    ring.style.transform = `translate3d(${this.ringX.toFixed(1)}px, ${this.ringY.toFixed(1)}px, 0)`;

    // Trafienia liczymy, gdy kursor się rusza albo zmieniła się aktywna karta
    // (przewijanie kółkiem bez ruchu myszy) — w spoczynku pętla jest prawie darmowa.
    const scope = document.querySelector<HTMLElement>('.helix-panel.is-active') ?? document.body;
    if (now - this.lastMove > 120 && scope === this.lastScope) return;
    this.lastScope = scope;
    if (now - this.lastMove <= 120) ring.classList.remove('is-idle');
    const overHeader = this.hit(document.querySelectorAll(`.site-header :is(${INTERACTIVE})`), 0);
    const interactive = overHeader ?? this.hit(scope.querySelectorAll(INTERACTIVE), 0);
    const card = this.hit(scope.querySelectorAll('.project-card'), 0);
    this.updateMagnet(this.hit(scope.querySelectorAll(MAGNETIC), MAGNET_RADIUS));
    this.updateTilt(card);
    this.updateLabel(interactive, card, scope);
  };

  /** Podpis w pierścieniu: kontekst ważniejszy niż samo powiększenie nad linkiem. */
  private updateLabel(
    interactive: HTMLElement | undefined,
    card: HTMLElement | undefined,
    scope: HTMLElement,
  ): void {
    const labels = this.cursorLabels();
    let label = '';
    if (interactive?.matches('input, textarea')) label = labels.write;
    else if (card && !interactive) label = labels.open;
    else if (!interactive && scope.classList.contains('hero')) label = labels.scroll;

    const ring = this.host.nativeElement;
    const text = ring.querySelector<HTMLElement>('.cursor-ring__label');
    if (text && label) text.textContent = label;
    ring.classList.toggle('is-label', label !== '');
    ring.classList.toggle('is-hover', label === '' && interactive !== undefined);
  }

  /** Pierwszy element, którego prostokąt (powiększony o `padding`) zawiera kursor. */
  private hit(elements: NodeListOf<HTMLElement>, padding: number): HTMLElement | undefined {
    for (const element of Array.from(elements)) {
      const bounds = element.getBoundingClientRect();
      if (
        this.pointerX >= bounds.left - padding &&
        this.pointerX <= bounds.right + padding &&
        this.pointerY >= bounds.top - padding &&
        this.pointerY <= bounds.bottom + padding
      ) {
        return element;
      }
    }
    return undefined;
  }

  private updateMagnet(target: HTMLElement | undefined): void {
    if (target !== this.magnet) this.releaseMagnet();
    this.magnet = target;
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const dx = (this.pointerX - (bounds.left + bounds.width / 2)) * 0.28;
    const dy = (this.pointerY - (bounds.top + bounds.height / 2)) * 0.38;
    target.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }

  private releaseMagnet(): void {
    if (this.magnet) this.magnet.style.translate = '';
    this.magnet = undefined;
  }

  private updateTilt(target: HTMLElement | undefined): void {
    if (target !== this.tilted) this.releaseTilt();
    this.tilted = target;
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const x = (this.pointerX - bounds.left) / bounds.width;
    const y = (this.pointerY - bounds.top) / bounds.height;
    target.style.setProperty('--tilt-x', `${((0.5 - y) * TILT).toFixed(2)}deg`);
    target.style.setProperty('--tilt-y', `${((x - 0.5) * TILT).toFixed(2)}deg`);
    target.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
    target.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
    target.style.setProperty('--glare', '0.07');
    // Paralaksa ramki laptopa ze zrzutem (motion.scss).
    target.style.setProperty('--px', (x - 0.5).toFixed(3));
    target.style.setProperty('--py', (y - 0.5).toFixed(3));
  }

  private releaseTilt(): void {
    if (!this.tilted) return;
    for (const name of ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y', '--glare', '--px', '--py']) {
      this.tilted.style.removeProperty(name);
    }
    this.tilted = undefined;
  }
}
