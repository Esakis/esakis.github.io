import { getEffectsProfile } from './effects-policy';

describe('getEffectsProfile', () => {
  const standardDevice = {
    reducedMotion: false,
    saveData: false,
    compactViewport: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
  };

  it('uses full effects for a standard desktop', () => {
    expect(getEffectsProfile(standardDevice)).toBe('full');
  });

  it('uses static effects when reduced motion is requested', () => {
    expect(getEffectsProfile({ ...standardDevice, reducedMotion: true })).toBe('static');
    expect(
      getEffectsProfile({
        ...standardDevice,
        reducedMotion: true,
        saveData: true,
        compactViewport: true,
      }),
    ).toBe('static');
  });

  it('uses compact effects for a narrow viewport or data saving', () => {
    expect(getEffectsProfile({ ...standardDevice, compactViewport: true })).toBe('compact');
    expect(getEffectsProfile({ ...standardDevice, saveData: true })).toBe('compact');
  });

  it('uses compact effects only when both device hints indicate limited hardware', () => {
    expect(
      getEffectsProfile({ ...standardDevice, deviceMemory: 4, hardwareConcurrency: 4 }),
    ).toBe('compact');
    expect(getEffectsProfile({ ...standardDevice, deviceMemory: 4 })).toBe('full');
    expect(getEffectsProfile({ ...standardDevice, hardwareConcurrency: 4 })).toBe('full');
  });
});
