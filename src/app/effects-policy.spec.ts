import { shouldSkipPlanetModels } from './effects-policy';

describe('shouldSkipPlanetModels', () => {
  const standardDevice = {
    reducedMotion: false,
    saveData: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
  };

  it('keeps planet models for a standard device', () => {
    expect(shouldSkipPlanetModels(standardDevice)).toBe(false);
  });

  it('skips planet models when motion is disabled or data saving is enabled', () => {
    expect(shouldSkipPlanetModels({ ...standardDevice, reducedMotion: true })).toBe(true);
    expect(shouldSkipPlanetModels({ ...standardDevice, saveData: true })).toBe(true);
  });

  it('skips planet models only when both device hints indicate limited hardware', () => {
    expect(
      shouldSkipPlanetModels({ ...standardDevice, deviceMemory: 4, hardwareConcurrency: 4 }),
    ).toBe(true);
    expect(shouldSkipPlanetModels({ ...standardDevice, deviceMemory: 4 })).toBe(false);
    expect(shouldSkipPlanetModels({ ...standardDevice, hardwareConcurrency: 4 })).toBe(false);
  });
});
