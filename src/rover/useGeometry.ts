import { useEffect, useMemo } from 'react';
import type { BufferGeometry } from 'three';

interface Resource { geometry: BufferGeometry; users: number; timer?: ReturnType<typeof setTimeout> }
const cache = new Map<string, Resource>();

/** Meshes using these resources must opt out of R3F's per-mesh disposal. */
export function useGeometry<T extends BufferGeometry>(key: string, create: () => T): T {
  const resource = useMemo(() => {
    let item = cache.get(key);
    if (!item) {
      item = { geometry: create(), users: 0 };
      cache.set(key, item);
    }
    return item;
    // The complete geometry specification is encoded in the cache key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (resource.timer) clearTimeout(resource.timer);
    resource.users++;
    return () => {
      resource.users--;
      // Defer to survive StrictMode's effect replay and same-frame remounts.
      resource.timer = setTimeout(() => {
        if (resource.users === 0 && cache.get(key) === resource) {
          resource.geometry.dispose();
          cache.delete(key);
        }
      }, 0);
    };
  }, [resource, key]);
  return resource.geometry as T;
}
