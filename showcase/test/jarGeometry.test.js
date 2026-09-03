import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { splineAt, sectionPoint, widthFrac, depthFrac, volume, buildJar, BODY_KF, SEAM_Y } from '../src/jarGeometry.js';

describe('splineAt', () => {
  it('passes through every keyframe exactly', () => {
    for (const [h, frac] of BODY_KF) {
      expect(splineAt(BODY_KF, h)).toBeCloseTo(frac, 6);
    }
  });

  it('clamps below the first and above the last keyframe', () => {
    expect(splineAt(BODY_KF, -100)).toBeCloseTo(BODY_KF[0][1], 10);
    expect(splineAt(BODY_KF, 1000)).toBeCloseTo(BODY_KF[BODY_KF.length - 1][1], 10);
  });
});

describe('widthFrac / depthFrac', () => {
  it('does not jump across the body/cap seam', () => {
    expect(widthFrac(SEAM_Y)).toBeCloseTo(widthFrac(SEAM_Y + 1e-6), 3);
  });

  it('keeps depth equal to width below the seam (body is not tapered in depth)', () => {
    expect(depthFrac(20)).toBe(widthFrac(20));
  });
});

describe('sectionPoint', () => {
  it('lands on the +x axis at t=0', () => {
    const p = sectionPoint(0, 10, 5, 2.5);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('lands on the +z axis at t=pi/2', () => {
    const p = sectionPoint(Math.PI / 2, 10, 5, 2.5);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(5, 6);
  });

  it('traces a true ellipse when n=2', () => {
    const a = 10, b = 5;
    for (const t of [0.3, 1.1, 2.7, 4.2]) {
      const p = sectionPoint(t, a, b, 2);
      expect((p.x / a) ** 2 + (p.z / b) ** 2).toBeCloseTo(1, 5);
    }
  });
});

describe('volume', () => {
  it('measures a centered 2x2x2 box as 8', () => {
    const box = new THREE.BoxGeometry(2, 2, 2);
    expect(volume(box)).toBeCloseTo(8, 3);
  });
});

describe('buildJar', () => {
  const built = buildJar();

  it('reports the labelled overall dimensions', () => {
    expect(built.dims.TOTAL_H).toBe(68);
    expect(built.dims.HW * 2).toBe(57);
    expect(built.dims.HD * 2).toBe(30);
  });

  it('produces a plausible capacity for a 40ml jar (matches the reconstruction\'s own cross-check: ~40ml fill + ~17% headspace)', () => {
    expect(built.capacityMl).toBeGreaterThan(30);
    expect(built.capacityMl).toBeLessThan(60);
  });

  it('outer body envelope is larger than the wall-thinned inner capacity', () => {
    expect(built.bodyVolumeMl).toBeGreaterThan(built.capacityMl);
  });

  it('gives the body side a UV attribute for label mapping', () => {
    expect(built.parts.bodySide.attributes.uv).toBeDefined();
    const uv = built.parts.bodySide.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThan(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1.0001);
    }
  });
});
