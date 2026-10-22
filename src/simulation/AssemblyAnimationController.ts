import type { Object3D, LineSegments, BufferGeometry, LineBasicMaterial } from 'three';
import type { ExplosionPartConfig } from '../config/explosionConfig';

export const smootherstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export function partProgress(progress: number, config: ExplosionPartConfig) {
  return smootherstep((progress - config.start) / (config.end - config.start));
}

type Guide = LineSegments<BufferGeometry, LineBasicMaterial>;
type Binding = {
  object: Object3D;
  position: Object3D['position'];
  quaternion: Object3D['quaternion'];
  scale: Object3D['scale'];
  config: ExplosionPartConfig;
  guide?: Guide;
};
type Segment = {
  kind: 'move' | 'brake';
  start: number;
  end: number;
  velocity: number;
  elapsed: number;
  duration: number;
};

export class AssemblyAnimationController {
  progress = 0;
  velocity = 0;
  target: 0 | 1 = 0;
  playing = false;
  speed = 1;
  private replayPending = false;
  private bindings = new Map<Object3D, Binding>();
  private segment?: Segment;

  constructor(readonly duration = 1.2) {
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Assembly duration must be positive');
  }

  snapshot() {
    return { progress: this.progress, target: this.target, playing: this.playing, speed: this.speed };
  }

  play(target: 0 | 1) {
    this.replayPending = false;
    if (this.playing && this.target === target) return;
    this.target = target;
    this.playing = this.progress !== target || this.velocity !== 0;
    if (!this.playing) { this.segment = undefined; return; }
    // On reversal, finish braking inside the remaining travel envelope before
    // starting the return stroke. Position and velocity stay continuous.
    if (this.velocity !== 0) {
      const room = this.velocity > 0 ? 1 - this.progress : this.progress;
      const duration = Math.min(this.duration * 0.15, 1.8 * room / Math.abs(this.velocity));
      this.segment = {
        kind: 'brake', start: this.progress,
        end: this.progress + this.velocity * duration / 2,
        velocity: this.velocity, elapsed: 0, duration,
      };
    } else this.beginMove();
  }

  seek(progress: number) {
    if (!Number.isFinite(progress)) return;
    this.progress = Math.max(0, Math.min(1, progress));
    this.velocity = 0;
    this.target = this.progress === 0 ? 0 : 1;
    this.playing = false;
    this.replayPending = false;
    this.segment = undefined;
    this.apply();
  }

  replay() {
    this.play(0);
    this.replayPending = true;
    if (!this.playing) { this.replayPending = false; this.play(1); }
  }

  setSpeed(speed: number) {
    if (Number.isFinite(speed)) this.speed = Math.max(0.25, Math.min(3, speed));
  }

  advance(dt: number) {
    if (!this.playing || !Number.isFinite(dt) || dt <= 0) return;
    let remaining = dt * this.speed;
    while (this.playing && this.segment && remaining > 0) {
      const segment = this.segment;
      const step = Math.min(remaining, segment.duration - segment.elapsed);
      segment.elapsed += step;
      remaining -= step;
      const t = Math.min(1, segment.elapsed / segment.duration);
      if (segment.kind === 'brake') {
        this.progress = segment.start + segment.velocity * segment.duration * (t - t ** 3 + t ** 4 / 2);
        this.velocity = segment.velocity * (1 - t * t * (3 - 2 * t));
      } else {
        this.progress = segment.start + (segment.end - segment.start) * smootherstep(t);
        this.velocity = (segment.end - segment.start) * 30 * t * t * (1 - t) ** 2 / segment.duration;
      }
      if (segment.elapsed >= segment.duration) {
        this.progress = segment.end;
        this.velocity = 0;
        this.segment = undefined;
        if (segment.kind === 'brake') this.beginMove();
        else {
          this.playing = false;
          if (this.replayPending) {
            this.replayPending = false;
            this.play(1);
          }
        }
      }
    }
    this.apply();
  }

  private beginMove() {
    this.segment = {
      kind: 'move', start: this.progress, end: this.target, velocity: 0, elapsed: 0,
      duration: this.duration * Math.max(0.25, Math.abs(this.target - this.progress)),
    };
  }

  register(object: Object3D, config: ExplosionPartConfig, guide?: Guide) {
    if (this.bindings.has(object)) throw new Error('Assembly part is already registered');
    const binding = {
      object, config, guide,
      position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(),
    };
    this.bindings.set(object, binding);
    this.applyBinding(binding);
    return () => {
      object.position.copy(binding.position);
      object.quaternion.copy(binding.quaternion);
      object.scale.copy(binding.scale);
      this.bindings.delete(object);
    };
  }

  private apply() { this.bindings.forEach(binding => this.applyBinding(binding)); }

  private applyBinding({ object, position, quaternion, scale, config, guide }: Binding) {
    const p = partProgress(this.progress, config);
    object.position.copy(position);
    object.position.x += config.offset[0] * p;
    object.position.y += config.offset[1] * p;
    object.position.z += config.offset[2] * p;
    object.quaternion.copy(quaternion);
    object.scale.copy(scale);
    if (guide) {
      const attribute = guide.geometry.getAttribute('position');
      const [x, y, z] = config.anchor;
      attribute.setXYZ(0, position.x + x, position.y + y, position.z + z);
      attribute.setXYZ(1, position.x + x + config.offset[0] * p, position.y + y + config.offset[1] * p, position.z + z + config.offset[2] * p);
      attribute.needsUpdate = true;
      guide.material.opacity = 0.22 * p;
      guide.visible = p > 0.001;
    }
  }
}
