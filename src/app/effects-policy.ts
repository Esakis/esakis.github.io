interface EffectsEnvironment {
  reducedMotion: boolean;
  saveData: boolean;
  compactViewport: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

interface NavigatorWithDeviceHints extends Navigator {
  readonly connection?: { readonly saveData?: boolean };
  readonly deviceMemory?: number;
}

export type EffectsProfile = 'full' | 'compact' | 'static';

export function getEffectsProfile(environment = readEffectsEnvironment()): EffectsProfile {
  if (environment.reducedMotion) return 'static';

  // Require both hints so a single, conservative browser value does not reduce the whole scene.
  const constrainedDevice =
    environment.deviceMemory !== undefined &&
    environment.deviceMemory <= 4 &&
    environment.hardwareConcurrency !== undefined &&
    environment.hardwareConcurrency <= 4;

  return environment.compactViewport || environment.saveData || constrainedDevice
    ? 'compact'
    : 'full';
}

function readEffectsEnvironment(): EffectsEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { reducedMotion: false, saveData: false, compactViewport: false };
  }

  const device = navigator as NavigatorWithDeviceHints;
  return {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: device.connection?.saveData === true,
    compactViewport: window.matchMedia?.('(max-width: 1000px)').matches ?? window.innerWidth <= 1000,
    deviceMemory: device.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
