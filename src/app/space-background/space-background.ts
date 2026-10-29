import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
  viewChildren,
} from '@angular/core';
import * as THREE from 'three';
import { EffectsProfile, getEffectsProfile } from '../effects-policy';
import { WebglAvailability } from '../webgl-availability';
import { CLUSTERS, SystemGraph } from './system-graph';

interface SceneQuality {
  powerPreference: 'high-performance' | 'low-power';
  /** Wygładzanie krawędzi cienkich linii przepływów. */
  antialias: boolean;
  pixelRatio: number;
  animate: boolean;
  pointerParallax: boolean;
}

const SCENE_QUALITY: Record<EffectsProfile, SceneQuality> = {
  full: {
    powerPreference: 'high-performance',
    antialias: true,
    pixelRatio: 1.5,
    animate: true,
    pointerParallax: true,
  },
  compact: {
    powerPreference: 'low-power',
    antialias: false,
    pixelRatio: 1.5,
    animate: true,
    pointerParallax: false,
  },
  static: {
    powerPreference: 'low-power',
    antialias: false,
    pixelRatio: 1,
    animate: false,
    pointerParallax: false,
  },
};

/** Kolejne stopnie obniżania gęstości pikseli, gdy GPU nie nadąża. */
const PIXEL_RATIO_STEPS = [1.5, 1.25, 1, 0.75];
const CAMERA_FOV = 40;

/**
 * Przystanki kamery — po jednym na kartę helisy. `focus` to punkt, na który
 * patrzy kamera, `offset` jej położenie względem niego, `margin` przesunięcie
 * punktu w kadrze (1 = środek lewego marginesu obok karty, wartości ujemne =
 * w prawo, 0 = środek), `emphasis` jasność
 * kolejnych klastrów (aplikacja webowa, API, baza danych, kolejka, integracje,
 * chmura), a `trace` trasa i opis impulsu „żywego zapytania" na tym przystanku.
 */
const STOPS: ReadonlyArray<{
  focus: THREE.Vector3;
  offset: THREE.Vector3;
  margin: number;
  emphasis: readonly number[];
  trace: { route: readonly number[]; label: string };
}> = [
  // Hero: system widziany z lewej, wzdłuż osi — klastry układają się w głąb
  // po prawej stronie kadru, a tekst po lewej ma czyste tło.
  {
    focus: new THREE.Vector3(30, 0, -25),
    offset: new THREE.Vector3(-150, 45, 75),
    margin: -0.45,
    emphasis: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    trace: { route: [0, 1, 2, 1, 0], label: 'GET /api/products · 41 ms' },
  },
  {
    focus: CLUSTERS[0],
    offset: new THREE.Vector3(-30, 32, 80),
    margin: 1,
    emphasis: [1, 0.35, 0.18, 0.18, 0.18, 0.25],
    trace: { route: [0, 1, 0], label: 'GET /api/dashboard · 23 ms' },
  },
  {
    focus: CLUSTERS[1],
    offset: new THREE.Vector3(14, 30, 78),
    margin: 1,
    emphasis: [0.35, 1, 0.35, 0.35, 0.3, 0.3],
    trace: { route: [0, 1, 2, 1, 0], label: 'POST /api/invoices · 38 ms' },
  },
  {
    focus: CLUSTERS[2],
    offset: new THREE.Vector3(36, 26, 80),
    margin: 1,
    emphasis: [0.18, 0.4, 1, 0.22, 0.18, 0.4],
    trace: { route: [1, 2, 1], label: 'SQL · 3 rows · 6 ms' },
  },
  // Integracje (w marginesie) wraz z kolejką zdarzeń, z której czerpią.
  {
    focus: CLUSTERS[4],
    offset: new THREE.Vector3(24, 30, 90),
    margin: 1,
    emphasis: [0.18, 0.4, 0.18, 1, 1, 0.22],
    trace: { route: [1, 3, 4], label: 'event · invoice.created → KSeF' },
  },
  // Kontakt: oddalenie — cały system rozświetlony (lekko przygaszony, bo za formularzem).
  {
    focus: new THREE.Vector3(18, -4, -30),
    offset: new THREE.Vector3(-45, 58, 138),
    margin: 0,
    emphasis: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
    trace: { route: [0, 1, 3, 4], label: 'POST /api/contact · 54 ms' },
  },
];

/** Czas uruchamiania systemu przy wejściu na stronę (s). */
const BOOT_SECONDS = 3;
/** Co ile sekund powtarzać impuls zapytania, gdy użytkownik stoi na karcie. */
const TRACE_INTERVAL = 5.5;

/**
 * Pełnoekranowe tło WebGL — żywa architektura systemu sterowana scrollem:
 * klastry usług połączone łukami przepływów, po których płyną pakiety danych.
 * Każda karta helisy przybliża kamerę do kolejnej warstwy, która się
 * rozświetla i dostaje etykietę; przy kontakcie cały system świeci.
 *
 * Płynność ma pierwszeństwo przed szczegółami: animacja zależy od czasu
 * (nie od liczby klatek), scena renderuje się w rytmie odświeżania ekranu,
 * shadery kompilują się asynchronicznie, a gdy GPU nie nadąża, spada gęstość
 * pikseli, nie liczba klatek. Scena nie pobiera tekstur ani modeli.
 */
@Component({
  selector: 'app-space-background',
  template: `
    <canvas #canvas class="space-canvas" aria-hidden="true"></canvas>
    @for (label of nodeLabels(); track $index) {
      <span #nodeLabel class="node-label" aria-hidden="true">{{ label }}</span>
    }
    <span #traceLabel class="trace-label" aria-hidden="true"></span>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      display: block;
      overflow: hidden;
      pointer-events: none;
    }

    .space-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .node-label {
      position: absolute;
      top: 0;
      left: 0;
      color: #cfdcf2;
      font-family: var(--font-mono);
      font-size: 0.68rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: 0;
      will-change: transform, opacity;
    }

    /* Opis impulsu zapytania — jak wpis w narzędziu do śledzenia żądań. */
    .trace-label {
      position: absolute;
      top: 0;
      left: 0;
      padding: 0.3rem 0.55rem;
      border: 1px solid rgba(233, 246, 255, 0.22);
      border-radius: 6px;
      background: rgba(4, 6, 13, 0.72);
      color: #e9f6ff;
      font-family: var(--font-mono);
      font-size: 0.66rem;
      letter-spacing: 0.04em;
      white-space: nowrap;
      opacity: 0;
      will-change: transform, opacity;
    }
  `,
})
export class SpaceBackground {
  /** Nazwy klastrów w języku strony (kolejność jak w CLUSTERS). */
  readonly nodeLabels = input<readonly string[]>([]);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelRefs = viewChildren<ElementRef<HTMLElement>>('nodeLabel');
  private readonly traceLabelRef = viewChild.required<ElementRef<HTMLElement>>('traceLabel');
  private traceStop = -1;
  private lastTraceTime = -Infinity;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly webglAvailability = inject(WebglAvailability);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private graph?: SystemGraph;
  private cameraPath?: THREE.CatmullRomCurve3;
  private focusPath?: THREE.CatmullRomCurve3;
  private readonly focus = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly emphasis = CLUSTERS.map(() => 0.6);
  private frameId = 0;
  private disposables: Array<{ dispose: () => void }> = [];
  private cleanupFns: Array<() => void> = [];

  // Docelowe i wygładzone wartości parallaxu / postępu podróży (w kartach).
  private pointerTarget = new THREE.Vector2(0, 0);
  private pointer = new THREE.Vector2(0, 0);
  private stopTarget = 0;
  private stop = 0;
  private stopCount = STOPS.length;
  private helixActive = false;
  private elapsed = 0;
  private lastFrameTime = 0;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private isDocumentVisible = true;
  private destroyed = false;
  private webglUnavailable = false;
  // Prawda po skompilowaniu shaderów; wcześniej render wymusiłby kompilację synchroniczną.
  private ready = false;
  private resizeFrameId = 0;
  private quality = SCENE_QUALITY.full;

  // Regulator jakości: odstępy klatek z ostatnich sekund.
  private frameIntervals: number[] = [];
  private framesToSkip = 20;
  private pixelRatioStep = 0;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) this.init();
    });
  }

  private init(): void {
    const canvas = this.canvasRef().nativeElement;
    this.quality = SCENE_QUALITY[getEffectsProfile()];
    // Start od stopnia równego faktycznej gęstości ekranu — przy DPR 1 stopnie
    // 1,5 i 1,25 nic by nie zmieniały i regulator reagowałby z opóźnieniem.
    const startRatio = Math.min(window.devicePixelRatio, this.quality.pixelRatio);
    this.pixelRatioStep = PIXEL_RATIO_STEPS.findIndex((ratio) => ratio <= startRatio);
    if (this.pixelRatioStep < 0) this.pixelRatioStep = PIXEL_RATIO_STEPS.length - 1;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: this.quality.antialias,
        alpha: false,
        powerPreference: this.quality.powerPreference,
      });
      renderer.setClearColor(0x04060d, 1);
      this.renderer = renderer;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 2000);
      this.graph = new SystemGraph();
      this.disposables.push(this.graph);
      this.scene.add(this.graph.object);

      this.cameraPath = new THREE.CatmullRomCurve3(
        STOPS.map((stop) => stop.focus.clone().add(stop.offset)),
        false,
        'centripetal',
      );
      this.focusPath = new THREE.CatmullRomCurve3(
        STOPS.map((stop) => stop.focus.clone()),
        false,
        'centripetal',
      );

      this.resize();
      this.bindEvents();
      this.stop = this.stopTarget;
      // Shadery kompilowane asynchronicznie (równolegle, poza głównym wątkiem,
      // jeśli przeglądarka to wspiera) — strona nie zamarza przy starcie.
      renderer
        .compileAsync(this.scene, this.camera)
        .then(() => this.start())
        .catch(() => this.disableWebgl());
    } catch {
      this.disableWebgl();
    }
  }

  /** Pierwsza klatka i pętla animacji — dopiero po skompilowaniu shaderów. */
  private start(): void {
    if (this.destroyed || this.webglUnavailable) return;
    this.ready = true;
    this.updateScene();
    this.renderFrame();
    this.webglAvailability.setAvailable(true);
    if (this.quality.animate) this.loop();
  }

  private bindEvents(): void {
    const canvas = this.canvasRef().nativeElement;
    const onContextLost = () => this.disableWebgl(true);
    canvas.addEventListener('webglcontextlost', onContextLost);
    this.cleanupFns.push(() => canvas.removeEventListener('webglcontextlost', onContextLost));

    const onResize = () => {
      cancelAnimationFrame(this.resizeFrameId);
      this.resizeFrameId = requestAnimationFrame(() => {
        this.resize();
        if (!this.quality.animate || this.isDocumentVisible) {
          this.updateScene();
          this.renderFrame();
        }
      });
    };
    window.addEventListener('resize', onResize);
    this.cleanupFns.push(() => window.removeEventListener('resize', onResize));

    const onVisibilityChange = () => {
      this.isDocumentVisible = !document.hidden;
      // Przed końcem kompilacji pętlę uruchomi `start()` — tu nie dublujemy jej.
      if (!this.ready) return;
      if (!this.isDocumentVisible) {
        cancelAnimationFrame(this.frameId);
        return;
      }
      if (this.quality.animate) {
        // Po powrocie do karty pierwsze klatki są nierówne — nie oceniamy ich.
        this.lastFrameTime = 0;
        this.frameIntervals = [];
        this.framesToSkip = 30;
        this.loop();
      } else {
        this.renderFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this.cleanupFns.push(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange),
    );

    if (!this.quality.animate) return;

    if (this.quality.pointerParallax) {
      const onPointerMove = (event: PointerEvent) => {
        this.pointerTarget.set(
          (event.clientX / window.innerWidth - 0.5) * 2,
          (event.clientY / window.innerHeight - 0.5) * 2,
        );
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      this.cleanupFns.push(() => window.removeEventListener('pointermove', onPointerMove));
    }

    const onScroll = () => {
      this.stopTarget = this.readJourneyStop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', onScroll));
    onScroll();
  }

  /**
   * Pozycja w podróży w jednostkach kart (0 … liczba kart − 1). Przy aktywnej
   * helisie każda karta to jeden ekran scrolla, więc przystanki wypadają
   * dokładnie na kartach; w układzie płaskim — proporcjonalnie do strony.
   */
  private readJourneyStop(): number {
    const helix = document.querySelector<HTMLElement>('.helix--enabled');
    this.helixActive = helix !== null;
    if (helix) {
      this.stopCount = Math.max(helix.querySelectorAll('.helix-panel').length, 2);
      const raw = (window.scrollY - helix.offsetTop) / window.innerHeight;
      return THREE.MathUtils.clamp(raw, 0, this.stopCount - 1);
    }
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    return THREE.MathUtils.clamp(window.scrollY / max, 0, 1) * (this.stopCount - 1);
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const width = this.host.nativeElement.clientWidth || window.innerWidth;
    const height = this.host.nativeElement.clientHeight || window.innerHeight;
    const pixelRatio = PIXEL_RATIO_STEPS[this.pixelRatioStep];
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.graph?.setPixelRatio(pixelRatio);
    this.graph?.setViewport(height, CAMERA_FOV);
  }

  private loop = (now = performance.now()): void => {
    if (this.destroyed || this.webglUnavailable || !this.isDocumentVisible) return;
    this.frameId = requestAnimationFrame(this.loop);

    // Krok czasu zamiast stałego kroku na klatkę: ten sam ruch przy 60, 144
    // i 170 Hz. Pierwsze wywołanie dostaje performance.now(), kolejne znacznik
    // rAF, który bywa odrobinę wcześniejszy — stąd dolne ograniczenie do zera.
    const interval = Math.max(this.lastFrameTime ? now - this.lastFrameTime : 1000 / 60, 0);
    this.lastFrameTime = now;
    const dt = Math.min(interval, 100) / 1000;
    this.elapsed += dt;
    this.governQuality(interval);

    // Wygładzanie niezależne od liczby klatek (zanik wykładniczy).
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 3));
    this.stop += (this.stopTarget - this.stop) * (1 - Math.exp(-dt * 6));

    this.updateScene();
    this.renderFrame();
  };

  /**
   * Gdy klatki regularnie trwają dłużej niż odświeżanie ekranu (GPU nie
   * nadąża), obniża gęstość pikseli o jeden stopień. Płynność ruchu
   * zostaje, traci tylko ostrość.
   */
  private governQuality(interval: number): void {
    if (this.framesToSkip > 0) {
      this.framesToSkip--;
      return;
    }
    if (this.pixelRatioStep >= PIXEL_RATIO_STEPS.length - 1) return;
    this.frameIntervals.push(interval);
    // ~40 klatek: na słabym GPU (20 FPS) decyzja zapada po ~2 s, nie po kilku.
    if (this.frameIntervals.length < 40) return;

    const sorted = [...this.frameIntervals].sort((a, b) => a - b);
    this.frameIntervals = [];
    const refresh = sorted[Math.floor(sorted.length * 0.1)];
    const typical = sorted[Math.floor(sorted.length * 0.5)];
    // Próg: gubienie odświeżeń ekranu, ale nie ostrzej niż ~75 FPS — na
    // monitorach 144–170 Hz klatka co drugie odświeżenie jest nadal płynna.
    if (typical > Math.max(refresh * 1.35, 13.4)) {
      this.pixelRatioStep++;
      this.resize();
      this.framesToSkip = 10;
    }
  }

  private updateScene(): void {
    if (!this.graph || !this.camera || !this.cameraPath || !this.focusPath) return;
    const t = THREE.MathUtils.clamp(this.stop / Math.max(this.stopCount - 1, 1), 0, 1);
    this.cameraPath.getPoint(t, this.camera.position);
    this.focusPath.getPoint(t, this.focus);

    // Jasność warstw: płynne przejście między sąsiednimi przystankami.
    const index = Math.min(Math.floor(this.stop), STOPS.length - 1);
    const next = Math.min(index + 1, STOPS.length - 1);
    const blend = THREE.MathUtils.smoothstep(this.stop - index, 0, 1);
    for (let i = 0; i < this.emphasis.length; i++) {
      this.emphasis[i] = THREE.MathUtils.lerp(STOPS[index].emphasis[i], STOPS[next].emphasis[i], blend);
    }
    // Uruchomienie systemu przy wejściu na stronę; bez animacji — od razu gotowy.
    const boot = this.quality.animate ? THREE.MathUtils.clamp(this.elapsed / BOOT_SECONDS, 0, 1) : 1;
    this.graph.update(this.elapsed, boot, this.emphasis);
    if (boot >= 1 && this.quality.animate) this.scheduleTrace();

    // Paralaksa kursora i bardzo powolny dryf — scena nigdy nie jest martwa.
    this.camera.position.x += this.pointer.x * 6 + Math.sin(this.elapsed * 0.15) * 3;
    this.camera.position.y -= this.pointer.y * 4;
    this.camera.lookAt(this.focus);

    // Helisa włącza się dopiero po starcie WebGL (bez zdarzenia scroll),
    // więc jej stan sprawdzamy w każdej klatce, nie tylko przy przewijaniu.
    this.helixActive = document.querySelector('.helix--enabled') !== null;

    // Aktywna warstwa trafia do wolnego marginesu obok karty helisy:
    // przesuwamy cel kamery w prawo, więc punkt skupienia ląduje po lewej
    // (ujemny margines — odwrotnie, punkt ląduje po prawej).
    const margin = this.helixActive
      ? THREE.MathUtils.lerp(STOPS[index].margin, STOPS[next].margin, blend)
      : 0;
    if (margin !== 0) {
      // Kąt, pod którym punkt trafia w środek marginesu: tan θ = m · tan(½ FOV poziomego).
      const cardFraction = Math.min(this.viewportWidth * 0.96, 1080) / this.viewportWidth;
      const marginCenter = (1 + cardFraction) / 2;
      const tanHalfWidth = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * this.camera.aspect;
      const angle = Math.atan(marginCenter * tanHalfWidth) * margin;
      // Obrót kierunku patrzenia w prawo wokół pionu — punkt skupienia ląduje po lewej.
      const direction = this.focus.clone().sub(this.camera.position).applyAxisAngle(this.camera.up, -angle);
      this.camera.lookAt(this.camera.position.clone().add(direction));
    }
    this.camera.updateMatrixWorld();
    // Przy helisie etykieta tylko dla warstwy w marginesie — za kartą zaśmiecałaby treść.
    this.updateLabels(this.helixActive ? Math.max(margin, 0) : 1);
    this.updateTraceLabel();
  }

  /**
   * Impuls zapytania: od razu po dojściu do karty, potem co kilka sekund —
   * w systemie zawsze „coś się dzieje".
   */
  private scheduleTrace(): void {
    const nearest = Math.round(this.stop);
    if (Math.abs(this.stop - nearest) > 0.08) return;
    const stop = STOPS[Math.min(nearest, STOPS.length - 1)];
    if (nearest === this.traceStop && this.elapsed - this.lastTraceTime < TRACE_INTERVAL) return;
    this.traceStop = nearest;
    this.lastTraceTime = this.elapsed;
    this.graph?.startTrace(stop.trace.route, this.elapsed);
    this.traceLabelRef().nativeElement.textContent = stop.trace.label;
  }

  /** Etykieta impulsu podąża za jego głową. */
  private updateTraceLabel(): void {
    if (!this.graph || !this.camera) return;
    const { position, visibility } = this.graph.trace();
    const element = this.traceLabelRef().nativeElement;
    this.projected.copy(position).project(this.camera);
    const x = (this.projected.x * 0.5 + 0.5) * this.viewportWidth;
    const y = (-this.projected.y * 0.5 + 0.5) * this.viewportHeight;
    element.style.transform = `translate3d(${(x + 14).toFixed(1)}px, ${(y - 30).toFixed(1)}px, 0)`;
    element.style.opacity = (this.projected.z < 1 ? visibility : 0).toFixed(3);
  }

  /** Etykiety warstw w HTML nad canvasem — przy aktywnych klastrach. */
  private updateLabels(visibility: number): void {
    if (!this.camera) return;
    this.labelRefs().forEach((ref, index) => {
      const element = ref.nativeElement;
      const cluster = CLUSTERS[index];
      if (!cluster) return;
      this.projected.copy(cluster).project(this.camera!);
      const visible = this.projected.z < 1;
      const x = (this.projected.x * 0.5 + 0.5) * this.viewportWidth;
      const y = (-this.projected.y * 0.5 + 0.5) * this.viewportHeight;
      const opacity = visible
        ? THREE.MathUtils.smoothstep(this.emphasis[index], 0.55, 0.95) * visibility
        : 0;
      // Odsunięcie w prawo poza pierścień rdzenia usługi.
      element.style.transform = `translate3d(${(x + 30).toFixed(1)}px, ${(y - 7).toFixed(1)}px, 0)`;
      element.style.opacity = opacity.toFixed(3);
    });
  }

  private renderFrame(): void {
    if (!this.ready || !this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  /** Stops WebGL work and leaves the CSS background as the static fallback. */
  private disableWebgl(contextAlreadyLost = false): void {
    if (this.webglUnavailable) return;
    this.webglUnavailable = true;
    this.webglAvailability.setAvailable(false);
    this.releaseWebgl(!contextAlreadyLost);
  }

  private releaseWebgl(forceContextLoss: boolean): void {
    cancelAnimationFrame(this.frameId);
    cancelAnimationFrame(this.resizeFrameId);
    this.cleanupFns.splice(0).forEach((fn) => fn());
    this.disposables.splice(0).forEach((item) => item.dispose());
    this.renderer?.renderLists.dispose();
    if (forceContextLoss) this.renderer?.forceContextLoss();
    this.renderer?.dispose();
    this.scene?.clear();
    this.renderer = undefined;
    this.scene = undefined;
    this.camera = undefined;
    this.graph = undefined;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.webglAvailability.setAvailable(false);
    this.releaseWebgl(true);
  }
}
