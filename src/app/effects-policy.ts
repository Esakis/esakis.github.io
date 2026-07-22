interface EffectsEnvironment {
  reducedMotion: boolean;
  saveData: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

interface NavigatorWithDeviceHints extends Navigator {
  readonly connection?: { readonly saveData?: boolean };
  readonly deviceMemory?: number;
}

export function shouldSkipPlanetModels(environment = readEffectsEnvironment()): boolean {
  // Require both hints so a single, conservative browser value does not suppress the models.
  const constrainedDevice =
    environment.deviceMemory !== undefined &&
    environment.deviceMemory <= 4 &&
    environment.hardwareConcurrency !== undefined &&
    environment.hardwareConcurrency <= 4;

  return environment.reducedMotion || environment.saveData || constrainedDevice;
}

function readEffectsEnvironment(): EffectsEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { reducedMotion: false, saveData: false };
  }

  const device = navigator as NavigatorWithDeviceHints;
  return {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: device.connection?.saveData === true,
    deviceMemory: device.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
