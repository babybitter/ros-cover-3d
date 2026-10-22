import { create } from 'zustand';
import { explosionConfig } from '../config/explosionConfig';
import { AssemblyAnimationController } from '../simulation/AssemblyAnimationController';
import { useSimulation } from './simulationStore';

export const assemblyAnimation = new AssemblyAnimationController(explosionConfig.duration);
type Snapshot = ReturnType<AssemblyAnimationController['snapshot']>;
interface AssemblyStore extends Snapshot {
  seek: (progress: number) => void;
  setSpeed: (speed: number) => void;
  replay: () => void;
  restore: () => void;
}
let syncing = false;
function syncIntent(exploded: boolean) {
  syncing = true;
  try { useSimulation.getState().patch({ exploded }); } finally { syncing = false; }
}
export const useAssembly = create<AssemblyStore>(() => ({
  ...assemblyAnimation.snapshot(),
  seek: progress => {
    assemblyAnimation.seek(progress);
    syncIntent(assemblyAnimation.progress > 0);
    publishAssembly();
  },
  setSpeed: speed => { assemblyAnimation.setSpeed(speed); publishAssembly(); },
  replay: () => { assemblyAnimation.replay(); syncIntent(true); publishAssembly(); },
  restore: () => { assemblyAnimation.seek(0); syncIntent(false); publishAssembly(); },
}));
export function publishAssembly() { useAssembly.setState(assemblyAnimation.snapshot()); }
const unsubscribe = useSimulation.subscribe((state, previous) => {
  if (!syncing && state.exploded !== previous.exploded) {
    assemblyAnimation.play(state.exploded ? 1 : 0);
    publishAssembly();
  }
});
// Vite must release the old subscription during hot replacement.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe();
    useAssembly.getState().restore();
  });
}
