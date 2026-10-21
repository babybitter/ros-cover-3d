import { Environment, Lightformer } from '@react-three/drei';

export function SceneLighting() {
  return <>
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#e1ecff', '#47505c', 1.4]} />
    <directionalLight position={[3, 7, 5]} intensity={3.4} color="#f4f7ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={0.035} />
    <directionalLight position={[-4, 3, -5]} intensity={2.3} color="#80a8ce" />
    <directionalLight position={[2, 2, -3]} intensity={1.4} color="#d8f7f3" />
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={3} position={[0, 5, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 4, 1]} />
      <Lightformer form="rect" intensity={2} position={[-4, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 3, 1]} />
      <Lightformer form="rect" intensity={2} position={[4, 3, 4]} rotation={[0, -Math.PI / 4, 0]} scale={[4, 4, 1]} />
    </Environment>
  </>;
}
