import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject, PLATFORM_ID } from '@angular/core';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+<>';
const DURATION = 720;

/**
 * Efekt „dekodowania" tekstu, gdy jego karta helisy staje się aktywna:
 * znaki przewijają się losowo i układają od lewej w docelowy napis.
 * Tekst zaczynający się od liczby (np. „5+") zamiast tego odlicza się od zera.
 *
 * Animowany napis jest rysowany w nakładce `::after` z atrybutu
 * `data-scramble` (motion.scss) — węzeł tekstowy, którym zarządza Angular,
 * zostaje nietknięty, więc przełączanie języka działa normalnie.
 */
@Directive({
  selector: '[appScramble]',
})
export class ScrambleText {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private frameId = 0;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const panel = this.host.nativeElement.closest('.helix-panel');
      if (!panel || typeof MutationObserver === 'undefined') return;

      let wasActive = panel.classList.contains('is-active');
      if (wasActive) this.play();
      const observer = new MutationObserver(() => {
        const active = panel.classList.contains('is-active');
        if (active && !wasActive) this.play();
        wasActive = active;
      });
      observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(this.frameId);
      });
    });
  }

  private play(): void {
    const element = this.host.nativeElement;
    const target = element.textContent?.trim() ?? '';
    if (!target) return;
    cancelAnimationFrame(this.frameId);
    const numeric = /^(\d+)(.*)$/.exec(target);
    const start = performance.now();
    element.classList.add('is-scrambling');

    const frame = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      element.dataset['scramble'] = numeric
        ? `${Math.round(Number(numeric[1]) * easeOut(progress))}${numeric[2]}`
        : scramble(target, progress);
      if (progress < 1) {
        this.frameId = requestAnimationFrame(frame);
      } else {
        element.classList.remove('is-scrambling');
        delete element.dataset['scramble'];
      }
    };
    this.frameId = requestAnimationFrame(frame);
  }
}

/** Litery „układają się" od lewej; reszta to losowe znaki (spacje zostają). */
function scramble(target: string, progress: number): string {
  const settled = Math.floor(target.length * progress);
  return Array.from(target, (char, index) =>
    index < settled || char === ' ' ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
  ).join('');
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
