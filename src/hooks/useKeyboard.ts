import { useEffect } from 'react';
import { useSimulation } from '../stores/simulationStore';

export function useKeyboard() {
  useEffect(() => {
    const keys = new Set<string>();
    const update = () => {
      const s = useSimulation.getState();
      if (s.emergency) { keys.clear(); return; }
      const throttle = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const steer = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      s.patch({ input: { throttle, steer }, mode: 'manual', showObstacles: true, navStatus: s.navStatus === 'running' ? 'ready' : s.navStatus });
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select, [contenteditable]')) return;
      const k = e.key.toLowerCase();
      if ((k === ' ' || k.startsWith('arrow')) && (e.target as HTMLElement).closest('button')) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
        if (k === ' ') { useSimulation.getState().stop(true); keys.clear(); return; }
        keys.add(k); update();
      }
    };
    const up = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (keys.delete(k)) update(); };
    const blur = () => { keys.clear(); useSimulation.getState().patch({ input: { throttle: 0, steer: 0 } }); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
}
