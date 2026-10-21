import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, PointsMaterial, type Group } from 'three';
import { Line } from '@react-three/drei';
import { useMapping } from '../stores/mappingStore';
import { runtime } from '../simulation/VehicleController';
import { mappingRuntime } from './MappingRuntime';
import { maxMapPoints, maxScanPoints } from './LidarConfig';
import { pointColor } from './PointCloudBuffer';

function Cloud({ layer }: { layer: 'live' | 'map' }) {
  const color = useMapping(s => s.color);
  const size = useMapping(s => layer === 'live' ? s.liveSize : s.mapSize);
  const capacity = layer === 'live' ? maxScanPoints : maxMapPoints;
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage));
    geo.setAttribute('color', new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage));
    geo.setDrawRange(0, 0); return geo;
  }, [capacity]);
  const material = useMemo(() => new PointsMaterial({ vertexColors: true, sizeAttenuation: true, depthWrite: false, transparent: true, opacity: layer === 'live' ? 1 : 0.85, toneMapped: false }), [layer]);
  const seen = useRef({ revision: -1, color, source: mappingRuntime.live });
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => {
    const source = layer === 'live' ? mappingRuntime.live : mappingRuntime.mapper.buffer;
    material.size = size;
    if (source.revision === seen.current.revision && source === seen.current.source && color === seen.current.color) return;
    const full = seen.current.source !== source || seen.current.color !== color || seen.current.revision < 0;
    const start = full ? 0 : source.dirtyMin, end = full ? source.count - 1 : Math.min(source.count - 1, source.dirtyMax);
    const positions = geometry.getAttribute('position') as BufferAttribute, colors = geometry.getAttribute('color') as BufferAttribute;
    if (end >= start) {
      (positions.array as Float32Array).set(source.positions.subarray(start * 3, (end + 1) * 3), start * 3);
      for (let i = start; i <= end; i++) colors.setXYZ(i, ...pointColor(color, source.positions[i * 3 + 1], source.distances[i], source.intensities[i]));
      positions.addUpdateRange(start * 3, (end - start + 1) * 3); colors.addUpdateRange(start * 3, (end - start + 1) * 3);
      positions.needsUpdate = true; colors.needsUpdate = true;
    }
    geometry.setDrawRange(0, source.count);
    source.dirtyMin = Infinity; source.dirtyMax = -1;
    seen.current = { revision: source.revision, color, source };
  });
  return <points name={`lidar-${layer}`} geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}
function ScanRange() {
  const ref = useRef<Group>(null!);
  const range = useMapping(s => s.config.range);
  useFrame(() => { ref.current.position.set(runtime.vehicle.x, 0.08, runtime.vehicle.z); });
  return <group ref={ref}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[range - 0.09, range, 128]} /><meshBasicMaterial color="#74cab3" transparent opacity={0.42} depthWrite={false} /></mesh></group>;
}
export function MapRenderer() {
  const live = useMapping(s => s.showLive), map = useMapping(s => s.showMap), enabled = useMapping(s => s.enabled);
  const range = useMapping(s => s.showRange), bounds = useMapping(s => s.bounds);
  return <group name="mapping-layers">
    {enabled && live && <Cloud layer="live" />}
    {map && <Cloud layer="map" />}
    {range && enabled && <ScanRange />}
    {range && bounds && <Line points={[[bounds.minX, 0.12, bounds.minZ], [bounds.maxX, 0.12, bounds.minZ], [bounds.maxX, 0.12, bounds.maxZ], [bounds.minX, 0.12, bounds.maxZ], [bounds.minX, 0.12, bounds.minZ]]} color="#d1ad6b" dashed dashSize={1} gapSize={0.7} />}
  </group>;
}
