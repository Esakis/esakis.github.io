import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { shouldSkipPlanetModels } from '../effects-policy';

/**
 * Pełnoekranowe tło WebGL: realna panorama Drogi Mlecznej jako skybox,
 * centralny słup galaktyczny zbudowany z dziesiątek tysięcy świecących
 * cząstek (złoty rdzeń, różowo-fioletowe ramiona, fioletowo-niebieskie
 * obrzeża, ciemne pasma pyłu) oraz realistyczne, oświetlone planety z teksturami
 * Solar System Scope (CC BY 4.0).
 *
 * Niebo i słup obracają się o pełne 360° wraz z przewijaniem strony.
 * Renderer żyje poza wykrywaniem zmian Angulara (pętla rAF), pomija modele
 * planet przy ograniczonych efektach i zwalnia zasoby GPU przy zniszczeniu.
 */
@Component({
  selector: 'app-space-background',
  template: '<canvas #canvas class="space-canvas" aria-hidden="true"></canvas>',
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      display: block;
      pointer-events: none;
    }

    .space-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class SpaceBackground {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private frameId = 0;
  private disposables: Array<{ dispose: () => void }> = [];
  private cleanupFns: Array<() => void> = [];

  private skybox?: THREE.Mesh;
  private foreground?: THREE.Points;
  private pillar?: THREE.Group;
  private planets?: THREE.Group;
  private planetMeshes: Array<{ mesh: THREE.Object3D; speed: number }> = [];

  // Docelowe i wygładzone wartości parallaxu / scrolla.
  private pointerTarget = new THREE.Vector2(0, 0);
  private pointer = new THREE.Vector2(0, 0);
  private scrollTarget = 0;
  private scroll = 0;
  private elapsed = 0;
  private isDocumentVisible = true;
  private destroyed = false;
  private resizeFrameId = 0;

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) this.init();
    });
  }

  private init(): void {
    const canvas = this.canvasRef().nativeElement;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const skipPlanets = shouldSkipPlanetModels();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x03040c, 1);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 2000);
    camera.position.set(0, 0, 0.1);
    this.camera = camera;

    scene.add(this.buildSkybox());
    scene.add(this.buildPillar());
    if (!skipPlanets) scene.add(this.buildPlanets());
    scene.add(this.buildForegroundStars());
    this.addLights(scene);

    this.resize();
    this.bindEvents(reducedMotion);

    if (reducedMotion) {
      this.renderFrame();
    } else {
      this.loop();
    }
  }

  /**
   * Najjaśniejsze gwiazdy nieba: [RA°, Dec°, magnitudo] (J2000).
   * Kompletne charakterystyczne asteryzmy: Orion (z pasem), Wielki Wóz,
   * Kasjopeja (W), Krzyż Południa, Łabędź, część Skorpiona i Bliźniąt.
   */
  private static readonly BRIGHT_STARS: ReadonlyArray<[number, number, number]> = [
    [101.29, -16.72, -1.46],
    [95.99, -52.7, -0.74],
    [219.9, -60.83, -0.27],
    [213.92, 19.18, -0.05],
    [279.23, 38.78, 0.03],
    [79.17, 46.0, 0.08],
    [78.63, -8.2, 0.13],
    [114.83, 5.22, 0.34],
    [24.43, -57.24, 0.46],
    [88.79, 7.41, 0.5],
    [210.96, -60.37, 0.61],
    [297.7, 8.87, 0.77],
    [186.65, -63.1, 0.76],
    [68.98, 16.51, 0.85],
    [247.35, -26.43, 0.96],
    [201.3, -11.16, 0.97],
    [116.33, 28.03, 1.14],
    [344.41, -29.62, 1.16],
    [310.36, 45.28, 1.25],
    [191.93, -59.69, 1.25],
    [152.09, 11.97, 1.35],
    [104.66, -28.97, 1.5],
    [113.65, 31.89, 1.62],
    [187.79, -57.11, 1.64],
    [263.4, -37.1, 1.63],
    [81.28, 6.35, 1.64],
    [81.57, 28.61, 1.65],
    [138.3, -69.72, 1.69],
    [84.05, -1.2, 1.69],
    [332.06, -46.96, 1.74],
    [85.19, -1.94, 1.77],
    [193.51, 55.96, 1.77],
    [165.93, 61.75, 1.79],
    [51.08, 49.86, 1.8],
    [107.1, -26.39, 1.84],
    [264.33, -43.0, 1.87],
    [276.04, -34.38, 1.85],
    [125.63, -59.51, 1.86],
    [206.89, 49.31, 1.86],
    [89.88, 44.95, 1.9],
    [252.17, -69.03, 1.91],
    [99.43, 16.4, 1.92],
    [306.41, -56.74, 1.94],
    [37.95, 89.26, 1.98],
    [95.68, -17.96, 1.98],
    [141.9, -8.66, 1.98],
    [31.79, 23.46, 2.0],
    [10.9, -17.99, 2.02],
    [200.98, 54.93, 2.04],
    [283.82, -26.3, 2.06],
    [211.67, -36.37, 2.06],
    [17.43, 35.62, 2.05],
    [2.1, 29.09, 2.06],
    [263.73, 12.56, 2.07],
    [222.68, 74.16, 2.08],
    [86.94, -9.67, 2.09],
    [177.26, 14.57, 2.11],
    [47.04, 40.96, 2.12],
    [340.67, -46.88, 2.11],
    [190.38, -48.96, 2.17],
    [139.27, -59.28, 2.21],
    [137.0, -43.43, 2.21],
    [233.67, 26.71, 2.23],
    [305.56, 40.26, 2.23],
    [10.13, 56.54, 2.24],
    [269.15, 51.49, 2.23],
    [83.0, -0.3, 2.23],
    [2.29, 59.15, 2.27],
    [120.9, -40.0, 2.25],
    [111.02, -29.3, 2.45],
    [14.18, 60.72, 2.47],
    [165.46, 56.38, 2.37],
    [178.46, 53.69, 2.44],
    [326.05, 9.87, 2.39],
    [6.57, -42.31, 2.38],
    [221.25, 27.07, 2.37],
    [21.45, 60.24, 2.68],
    [28.6, 63.67, 3.38],
    [183.86, 57.03, 3.31],
    [292.68, 27.96, 3.18],
    [311.55, 33.97, 2.46],
    [296.24, 45.13, 2.87],
  ];

  /** Kula z realną panoramą Drogi Mlecznej, oglądana od wewnątrz. */
  private buildSkybox(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(600, 60, 40);
    const loader = new THREE.TextureLoader();
    const texture = loader.load('textures/milky_way.jpg', () => this.renderFrame());
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      // Skybox to tło: nie zapisuje głębi i rysuje się pierwszy, żeby nie
      // zasłaniał obiektów poza promieniem kuli (np. planet przy krawędzi).
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1;
    // Lekkie przyciemnienie, by treść na pierwszym planie była czytelna.
    material.color.setScalar(0.85);
    // Katalog jasnych gwiazd jako dziecko skyboxa — obraca się razem
    // z panoramą, więc pozostaje zsynchronizowany z realnym niebem.
    mesh.add(this.buildCatalogStars(570));
    this.skybox = mesh;
    this.disposables.push(geometry, material, texture);
    return mesh;
  }

  /**
   * Jasne gwiazdy katalogowe na sferze nieba, we współrzędnych galaktycznych
   * dopasowanych do panoramy (centrum Galaktyki w środku tekstury).
   * Dzięki temu na niebie da się odnaleźć prawdziwe gwiazdozbiory.
   */
  private buildCatalogStars(radius: number): THREE.Group {
    const group = new THREE.Group();
    const sprite = this.createStarSprite();
    this.disposables.push(sprite);

    // Kubełki wielkości gwiazdowych → rozmiar punktu.
    const bins = [
      { max: 0.2, size: 12, positions: [] as number[] },
      { max: 1.2, size: 9, positions: [] as number[] },
      { max: 2.1, size: 7, positions: [] as number[] },
      { max: 99, size: 5.2, positions: [] as number[] },
    ];

    for (const [ra, dec, mag] of SpaceBackground.BRIGHT_STARS) {
      const { l, b } = this.equatorialToGalactic(ra, dec);
      // Mapowanie zgodne z UV SphereGeometry: centrum Galaktyki (l=0)
      // w środku tekstury (u=0.5), długość galaktyczna rośnie w lewo.
      const u = 0.5 - l / 360;
      const v = 0.5 - b / 180;
      const phi = u * Math.PI * 2;
      const theta = v * Math.PI;
      const x = -Math.cos(phi) * Math.sin(theta) * radius;
      const y = Math.cos(theta) * radius;
      const z = Math.sin(phi) * Math.sin(theta) * radius;
      const bin = bins.find((candidate) => mag <= candidate.max)!;
      bin.positions.push(x, y, z);
    }

    for (const bin of bins) {
      if (bin.positions.length === 0) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(bin.positions), 3),
      );
      const material = new THREE.PointsMaterial({
        size: bin.size,
        map: sprite,
        color: 0xeef2ff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      group.add(new THREE.Points(geometry, material));
      this.disposables.push(geometry, material);
    }

    return group;
  }

  /** Konwersja współrzędnych równikowych (J2000) na galaktyczne (stopnie). */
  private equatorialToGalactic(raDeg: number, decDeg: number): { l: number; b: number } {
    const rad = Math.PI / 180;
    const ra = raDeg * rad;
    const dec = decDeg * rad;
    const raNgp = 192.85948 * rad; // RA bieguna galaktycznego
    const decNgp = 27.12825 * rad; // Dec bieguna galaktycznego
    const lNcp = 122.93192 * rad; // długość galaktyczna bieguna niebieskiego

    const sinB =
      Math.sin(dec) * Math.sin(decNgp) + Math.cos(dec) * Math.cos(decNgp) * Math.cos(ra - raNgp);
    const b = Math.asin(sinB);
    const l =
      lNcp -
      Math.atan2(
        Math.cos(dec) * Math.sin(ra - raNgp),
        Math.sin(dec) * Math.cos(decNgp) - Math.cos(dec) * Math.sin(decNgp) * Math.cos(ra - raNgp),
      );
    const lDeg = (((l / rad) % 360) + 360) % 360;
    return { l: lDeg, b: b / rad };
  }

  /** Oświetlenie sceny — kluczowe dla plastyczności (3D) planet. */
  private addLights(scene: THREE.Scene): void {
    // Niski ambient + mocne światło kierunkowe = wyraźny terminator
    // dnia i nocy na kulach planet.
    const ambient = new THREE.AmbientLight(0x2a3050, 0.35);
    const key = new THREE.DirectionalLight(0xfff1da, 3.4);
    key.position.set(-420, 260, 520);
    const fill = new THREE.DirectionalLight(0x5566aa, 0.35);
    fill.position.set(400, -150, -300);
    scene.add(ambient, key, fill);
  }

  /**
   * Centralny słup galaktyczny z cząstek: trzy helikalne ramiona wokół osi,
   * gęsty złoty rdzeń przechodzący w różowo-fioletowe ramiona i
   * fioletowo-niebieskie obrzeża, poprzecinany ciemnymi pasmami pyłu —
   * wzorowany na zdjęciach jądra Drogi Mlecznej.
   */
  private buildPillar(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 0, -300);
    // Wyraźny skos — słup przecina ekran ukośnie, nie idealnie pionowo.
    group.rotation.z = 0.18;
    group.rotation.x = 0.04;
    this.pillar = group;

    const sprite = this.createStarSprite();
    this.disposables.push(sprite);

    // Gęste chmury jasnych cząstek o różnych rozmiarach punktów.
    const clouds = [
      { count: 34000, size: 2.2 },
      { count: 20000, size: 4.2 },
      { count: 7500, size: 7.0 },
    ];
    for (const cloud of clouds) {
      group.add(this.createGalaxyCloud(cloud.count, cloud.size, sprite));
    }

    // Ciemne pasma pyłu (mieszanie zwykłe, nie addytywne) — kontrastowe
    // przerwy w świetle, jak na fotografiach jądra galaktyki.
    group.add(this.createDustCloud(6000, sprite));

    // Łuna: trzy warstwy dużych, miękkich sprite'ów — ciepła złota przy osi,
    // fioletowa w środkowym pasie oraz czerwono-karmazynowa, najszersza.
    const glowLayers = [
      { color: 0xffd9a0, opacity: 0.06, spread: 240, scale: 400, count: 26 },
      { color: 0xb06bff, opacity: 0.055, spread: 360, scale: 520, count: 26 },
      { color: 0xff4a3c, opacity: 0.04, spread: 470, scale: 600, count: 22 },
    ];
    for (const layer of glowLayers) {
      const glowMaterial = new THREE.SpriteMaterial({
        map: sprite,
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.disposables.push(glowMaterial);
      for (let i = 0; i < layer.count; i++) {
        const glow = new THREE.Sprite(glowMaterial);
        glow.position.set(
          (Math.random() - 0.5) * layer.spread,
          -1000 + (i / layer.count) * 2000 + (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * layer.spread,
        );
        glow.scale.setScalar(layer.scale * (0.7 + Math.random() * 0.7));
        group.add(glow);
      }
    }

    return group;
  }

  /** Chmura świecących cząstek rozmieszczonych w helikalnych ramionach. */
  private createGalaxyCloud(count: number, size: number, sprite: THREE.Texture): THREE.Points {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const core = new THREE.Color(0xfff4de);
    const coreEdge = new THREE.Color(0xffb36b);
    const armRed = new THREE.Color(0xff5040);
    const armCrimson = new THREE.Color(0xff3d6e);
    const armViolet = new THREE.Color(0xa96eff);
    const outer = new THREE.Color(0x7b64ff);
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const [x, y, z, radial] = this.sampleHelix(1000, 520, 1.7);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Kolor zależny od odległości od osi + losowa jasność:
      // złoty rdzeń → czerwień/karmazyn → szeroki pas fioletu → obrzeża.
      if (radial < 50) {
        tmp.lerpColors(core, coreEdge, radial / 50);
      } else if (radial < 115) {
        tmp.lerpColors(armRed, armCrimson, (radial - 50) / 65);
      } else if (radial < 280) {
        tmp.lerpColors(armCrimson, armViolet, (radial - 115) / 165);
      } else {
        tmp.lerpColors(armViolet, outer, Math.min(1, (radial - 280) / 180));
      }
      const luminance = 0.7 + Math.random() * 0.45;
      colors[i * 3] = tmp.r * luminance;
      colors[i * 3 + 1] = tmp.g * luminance;
      colors[i * 3 + 2] = tmp.b * luminance;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.disposables.push(geometry, material);
    return new THREE.Points(geometry, material);
  }

  /** Ciemny pył przesłaniający światło — zwykłe mieszanie kolorów. */
  private createDustCloud(count: number, sprite: THREE.Texture): THREE.Points {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const [x, y, z] = this.sampleHelix(1000, 360, 1.3, 30);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 9,
      map: sprite,
      color: 0x1a0f0a,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = 2;
    this.disposables.push(geometry, material);
    return points;
  }

  /**
   * Losowa pozycja w kolumnie z trzema helikalnymi ramionami.
   * Zwraca [x, y, z, odległość-od-osi].
   */
  private sampleHelix(
    halfHeight: number,
    maxRadial: number,
    density: number,
    minRadial = 3,
  ): [number, number, number, number] {
    const y = (Math.random() * 2 - 1) * halfHeight;
    const arm = Math.floor(Math.random() * 3);
    // Silna nieregularność: szerokość kolumny mocno faluje wzdłuż wysokości
    // (zgrubienia i przewężenia o różnych częstotliwościach), oś kolumny
    // wije się na boki, a spora część cząstek trafia do odstających kęp.
    const bulge =
      1 +
      0.7 * Math.sin(y * 0.0021 + arm * 1.9) +
      0.45 * Math.sin(y * 0.0057 + 1.3) +
      0.3 * Math.sin(y * 0.011 + arm * 0.7);
    let radial = Math.pow(Math.random(), density) * maxRadial * Math.max(0.25, bulge) + minRadial;
    if (Math.random() < 0.25) {
      radial *= 1.4 + Math.random() * 1.3; // odstające kępy
    }
    // Rozrzut ~gaussowski rosnący z odległością od osi.
    const spread = (Math.random() + Math.random() + Math.random() - 1.5) * (0.5 + radial * 0.004);
    // Skręt ramion różny dla każdego ramienia — mniej symetryczna spirala.
    const twist = 0.0042 + arm * 0.0009;
    const angle = y * twist + (arm * Math.PI * 2) / 3 + spread;
    // Wicie się osi: kolumna mocno faluje na boki wzdłuż wysokości.
    const wobbleX = 55 * Math.sin(y * 0.0016 + 0.8) + 20 * Math.sin(y * 0.0041);
    const wobbleZ = 45 * Math.sin(y * 0.0023 + 2.1) + 16 * Math.sin(y * 0.0035);
    return [Math.cos(angle) * radial + wobbleX, y, Math.sin(angle) * radial + wobbleZ, radial];
  }

  /**
   * Prawdziwe modele 3D planet z NASA (GLB, domena publiczna) —
   * Jowisz i Saturn z pierścieniami. Każdy model jest
   * normalizowany do zadanego promienia i oświetlany światłami sceny.
   */
  private buildPlanets(): THREE.Group {
    const group = new THREE.Group();
    this.planets = group;
    const loader = new GLTFLoader();

    const defs = [
      {
        file: 'planets/jupiter.glb',
        radius: 105,
        pos: [355, 185, -430],
        speed: 0.05,
        tilt: 0.06,
        tiltX: 0,
      },
      // Saturn pochylony też wokół osi X, by pierścienie odchyliły się ku
      // kamerze i były widoczne (samo pochylenie po Z daje widok krawędziowy).
      // Uwaga: planety muszą mieścić się w kuli skyboxa (promień 600 od
      // origin) albo skybox musi mieć depthWrite=false — inaczej jego
      // tekstura zasłania wszystko poza kulą.
      {
        file: 'planets/saturn.glb',
        radius: 115,
        pos: [-395, -165, -430],
        speed: 0.06,
        tilt: 0.2,
        tiltX: 0.6,
      },
    ] as const;

    for (const def of defs) {
      loader.load(def.file, (gltf) => {
        const model = gltf.scene;

        // Normalizacja: wyśrodkuj model i przeskaluj do zadanego promienia.
        const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
        const scale = def.radius / sphere.radius;
        model.scale.setScalar(scale);
        model.position.copy(sphere.center).multiplyScalar(-scale);

        // Zarejestruj zasoby GPU modelu do zwolnienia przy zniszczeniu.
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            this.disposables.push(node.geometry);
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of materials) {
              this.disposables.push(material);
              const map = (material as THREE.MeshStandardMaterial).map;
              if (map) this.disposables.push(map);
            }
          }
        });

        // Rotacja dobowa na osobnej grupie, wewnątrz której model jest już
        // wycentrowany — obrót odbywa się wokół środka planety. Obracanie
        // samego modelu kręciłoby nim wokół origin pliku GLB, który bywa
        // przesunięty (planeta „krążyłaby" zamiast wirować w miejscu).
        const spinner = new THREE.Group();
        spinner.add(model);

        const pivot = new THREE.Group();
        pivot.position.set(def.pos[0], def.pos[1], def.pos[2]);
        pivot.rotation.z = def.tilt;
        pivot.rotation.x = def.tiltX;
        pivot.add(spinner);
        group.add(pivot);
        this.planetMeshes.push({ mesh: spinner, speed: def.speed });
        this.renderFrame();
      });
    }

    return group;
  }

  /** Sferyczna powłoka gwiazd pierwszego planu (parallax) — celowo rzadka,
   *  by nie zagłuszać prawdziwych gwiazdozbiorów z katalogu. */
  private buildForegroundStars(): THREE.Points {
    const count = 750;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(0xbcd0ff),
      new THREE.Color(0xffffff),
      new THREE.Color(0xffd9a8),
      new THREE.Color(0x9fe8ff),
    ];

    for (let i = 0; i < count; i++) {
      // Rozkład na powłoce kulistej wokół kamery.
      const radius = 120 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sprite = this.createStarSprite();
    const material = new THREE.PointsMaterial({
      size: 2.6,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.foreground = points;
    this.disposables.push(geometry, material, sprite);
    return points;
  }

  /** Okrągła tekstura gwiazdy z miękką poświatą (radial gradient). */
  private createStarSprite(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.55, 'rgba(180,205,255,0.35)');
    gradient.addColorStop(1, 'rgba(180,205,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private bindEvents(reducedMotion: boolean): void {
    const onResize = () => {
      cancelAnimationFrame(this.resizeFrameId);
      this.resizeFrameId = requestAnimationFrame(() => {
        this.resize();
        if (reducedMotion || this.isDocumentVisible) this.renderFrame();
      });
    };
    window.addEventListener('resize', onResize);
    this.cleanupFns.push(() => window.removeEventListener('resize', onResize));

    const onVisibilityChange = () => {
      this.isDocumentVisible = !document.hidden;
      if (!this.isDocumentVisible) {
        cancelAnimationFrame(this.frameId);
        return;
      }
      if (reducedMotion) this.renderFrame();
      else this.loop();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this.cleanupFns.push(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange),
    );

    if (reducedMotion) return;

    const onPointerMove = (event: PointerEvent) => {
      this.pointerTarget.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('pointermove', onPointerMove));

    const onScroll = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      this.scrollTarget = window.scrollY / max;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', onScroll));
    onScroll();
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const width = this.host.nativeElement.clientWidth || window.innerWidth;
    const height = this.host.nativeElement.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (this.destroyed || !this.isDocumentVisible) return;
    this.frameId = requestAnimationFrame(this.loop);
    this.elapsed += 0.0016;

    this.pointer.lerp(this.pointerTarget, 0.045);
    this.scroll += (this.scrollTarget - this.scroll) * 0.06;

    if (this.skybox) {
      // Pełny obrót 360° na całej długości strony + pochylenie w dół.
      this.skybox.rotation.y = this.elapsed * 0.01 + this.scroll * Math.PI * 2;
      this.skybox.rotation.x = this.scroll * 0.2 + this.pointer.y * 0.05;
    }

    if (this.foreground) {
      this.foreground.rotation.y =
        this.elapsed * 0.02 + this.scroll * Math.PI * 2.4 + this.pointer.x * 0.2;
      this.foreground.rotation.x = this.scroll * 0.7 - this.pointer.y * 0.15;
    }

    if (this.pillar) {
      // Słup wiruje powoli i kręci się wraz z przejściami między kartami;
      // schodzimy wzdłuż niego w dół podczas przewijania.
      this.pillar.rotation.y = this.elapsed * 0.1 + this.scroll * Math.PI * 2;
      this.pillar.position.y = this.scroll * 320;
      this.pillar.position.x = this.pointer.x * 6;
    }

    if (this.planets) {
      this.planets.position.x = this.pointer.x * -12;
      this.planets.position.y = this.pointer.y * 8 + this.scroll * 100;
    }
    for (const planet of this.planetMeshes) {
      planet.mesh.rotation.y = this.elapsed * planet.speed * 60;
    }

    this.renderFrame();
  };

  private renderFrame(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    cancelAnimationFrame(this.resizeFrameId);
    this.cleanupFns.forEach((fn) => fn());
    this.disposables.forEach((item) => item.dispose());
    this.renderer?.renderLists.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
    this.scene?.clear();
    this.planetMeshes = [];
  }
}
