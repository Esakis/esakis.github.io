import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HelixScroll } from './helix-scroll';
import { WebglAvailability } from './webgl-availability';

@Component({
  imports: [HelixScroll],
  template: `
    <main class="helix" appHelix>
      <a href="/pl/#projects">Projects</a>
      <div class="helix-viewport">
        <div class="helix-stage">
          <section id="top" class="helix-panel">Top</section>
          <section id="projects" class="helix-panel">Projects</section>
          <section id="services" class="helix-panel">Services</section>
          <section id="contact" class="helix-panel">Contact</section>
        </div>
      </div>
    </main>
  `,
})
class HelixHost {}

describe('HelixScroll', () => {
  let availability: WebglAvailability;
  let scrollToMock: ReturnType<typeof vi.fn>;
  let originalScrollTo: typeof window.scrollTo;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;
  let innerWidthDescriptor: PropertyDescriptor | undefined;
  let innerHeightDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    innerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    innerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    originalScrollTo = window.scrollTo;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    scrollToMock = vi.fn();
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    window.requestAnimationFrame = (callback) => {
      callback(performance.now() + 1_000);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();
    history.replaceState(null, '', '/pl/');

    await TestBed.configureTestingModule({
      imports: [HelixHost],
    }).compileComponents();
    availability = TestBed.inject(WebglAvailability);
    availability.setAvailable(false);
  });

  afterEach(() => {
    history.replaceState(null, '', '/');
    window.scrollTo = originalScrollTo;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    if (innerWidthDescriptor) Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
    if (innerHeightDescriptor) Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
  });

  async function createHost(): Promise<{ fixture: ComponentFixture<HelixHost>; root: HTMLElement }> {
    const fixture = TestBed.createComponent(HelixHost);
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.helix')!;
    Object.defineProperty(root, 'offsetTop', { configurable: true, value: 100 });
    await fixture.whenStable();
    return { fixture, root };
  }

  it('keeps every panel in the normal document until WebGL is available', async () => {
    const { fixture, root } = await createHost();

    expect(root.classList.contains('helix--enabled')).toBe(false);
    for (const panel of root.querySelectorAll<HTMLElement>('.helix-panel')) {
      expect(panel.style.opacity).toBe('');
      expect(panel.style.visibility).toBe('');
    }

    fixture.destroy();
  });

  it('uses full local URLs with hashes for helix navigation', async () => {
    availability.setAvailable(true);
    const { fixture, root } = await createHost();
    const link = root.querySelector<HTMLAnchorElement>('a[href="/pl/#projects"]')!;

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(link.dispatchEvent(event)).toBe(false);
    expect(window.location.hash).toBe('#projects');

    fixture.destroy();
  });

  it('opens the section from the initial hash after enabling WebGL', async () => {
    history.replaceState(null, '', '/pl/#projects');
    availability.setAvailable(true);
    const { fixture } = await createHost();

    expect(scrollToMock).toHaveBeenCalledWith({ top: window.innerHeight, behavior: 'instant' });

    fixture.destroy();
  });
});
