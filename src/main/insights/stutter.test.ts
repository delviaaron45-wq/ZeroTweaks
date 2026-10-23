import { describe, expect, it } from 'vitest';
import { buildStutterReport, classifyPeak } from './stutter.js';
import type { StutterSample } from '../../shared/types/insights.js';

function sample(overrides: Partial<StutterSample> = {}): StutterSample {
  return {
    t: 0,
    cpuPercent: 20,
    gpuPercent: 30,
    diskQueueLength: 0,
    memAvailableMB: 12000,
    pagesPerSec: 10,
    dpcPercent: 0.2,
    irqPercent: 0.1,
    cpuTempC: 50,
    gpuTempC: 55,
    ...overrides,
  };
}

describe('classifyPeak', () => {
  it('detects disk access spikes', () => {
    const samples = [
      sample(),
      sample({ diskQueueLength: 25, pagesPerSec: 900 }),
      sample(),
    ];
    const { cause, evidence } = classifyPeak(samples, 1);
    expect(cause).toBe('disk_access');
    expect(evidence.join(' ')).toContain('disco');
  });

  it('detects memory paging', () => {
    const samples = [sample(), sample({ memAvailableMB: 400, pagesPerSec: 1200 }), sample()];
    expect(classifyPeak(samples, 1).cause).toBe('memory_paging');
  });

  it('detects driver interrupts', () => {
    const samples = [sample(), sample({ dpcPercent: 6, irqPercent: 4 }), sample()];
    expect(classifyPeak(samples, 1).cause).toBe('driver_interrupt');
  });

  it('detects a saturated GPU', () => {
    const samples = [sample(), sample({ gpuPercent: 97 }), sample()];
    expect(classifyPeak(samples, 1).cause).toBe('gpu_saturated');
  });

  it('detects a saturated CPU', () => {
    const samples = [sample(), sample({ cpuPercent: 95 }), sample()];
    expect(classifyPeak(samples, 1).cause).toBe('cpu_saturated');
  });

  it('does not invent a cause when nothing stands out', () => {
    const samples = [sample(), sample({ cpuPercent: 22 }), sample()];
    expect(classifyPeak(samples, 1).cause).toBe('unknown');
  });
});

describe('buildStutterReport', () => {
  it('reports not enough data with few samples', () => {
    const report = buildStutterReport([sample()]);
    expect(report.peaks).toHaveLength(0);
    expect(report.dominantCause).toBe('unknown');
    expect(report.summary).toContain('muestras');
  });

  it('detects spikes and names the dominant cause', () => {
    const samples = [
      sample(),
      sample(),
      sample({ cpuPercent: 96, diskQueueLength: 0 }),
      sample(),
      sample(),
      sample({ cpuPercent: 94 }),
      sample(),
    ];
    const report = buildStutterReport(samples);
    expect(report.peaks.length).toBeGreaterThan(0);
    expect(report.dominantCause).toBe('cpu_saturated');
    expect(report.recommendation).toContain('CPU');
  });

  it('always states the measurement limitations', () => {
    const report = buildStutterReport([sample(), sample(), sample()]);
    expect(report.limitations.length).toBeGreaterThan(0);
    expect(report.limitations.join(' ')).toContain('PresentMon');
  });
});
