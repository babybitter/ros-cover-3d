import { describe, expect, it } from 'vitest';
import { campus, campusObstacles } from '../environment/EnvironmentConfig';
import { roverConfig } from '../config/roverConfig';
import { collides, segmentCollides } from '../simulation/CollisionDetector';
import { planPath } from '../simulation/PathPlanner';

describe('continuous collision detection', () => {
  const box = { id: 'thin', x: 0, z: 0, width: 0.001, depth: 2, height: 1 };
  it('detects very thin obstacles between endpoints and parallel tangencies', () => {
    expect(segmentCollides({ x: -1, z: 0 }, { x: 1, z: 0 }, [box], 0)).toBe(true);
    expect(segmentCollides({ x: -1, z: 2 }, { x: 1, z: 2 }, [box], 1)).toBe(true);
    expect(segmentCollides({ x: -1, z: 2.01 }, { x: 1, z: 2.01 }, [box], 1)).toBe(false);
  });
  it('uses rounded rather than square expanded corners and handles stationary segments', () => {
    const square = { ...box, width: 2 };
    expect(segmentCollides({ x: 1.8, z: 1.8 }, { x: 2, z: 2 }, [square], 1)).toBe(false);
    expect(segmentCollides({ x: 1.5, z: 1.5 }, { x: 2, z: 2 }, [square], 1)).toBe(true);
    expect(segmentCollides({ x: 0, z: 0 }, { x: 0, z: 0 }, [square], 0)).toBe(true);
    expect(segmentCollides({ x: 4, z: 0 }, { x: 4, z: 0 }, [square], 1)).toBe(false);
  });
});
describe('campus layout and planning', () => {
  const radius = roverConfig.collisionRadius + 0.12;
  it('contains varied structures with shared finite scan/collision geometry', () => {
    expect(campus.size).toBe(200);
    expect(campus.roads.length).toBe(7);
    expect(new Set(campus.surfaces.map(s => s.id)).size).toBe(campus.surfaces.length);
    expect(campus.surfaces.filter(s => /^building-\d+$/.test(s.id)).length).toBe(16);
    expect(campus.surfaces.every(s => [...s.center, ...s.size].every(Number.isFinite) && s.size.every(n => n > 0))).toBe(true);
    expect(campusObstacles.length).toBe(campus.surfaces.filter(s => s.solid).length);
    expect(collides({ x: 32, z: 32 }, campusObstacles, radius)).toBe(true);
    expect(collides({ x: 0, z: 0 }, campusObstacles, radius)).toBe(false);
  });
  it('connects distant intersections without crossing major obstacles', () => {
    const start = performance.now();
    const result = planPath({ min: -100, max: 100, resolution: 2 }, { x: 0, z: 0 }, { x: 64, z: 64 }, campusObstacles, radius);
    console.info(`Campus A*: ${(performance.now() - start).toFixed(1)} ms, ${result.visited} cells`);
    expect(result.path.length).toBeGreaterThan(30);
    for (let i = 1; i < result.path.length; i++) expect(segmentCollides(result.path[i - 1], result.path[i], campusObstacles, radius)).toBe(false);
  });
});
