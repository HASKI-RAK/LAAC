// Unit tests for ElementTypeTimeSpentProvider (REQ-FN-029, CSV EO-008)

import { Test, TestingModule } from '@nestjs/testing';
import { ElementTypeTimeSpentProvider } from './element-type-time-spent.provider';
import { xAPIStatement } from '../../data-access';

describe('ElementTypeTimeSpentProvider (REQ-FN-029, CSV EO-008)', () => {
  let provider: ElementTypeTimeSpentProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElementTypeTimeSpentProvider],
    }).compile();

    provider = module.get<ElementTypeTimeSpentProvider>(
      ElementTypeTimeSpentProvider,
    );
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should aggregate time spent per element type', async () => {
    const statements: xAPIStatement[] = [
      // SE 1: 10 minutes
      {
        id: '1',
        object: {
          id: 'http://example.com/se1',
          definition: { name: { en: 'Selbsteinschätzungstest 1' } },
        },
        result: { duration: 'PT10M' },
        timestamp: '2025-01-01T10:00:00Z',
      },
      // SE 1: 5 minutes (second attempt)
      {
        id: '2',
        object: {
          id: 'http://example.com/se1',
          definition: { name: { en: 'Selbsteinschätzungstest 1' } },
        },
        result: { duration: 'PT5M' },
        timestamp: '2025-01-01T10:30:00Z',
      },
      // SE 2: 20 minutes
      {
        id: '3',
        object: {
          id: 'http://example.com/se2',
          definition: { name: { en: 'Selbsteinschätzungstest 2' } },
        },
        result: { duration: 'PT20M' },
        timestamp: '2025-01-01T11:00:00Z',
      },
      // EX 1: 15 minutes
      {
        id: '4',
        object: {
          id: 'http://example.com/ex1',
          definition: { name: { en: 'Beispiel 1' } },
        },
        result: { duration: 'PT15M' },
        timestamp: '2025-01-01T12:00:00Z',
      },
    ] as any;

    const result = await provider.compute({ userId: 'user-1' }, statements);

    const values = result.value as any[];
    expect(values).toHaveLength(2);

    // Check SE (Self-Assessment)
    // Total: 10 + 5 + 20 = 35 minutes = 2100 seconds
    // Elements: se1, se2 (2 unique elements)
    // Average: 2100 / 2 = 1050 seconds
    const se = values.find((v) => v.type === 'SE');
    expect(se).toBeDefined();
    expect(se.totalSeconds).toBe(2100);
    expect(se.elementCount).toBe(2);
    expect(se.avgSecondsPerElement).toBe(1050);

    // Check EX (Example)
    // Total: 15 minutes = 900 seconds
    // Elements: ex1 (1 unique element)
    // Average: 900 / 1 = 900 seconds
    const ex = values.find((v) => v.type === 'EX');
    expect(ex).toBeDefined();
    expect(ex.totalSeconds).toBe(900);
    expect(ex.elementCount).toBe(1);
    expect(ex.avgSecondsPerElement).toBe(900);
  });

  it('should handle unknown types and missing durations', async () => {
    const statements: xAPIStatement[] = [
      {
        id: '1',
        object: {
          id: 'http://example.com/unknown',
          definition: { name: { en: 'Unknown Thing' } },
        },
        result: { duration: 'PT10M' },
      },
      {
        id: '2',
        object: {
          id: 'http://example.com/se1',
          definition: { name: { en: 'Selbsteinschätzungstest 1' } },
        },
        // No duration
      },
    ] as any;

    const result = await provider.compute({ userId: 'user-1' }, statements);

    expect(result.value).toHaveLength(0);
  });
});
