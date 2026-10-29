import * as THREE from 'three';

/**
 * Klastry systemu (kolejność = etykiety w treściach): aplikacja webowa, API,
 * baza danych, kolejka zdarzeń, integracje, chmura.
 */
export const CLUSTERS: ReadonlyArray<THREE.Vector3> = [
  new THREE.Vector3(-70, 18, 10),
  new THREE.Vector3(0, 0, -10),
  new THREE.Vector3(60, -22, 5),
  new THREE.Vector3(30, 30, -60),
  new THREE.Vector3(95, 18, -45),
  new THREE.Vector3(-30, -28, -70),
];

/** Przepływy danych między klastrami [od, do]. */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [3, 4],
  [1, 4],
  [5, 1],
  [5, 2],
  [0, 5],
];

const STEEL = new THREE.Color(0x8fa9d6);
const CYAN = new THREE.Color(0x8fd3f5);
const WARM = new THREE.Color(0xf0cf9c);
const TRACE = new THREE.Color(0xe9f6ff);

/** Równoległe „światłowody" w wiązce każdego połączenia. */
const STRANDS = 3;
const PACKETS_PER_EDGE = 26;
const PACKET_TRAIL = 0.07;
const CURVE_SEGMENTS = 56;
const TRACE_TRAIL_POINTS = 28;
/** Czas przelotu impulsu zapytania przez jeden odcinek trasy (s). */
const TRACE_SEGMENT_SECONDS = 0.55;

const NODE_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aCluster;
  attribute float aCore;
  attribute float aBoot;
  uniform float uEmphasis[${CLUSTERS.length}];
  uniform float uTime;
  uniform float uBoot;
  uniform float uScale;
  uniform float uPixelRatio;
  varying float vEmphasis;
  varying float vCore;
  varying float vAppear;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float emphasis = uEmphasis[int(aCluster + 0.5)];
    // Uruchomienie systemu: węzeł „zapala się" z krótkim przeskalowaniem.
    float appear = smoothstep(aBoot, aBoot + 0.06, uBoot);
    float pop = 1.0 + 0.6 * appear * (1.0 - smoothstep(aBoot + 0.06, aBoot + 0.16, uBoot));
    float pulse = 1.0 + aCore * 0.14 * emphasis * sin(uTime * 2.2 + aCluster * 1.7);
    float size = aSize * pulse * pop * (0.7 + 0.45 * emphasis) * uScale / max(-mvPosition.z, 1.0);
    vEmphasis = emphasis;
    vCore = aCore;
    vAppear = appear;
    gl_PointSize = clamp(size, 1.5, 72.0) * uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const NODE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying float vEmphasis;
  varying float vCore;
  varying float vAppear;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // Ostre jądro z miękką poświatą; rdzeń usługi dodatkowo z cienkim pierścieniem.
    float core = smoothstep(0.17, 0.1, d);
    float glow = exp(-d * d * 22.0) * 0.5;
    float ring = vCore * smoothstep(0.48, 0.455, d) * smoothstep(0.405, 0.43, d);
    float alpha = (core + glow + ring) * (0.2 + 0.8 * vEmphasis) * vAppear;
    if (alpha < 0.01) discard;
    vec3 color = mix(uColor, uAccent, vEmphasis * 0.7);
    gl_FragColor = vec4(mix(color, vec3(1.0), core * 0.6), alpha);
  }
`;

const LINE_VERTEX = /* glsl */ `
  attribute vec2 aClusters;
  attribute float aAlong;
  attribute float aBoot;
  uniform float uEmphasis[${CLUSTERS.length}];
  varying float vEmphasis;
  varying float vAlong;
  varying float vBoot;

  void main() {
    vEmphasis = max(uEmphasis[int(aClusters.x + 0.5)], uEmphasis[int(aClusters.y + 0.5)]);
    vAlong = aAlong;
    vBoot = aBoot;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBoot;
  varying float vEmphasis;
  varying float vAlong;
  varying float vBoot;

  void main() {
    // Uruchomienie: linia dorysowuje się od źródła do celu.
    float drawn = clamp((uBoot - vBoot) / 0.18, 0.0, 1.0);
    if (vAlong > drawn) discard;
    // Łuki wygaszają się przy węzłach, by nie zlewały się z nimi.
    float ends = smoothstep(0.0, 0.06, vAlong) * smoothstep(1.0, 0.94, vAlong);
    gl_FragColor = vec4(uColor, uOpacity * (0.14 + 0.86 * vEmphasis) * ends);
  }
`;

/** Wspólny kod pakietu: pozycja na krzywej Béziera liczona w shaderze. */
const PACKET_COMMON = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aControl;
  attribute vec3 aEnd;
  attribute vec2 aClusters;
  attribute float aOffset;
  attribute float aSpeed;
  uniform float uEmphasis[${CLUSTERS.length}];
  uniform float uTime;
  uniform float uBoot;

  vec3 bezier(float t) {
    float s = 1.0 - t;
    return s * s * aStart + 2.0 * s * t * aControl + t * t * aEnd;
  }

  float packetEmphasis() {
    return max(uEmphasis[int(aClusters.x + 0.5)], uEmphasis[int(aClusters.y + 0.5)]);
  }
`;

const TRAIL_VERTEX = /* glsl */ `
  ${PACKET_COMMON}
  attribute float aHead;
  varying float vAlpha;

  void main() {
    // Warkocz pakietu: odcinek od głowy (aHead = 1) do ogona za nią.
    float head = fract(aOffset + uTime * aSpeed);
    float t = max(head - (1.0 - aHead) * ${PACKET_TRAIL.toFixed(3)}, 0.0);
    float emphasis = packetEmphasis();
    vAlpha = aHead * sin(head * 3.14159) * (0.12 + 0.88 * emphasis * emphasis)
      * smoothstep(0.8, 1.0, uBoot);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(bezier(t), 1.0);
  }
`;

const TRAIL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * vAlpha * 0.9);
  }
`;

const HEAD_VERTEX = /* glsl */ `
  ${PACKET_COMMON}
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    float head = fract(aOffset + uTime * aSpeed);
    float emphasis = packetEmphasis();
    vAlpha = sin(head * 3.14159) * (0.15 + 0.85 * emphasis * emphasis) * smoothstep(0.8, 1.0, uBoot);
    gl_PointSize = (3.0 + 4.0 * emphasis) * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(bezier(head), 1.0);
  }
`;

const GLOW_POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = (exp(-d * d * 16.0) + smoothstep(0.16, 0.08, d)) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const TRACE_VERTEX = /* glsl */ `
  attribute float aFade;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vAlpha = aFade * uOpacity;
    gl_PointSize = uSize * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TRACE_LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * vAlpha);
  }
`;

const GRID_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const GRID_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBoot;
  varying vec3 vWorld;

  float gridLine(vec2 coord, float spacing) {
    vec2 cell = coord / spacing;
    vec2 width = fwidth(cell);
    vec2 line = abs(fract(cell - 0.5) - 0.5) / width;
    return 1.0 - min(min(line.x, line.y), 1.0);
  }

  void main() {
    // Techniczna siatka „blueprint" zanikająca z odległością od kamery.
    float minor = gridLine(vWorld.xz, 10.0) * 0.35;
    float major = gridLine(vWorld.xz, 50.0);
    float fade = 1.0 - smoothstep(60.0, 320.0, distance(vWorld, cameraPosition));
    gl_FragColor = vec4(uColor, max(minor, major) * fade * 0.13 * smoothstep(0.0, 0.3, uBoot));
  }
`;

interface Segment {
  curve: THREE.QuadraticBezierCurve3;
  reverse: boolean;
}

/**
 * Żywa architektura systemu: klastry usług (rdzeń + instancje w pierścieniach),
 * wiązki przepływów, pakiety danych z warkoczami światła, sekwencja
 * uruchomienia systemu i impulsy „żywych zapytań" przelatujące wskazaną trasą.
 * Wszystko to punkty i linie — ruch pakietów liczą shadery, CPU ustawia
 * kilka uniformów i ~30 punktów śladu zapytania na klatkę.
 */
export class SystemGraph {
  readonly object = new THREE.Group();
  /** Wspólna tablica jasności klastrów (0–1) dla wszystkich shaderów. */
  private readonly emphasis: number[] = CLUSTERS.map(() => 0.5);
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly edgeCurves = new Map<string, THREE.QuadraticBezierCurve3>();

  // Impuls żywego zapytania.
  private readonly traceHead: THREE.Points;
  private readonly traceTrail: THREE.Line;
  private readonly tracePositions = new Float32Array(TRACE_TRAIL_POINTS * 3);
  private readonly traceHeadPosition = new THREE.Vector3();
  private traceRoute: Segment[] = [];
  private traceStart = -1;
  private traceVisible = 0;

  constructor() {
    EDGES.forEach(([from, to]) => this.edgeCurves.set(`${from}-${to}`, this.edgeCurve(from, to, 0)));
    const trace = this.buildTrace();
    this.traceTrail = trace.trail;
    this.traceHead = trace.head;
    this.object.add(
      this.buildGrid(),
      this.buildLinks(),
      ...this.buildPackets(),
      this.buildNodes(),
      this.traceTrail,
      this.traceHead,
    );
  }

  setPixelRatio(pixelRatio: number): void {
    for (const material of this.materials) {
      if (material.uniforms['uPixelRatio']) material.uniforms['uPixelRatio'].value = pixelRatio;
    }
  }

  /** Rozmiar węzłów w pikselach zależy od wysokości kadru i kąta widzenia. */
  setViewport(height: number, fovDeg: number): void {
    const scale = height / 2 / Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
    for (const material of this.materials) {
      if (material.uniforms['uScale']) material.uniforms['uScale'].value = scale;
    }
  }

  /**
   * @param time     czas animacji (s)
   * @param boot     postęp uruchomienia systemu (0 → 1)
   * @param emphasis jasność kolejnych klastrów (0–1)
   */
  update(time: number, boot: number, emphasis: ReadonlyArray<number>): void {
    emphasis.forEach((value, index) => (this.emphasis[index] = value));
    for (const material of this.materials) {
      if (material.uniforms['uTime']) material.uniforms['uTime'].value = time;
      if (material.uniforms['uBoot']) material.uniforms['uBoot'].value = boot;
    }
    this.updateTrace(time);
  }

  /** Startuje impuls zapytania po trasie klastrów (np. [0, 1, 2, 1, 0]). */
  startTrace(route: ReadonlyArray<number>, time: number): void {
    this.traceRoute = [];
    for (let i = 0; i < route.length - 1; i++) {
      const forward = this.edgeCurves.get(`${route[i]}-${route[i + 1]}`);
      const backward = this.edgeCurves.get(`${route[i + 1]}-${route[i]}`);
      const curve = forward ?? backward;
      if (curve) this.traceRoute.push({ curve, reverse: !forward });
    }
    this.traceStart = this.traceRoute.length ? time : -1;
  }

  /** Pozycja głowy impulsu i jego widoczność (0–1) — do etykiety w HTML. */
  trace(): { position: THREE.Vector3; visibility: number } {
    return { position: this.traceHeadPosition, visibility: this.traceVisible };
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
  }

  private updateTrace(time: number): void {
    const duration = this.traceRoute.length * TRACE_SEGMENT_SECONDS;
    const elapsed = this.traceStart < 0 ? -1 : time - this.traceStart;
    if (elapsed < 0 || elapsed > duration + 0.6) {
      this.traceVisible = 0;
      this.traceHead.visible = this.traceTrail.visible = false;
      return;
    }
    // Pojawienie na starcie, wygaszenie po dotarciu do celu.
    this.traceVisible =
      THREE.MathUtils.smoothstep(elapsed, 0, 0.15) *
      (1 - THREE.MathUtils.smoothstep(elapsed, duration, duration + 0.6));
    this.traceHead.visible = this.traceTrail.visible = true;

    const progress = Math.min(elapsed / TRACE_SEGMENT_SECONDS, this.traceRoute.length - 1e-4);
    const at = (p: number, target: THREE.Vector3) => {
      const clamped = THREE.MathUtils.clamp(p, 0, this.traceRoute.length - 1e-4);
      const segment = this.traceRoute[Math.floor(clamped)];
      const local = THREE.MathUtils.smootherstep(clamped % 1, 0, 1);
      return segment.curve.getPoint(segment.reverse ? 1 - local : local, target);
    };
    at(progress, this.traceHeadPosition);
    this.traceHead.geometry.getAttribute('position').setXYZ(0, ...this.traceHeadPosition.toArray());
    this.traceHead.geometry.getAttribute('position').needsUpdate = true;

    const point = new THREE.Vector3();
    for (let i = 0; i < TRACE_TRAIL_POINTS; i++) {
      at(progress - (i / (TRACE_TRAIL_POINTS - 1)) * 0.6, point);
      this.tracePositions.set(point.toArray(), i * 3);
    }
    this.traceTrail.geometry.getAttribute('position').needsUpdate = true;
    for (const object of [this.traceHead, this.traceTrail]) {
      (object.material as THREE.ShaderMaterial).uniforms['uOpacity'].value = this.traceVisible;
    }
  }

  private createMaterial(
    vertexShader: string,
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
  ): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uEmphasis: { value: this.emphasis }, ...uniforms },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(material);
    this.disposables.push(material);
    return material;
  }

  private geometry(attributes: Record<string, [ArrayLike<number>, number]>): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    for (const [name, [values, size]] of Object.entries(attributes)) {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
    }
    this.disposables.push(geometry);
    return geometry;
  }

  /** Kolejność uruchamiania klastra (0–1): rdzeń, potem jego instancje. */
  private bootTime(cluster: number, ring: number): number {
    return 0.05 + cluster * 0.1 + ring * 0.05;
  }

  private buildNodes(): THREE.Points {
    const positions: number[] = [];
    const sizes: number[] = [];
    const clusters: number[] = [];
    const cores: number[] = [];
    const boots: number[] = [];
    const add = (point: THREE.Vector3, size: number, cluster: number, core: number, boot: number) => {
      positions.push(...point.toArray());
      sizes.push(size);
      clusters.push(cluster);
      cores.push(core);
      boots.push(boot);
    };
    CLUSTERS.forEach((center, index) => {
      add(center, 8, index, 1, this.bootTime(index, 0));
      for (const ring of this.rings(index)) {
        ring.points.forEach((point, i) =>
          add(point, ring.outer ? 2.2 : 3, index, 0, this.bootTime(index, ring.outer ? 2 : 1) + i * 0.003),
        );
      }
    });

    const geometry = this.geometry({
      position: [positions, 3],
      aSize: [sizes, 1],
      aCluster: [clusters, 1],
      aCore: [cores, 1],
      aBoot: [boots, 1],
    });
    const material = this.createMaterial(NODE_VERTEX, NODE_FRAGMENT, {
      uTime: { value: 0 },
      uBoot: { value: 0 },
      uScale: { value: 1 },
      uPixelRatio: { value: 1 },
      uColor: { value: STEEL },
      uAccent: { value: CYAN },
    });
    return new THREE.Points(geometry, material);
  }

  /** Wiązki przepływów między klastrami i wewnętrzna struktura klastrów. */
  private buildLinks(): THREE.LineSegments {
    const positions: number[] = [];
    const clusterPairs: number[] = [];
    const along: number[] = [];
    const boots: number[] = [];
    const push = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      clustersOf: [number, number],
      ta: number,
      tb: number,
      boot: number,
    ) => {
      positions.push(...a.toArray(), ...b.toArray());
      clusterPairs.push(...clustersOf, ...clustersOf);
      along.push(ta, tb);
      boots.push(boot, boot);
    };

    EDGES.forEach(([from, to], edge) => {
      const boot = 0.62 + edge * 0.025;
      for (let strand = 0; strand < STRANDS; strand++) {
        const points = this.edgeCurve(from, to, strand).getPoints(CURVE_SEGMENTS);
        for (let i = 0; i < CURVE_SEGMENTS; i++) {
          push(points[i], points[i + 1], [from, to], i / CURVE_SEGMENTS, (i + 1) / CURVE_SEGMENTS, boot);
        }
      }
    });

    // Struktura klastra: szprychy rdzeń–pierścień wewnętrzny, obwód pierścienia,
    // instancje zewnętrzne podpięte do najbliższej wewnętrznej.
    CLUSTERS.forEach((center, index) => {
      const [inner, outer] = this.rings(index);
      const boot = this.bootTime(index, 1) + 0.02;
      inner.points.forEach((point, i) => {
        push(center, point, [index, index], 0, 1, boot);
        push(point, inner.points[(i + 1) % inner.points.length], [index, index], 0.5, 0.5, boot + 0.03);
      });
      outer.points.forEach((point) => {
        const nearest = inner.points.reduce((best, candidate) =>
          candidate.distanceToSquared(point) < best.distanceToSquared(point) ? candidate : best,
        );
        push(nearest, point, [index, index], 0, 1, boot + 0.05);
      });
    });

    const geometry = this.geometry({
      position: [positions, 3],
      aClusters: [clusterPairs, 2],
      aAlong: [along, 1],
      aBoot: [boots, 1],
    });
    const material = this.createMaterial(LINE_VERTEX, LINE_FRAGMENT, {
      uBoot: { value: 0 },
      uColor: { value: STEEL },
      uOpacity: { value: 0.5 },
    });
    return new THREE.LineSegments(geometry, material);
  }

  /** Pakiety danych: warkocze (linie) i jasne głowy (punkty). */
  private buildPackets(): [THREE.LineSegments, THREE.Points] {
    const count = EDGES.length * PACKETS_PER_EDGE;
    const data = {
      aStart: [] as number[],
      aControl: [] as number[],
      aEnd: [] as number[],
      aClusters: [] as number[],
      aOffset: [] as number[],
      aSpeed: [] as number[],
    };
    EDGES.forEach(([from, to]) => {
      for (let i = 0; i < PACKETS_PER_EDGE; i++) {
        const curve = this.edgeCurve(from, to, i % STRANDS);
        // Co trzeci pakiet płynie w drugą stronę — odpowiedzi wracają.
        const reverse = i % 3 === 1;
        data.aStart.push(...(reverse ? curve.v2 : curve.v0).toArray());
        data.aControl.push(...curve.v1.toArray());
        data.aEnd.push(...(reverse ? curve.v0 : curve.v2).toArray());
        data.aClusters.push(from, to);
        data.aOffset.push(i / PACKETS_PER_EDGE + Math.random() * 0.03);
        data.aSpeed.push(0.08 + Math.random() * 0.06);
      }
    });

    // Warkocz: po 2 wierzchołki na pakiet (ogon i głowa) z tymi samymi danymi.
    const doubled = (values: number[], size: number) => {
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const item = values.slice(i * size, i * size + size);
        result.push(...item, ...item);
      }
      return result;
    };
    const trailAttributes: Record<string, [ArrayLike<number>, number]> = {
      position: [new Float32Array(count * 6), 3],
      aHead: [Array.from({ length: count * 2 }, (_, i) => i % 2), 1],
    };
    const headAttributes: Record<string, [ArrayLike<number>, number]> = {
      position: [new Float32Array(count * 3), 3],
    };
    const sizes: Record<string, number> = { aStart: 3, aControl: 3, aEnd: 3, aClusters: 2, aOffset: 1, aSpeed: 1 };
    for (const [name, values] of Object.entries(data)) {
      trailAttributes[name] = [doubled(values, sizes[name]), sizes[name]];
      headAttributes[name] = [values, sizes[name]];
    }

    const shared = { uTime: { value: 0 }, uBoot: { value: 0 }, uColor: { value: WARM } };
    const trails = new THREE.LineSegments(
      this.geometry(trailAttributes),
      this.createMaterial(TRAIL_VERTEX, TRAIL_FRAGMENT, { ...shared }),
    );
    const heads = new THREE.Points(
      this.geometry(headAttributes),
      this.createMaterial(HEAD_VERTEX, GLOW_POINT_FRAGMENT, { ...shared, uPixelRatio: { value: 1 } }),
    );
    // Pozycje liczy shader, więc obiekty nie mogą być odrzucane przez frustum culling.
    trails.frustumCulled = heads.frustumCulled = false;
    return [trails, heads];
  }

  private buildTrace(): { trail: THREE.Line; head: THREE.Points } {
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.tracePositions, 3));
    trailGeometry.setAttribute(
      'aFade',
      new THREE.Float32BufferAttribute(
        Array.from({ length: TRACE_TRAIL_POINTS }, (_, i) => 1 - i / (TRACE_TRAIL_POINTS - 1)),
        1,
      ),
    );
    const headGeometry = new THREE.BufferGeometry();
    headGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    headGeometry.setAttribute('aFade', new THREE.Float32BufferAttribute([1], 1));
    this.disposables.push(trailGeometry, headGeometry);

    const uniforms = () => ({
      uColor: { value: TRACE },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 16 },
    });
    const trail = new THREE.Line(trailGeometry, this.createMaterial(TRACE_VERTEX, TRACE_LINE_FRAGMENT, uniforms()));
    const head = new THREE.Points(headGeometry, this.createMaterial(TRACE_VERTEX, `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = (exp(-d * d * 10.0) + smoothstep(0.14, 0.06, d)) * vAlpha;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `, uniforms()));
    trail.frustumCulled = head.frustumCulled = false;
    trail.visible = head.visible = false;
    return { trail, head };
  }

  private buildGrid(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(900, 900);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: GRID_VERTEX,
      fragmentShader: GRID_FRAGMENT,
      uniforms: { uColor: { value: STEEL }, uBoot: { value: 0 } },
      transparent: true,
      depthWrite: false,
    });
    this.materials.push(material);
    this.disposables.push(geometry, material);
    const grid = new THREE.Mesh(geometry, material);
    grid.position.y = -55;
    return grid;
  }

  /**
   * Łuk przepływu: krzywa Béziera wygięta ku górze między dwoma klastrami;
   * kolejne „światłowody" wiązki są lekko odsunięte w bok.
   */
  private edgeCurve(from: number, to: number, strand: number): THREE.QuadraticBezierCurve3 {
    const start = CLUSTERS[from];
    const end = CLUSTERS[to];
    const side = new THREE.Vector3().subVectors(end, start).cross(new THREE.Vector3(0, 1, 0)).normalize();
    const spread = (strand - (STRANDS - 1) / 2) * 2.4;
    const control = start
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3(0, 10 + start.distanceTo(end) * 0.18 + Math.abs(spread) * 0.6, 0))
      .addScaledVector(side, spread * 1.6);
    return new THREE.QuadraticBezierCurve3(
      start.clone().addScaledVector(side, spread * 0.3),
      control,
      end.clone().addScaledVector(side, spread * 0.3),
    );
  }

  /**
   * Instancje usługi w dwóch uporządkowanych pierścieniach wokół rdzenia,
   * każdy klaster z innym pochyleniem — wygląd jak schemat infrastruktury.
   */
  private rings(cluster: number): Array<{ outer: boolean; points: THREE.Vector3[] }> {
    const tilt = new THREE.Euler(0.35 + cluster * 0.21, cluster * 0.9, 0.15 * cluster);
    const ring = (count: number, radius: number, twist: number) =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + twist;
        return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
          .applyEuler(tilt)
          .add(CLUSTERS[cluster]);
      });
    return [
      { outer: false, points: ring(8, 9, 0) },
      { outer: true, points: ring(16, 16, Math.PI / 16) },
    ];
  }
}
