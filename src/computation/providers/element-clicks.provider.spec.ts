// Unit tests for ElementClicksProvider (REQ-FN-028, CSV EO-007/ST-001)

import { Test, TestingModule } from '@nestjs/testing';
import { ElementClicksProvider } from './element-clicks.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementClicksProvider (REQ-FN-028, CSV EO-007/ST-001)', () => {
  let provider: ElementClicksProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElementClicksProvider],
    }).compile();

    provider = module.get<ElementClicksProvider>(ElementClicksProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should correctly classify German LE names and compute scores', async () => {
    const statements: xAPIStatement[] = [
      // CT (Commentary) - Fixed Sequence 1
      {
        id: '1',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/ct',
          definition: { name: { en: '<h6>Kurzübersicht </h6>' } },
        },
        timestamp: '2025-01-01T10:00:00Z',
      },
      // CO (Content Object) - Fixed Sequence 2
      {
        id: '2',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/co',
          definition: { name: { en: '<h6>Erklärung </h6>' } },
        },
        timestamp: '2025-01-01T10:05:00Z',
      },
      // EX (Example) - First non-fixed (Sequence 3) -> Weight 1.5
      {
        id: '3',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/ex',
          definition: { name: { en: '<h6>Beispiel </h6>' } },
        },
        timestamp: '2025-01-01T10:10:00Z',
      },
      {
        id: '3b',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/ex',
          definition: { name: { en: '<h6>Beispiel </h6>' } },
        },
        timestamp: '2025-01-01T10:11:00Z',
      },
      {
        id: '3c',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/ex',
          definition: { name: { en: '<h6>Beispiel </h6>' } },
        },
        timestamp: '2025-01-01T10:12:00Z',
      },
      // AN (Animation) - Second non-fixed (Sequence 4) -> Weight 1.5
      {
        id: '4',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/an',
          definition: { name: { en: '<h6>Animation </h6>' } },
        },
        timestamp: '2025-01-01T10:15:00Z',
      },
    ] as any;

    const result = await provider.compute({ userId: 'user-1' }, statements);

    const values = result.value as any[];
    expect(values).toHaveLength(4);

    // Check EX (Example)
    // 3 clicks * 5 base * 1.5 weight = 22.5
    const ex = values.find((v) => v.type === 'EX');
    expect(ex).toBeDefined();
    expect(ex.clickCount).toBe(3);
    expect(ex.sequence).toBe(3);
    expect(ex.weight).toBe(1.5);
    expect(ex.dimensionScore).toBe(22.5);

    // Check AN (Animation)
    // 1 click * 5 base * 1.5 weight = 7.5
    const an = values.find((v) => v.type === 'AN');
    expect(an).toBeDefined();
    expect(an.clickCount).toBe(1);
    expect(an.sequence).toBe(4);
    expect(an.weight).toBe(1.5);
    expect(an.dimensionScore).toBe(7.5);

    // Check CO (Content Object)
    // Highest other score is 22.5 (EX)
    // CO score = 22.5 + 3 = 25.5
    const co = values.find((v) => v.type === 'CO');
    expect(co).toBeDefined();
    expect(co.sequence).toBe(2);
    expect(co.dimensionScore).toBe(25.5);

    // Check CT (Commentary)
    // CT score = 22.5 + 6 = 28.5
    const ct = values.find((v) => v.type === 'CT');
    expect(ct).toBeDefined();
    expect(ct.sequence).toBe(1);
    expect(ct.dimensionScore).toBe(28.5);
  });

  it('should handle unknown types gracefully', async () => {
    const statements: xAPIStatement[] = [
      {
        id: '1',
        verb: { id: 'https://wiki.haski.app/answered' },
        object: {
          id: 'http://example.com/unknown',
          definition: { name: { en: 'Unknown Thing' } },
        },
        timestamp: '2025-01-01T10:00:00Z',
      },
    ] as any;

    const result = await provider.compute({ userId: 'user-1' }, statements);

    expect(result.value).toHaveLength(0);
  });
});
