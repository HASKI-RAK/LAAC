// REQ-FN-028/029: New element-type metrics end-to-end coverage (also exercises REQ-FN-003 catalog exposure)
// Validates ElementClicksProvider (EO-007/ST-001) and ElementTypeTimeSpentProvider (EO-008)

import { Test, TestingModule } from '@nestjs/testing';
import {
  ElementClicksProvider,
  ElementTypeTimeSpentProvider,
} from '../src/computation/providers';
import { xAPIStatement } from '../src/data-access';

describe('Element type metrics (REQ-FN-028/029)', () => {
  let elementClicksProvider: ElementClicksProvider;
  let elementTypeTimeSpentProvider: ElementTypeTimeSpentProvider;

  // Sample xAPI statements simulating real HASKI data
  const sampleStatements: xAPIStatement[] = [
    // CT (Commentary) - Fixed Sequence 1
    {
      id: '1',
      verb: { id: 'https://wiki.haski.app/answered' },
      object: {
        id: 'http://example.com/ct',
        definition: { name: { en: '<h6>Kurzübersicht </h6>' } },
      },
      timestamp: '2025-01-01T10:00:00Z',
      result: { duration: 'PT5M' },
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
      result: { duration: 'PT10M' },
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
      result: { duration: 'PT15M' },
    },
    {
      id: '3b',
      verb: { id: 'https://wiki.haski.app/answered' },
      object: {
        id: 'http://example.com/ex',
        definition: { name: { en: '<h6>Beispiel </h6>' } },
      },
      timestamp: '2025-01-01T10:11:00Z',
      result: { duration: 'PT5M' },
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
      result: { duration: 'PT20M' },
    },
  ] as any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ElementClicksProvider, ElementTypeTimeSpentProvider],
    }).compile();

    elementClicksProvider = moduleFixture.get<ElementClicksProvider>(
      ElementClicksProvider,
    );
    elementTypeTimeSpentProvider =
      moduleFixture.get<ElementTypeTimeSpentProvider>(
        ElementTypeTimeSpentProvider,
      );
  });

  describe('ElementClicksProvider', () => {
    it('should compute clicks and dimension scores correctly', async () => {
      const params = { userId: 'user-1' };
      const result = await elementClicksProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('element-clicks');
      const values = result.value as any[];
      expect(values).toHaveLength(4);

      // Check EX (Example)
      // 2 clicks * 5 base * 1.5 weight = 15
      const ex = values.find((v) => v.type === 'EX');
      expect(ex).toBeDefined();
      expect(ex.clickCount).toBe(2);
      expect(ex.sequence).toBe(3);
      expect(ex.weight).toBe(1.5);
      expect(ex.dimensionScore).toBe(15);

      // Check AN (Animation)
      // 1 click * 5 base * 1.5 weight = 7.5
      const an = values.find((v) => v.type === 'AN');
      expect(an).toBeDefined();
      expect(an.clickCount).toBe(1);
      expect(an.sequence).toBe(4);
      expect(an.weight).toBe(1.5);
      expect(an.dimensionScore).toBe(7.5);

      // Check CO (Content Object)
      // Highest other score is 15 (EX)
      // CO score = 15 + 3 = 18
      const co = values.find((v) => v.type === 'CO');
      expect(co).toBeDefined();
      expect(co.sequence).toBe(2);
      expect(co.dimensionScore).toBe(18);

      // Check CT (Commentary)
      // CT score = 15 + 6 = 21
      const ct = values.find((v) => v.type === 'CT');
      expect(ct).toBeDefined();
      expect(ct.sequence).toBe(1);
      expect(ct.dimensionScore).toBe(21);
    });
  });

  describe('ElementTypeTimeSpentProvider', () => {
    it('should compute time spent per element type correctly', async () => {
      const params = { userId: 'user-1' };
      const result = await elementTypeTimeSpentProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('element-type-time-spent');
      const values = result.value as any[];
      expect(values).toHaveLength(4);

      // Check EX (Example)
      // Total: 15 + 5 = 20 minutes = 1200 seconds
      // Elements: 1 unique element (http://example.com/ex)
      // Average: 1200 / 1 = 1200 seconds
      const ex = values.find((v) => v.type === 'EX');
      expect(ex).toBeDefined();
      expect(ex.totalSeconds).toBe(1200);
      expect(ex.elementCount).toBe(1);
      expect(ex.avgSecondsPerElement).toBe(1200);

      // Check AN (Animation)
      // Total: 20 minutes = 1200 seconds
      const an = values.find((v) => v.type === 'AN');
      expect(an).toBeDefined();
      expect(an.totalSeconds).toBe(1200);

      // Check CO (Content Object)
      // Total: 10 minutes = 600 seconds
      const co = values.find((v) => v.type === 'CO');
      expect(co).toBeDefined();
      expect(co.totalSeconds).toBe(600);

      // Check CT (Commentary)
      // Total: 5 minutes = 300 seconds
      const ct = values.find((v) => v.type === 'CT');
      expect(ct).toBeDefined();
      expect(ct.totalSeconds).toBe(300);
    });
  });
});
