import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

const blurFragment = `
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  varying vec2 vUv;
  void main() {
    vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
    sum += texture2D(tDiffuse, vUv + direction * 1.384615) * 0.316216;
    sum += texture2D(tDiffuse, vUv - direction * 1.384615) * 0.316216;
    sum += texture2D(tDiffuse, vUv + direction * 3.230769) * 0.070270;
    sum += texture2D(tDiffuse, vUv - direction * 3.230769) * 0.070270;
    gl_FragColor = sum;
  }
`;

export function GroundContactShadows({ resolution }: { resolution: number }) {
  const group = useRef<THREE.Group>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const target = useFBO(resolution, resolution, { type: THREE.UnsignedByteType });
  const scratch = useFBO(resolution, resolution, { type: THREE.UnsignedByteType });
  const resources = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(14, 14).rotateX(Math.PI / 2);
    const depth = new THREE.MeshDepthMaterial({ depthTest: false, depthWrite: false });
    depth.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'vec4( vec3( 0.0 ), 1.0 - fragCoordZ );',
      );
    };
    const blur = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: target.texture }, direction: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: blurFragment,
      depthTest: false,
      depthWrite: false,
    });
    const display = new THREE.MeshBasicMaterial({
      map: target.texture, transparent: true, opacity: 0.35, depthWrite: false,
    });
    return { geometry, depth, blur, display, blurPlane: new THREE.Mesh(geometry, blur) };
  }, [target]);

  useEffect(() => () => {
    resources.geometry.dispose();
    resources.depth.dispose();
    resources.blur.dispose();
    resources.display.dispose();
  }, [resources]);

  useFrame(({ gl, scene }) => {
    if (!group.current || !camera.current) return;
    const previousTarget = gl.getRenderTarget();
    const background = scene.background;
    const override = scene.overrideMaterial;
    const visible = group.current.visible;
    const shadowAutoUpdate = gl.shadowMap.autoUpdate;
    try {
      group.current.visible = false;
      scene.background = null;
      scene.overrideMaterial = resources.depth;
      gl.shadowMap.autoUpdate = false;
      gl.setRenderTarget(target);
      gl.render(scene, camera.current);
      // Both passes reuse stable targets; useFBO resizes and disposes their GPU storage.
      for (const amount of [2.5, 1]) {
        resources.blur.uniforms.tDiffuse.value = target.texture;
        resources.blur.uniforms.direction.value.set(amount / 256, 0);
        gl.setRenderTarget(scratch);
        gl.render(resources.blurPlane, camera.current);
        resources.blur.uniforms.tDiffuse.value = scratch.texture;
        resources.blur.uniforms.direction.value.set(0, amount / 256);
        gl.setRenderTarget(target);
        gl.render(resources.blurPlane, camera.current);
      }
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.shadowMap.autoUpdate = shadowAutoUpdate;
      group.current.visible = visible;
      scene.background = background;
      scene.overrideMaterial = override;
    }
  }, -1);

  return <group ref={group} rotation-x={Math.PI / 2} position={[0, 0.005, 0]} dispose={null}>
    <mesh geometry={resources.geometry} material={resources.display} scale={[1, -1, 1]} rotation-x={-Math.PI / 2} />
    <orthographicCamera ref={camera} args={[-7, 7, 7, -7, 0, 3]} />
  </group>;
}
