import { Vec2, Vec3 } from 'gl-matrix';
import { Map } from '@/entities/map/Map.ts';
import { Thing } from '@/entities/things/Thing.ts';
import { getRenderer } from '@/core/Context.ts';
import {
  PLAYER_RUN_ACCEL,
  PLAYER_RUN_SPEED,
  PLAYER_VIEW_HEIGHT,
  PLAYER_WALK_ACCEL,
  PLAYER_WALK_SPEED,
  SCALE,
} from '@/defs/Units.ts';
import { Controls } from '@/engine/Controls.ts';
import { clamp, damp } from '@/helpers/MathUtils.ts';

export class PlayerThing extends Thing {
  private readonly viewAngle: Vec2;

  private targetHeight: number;

  public constructor(map: Map) {
    super(map);
    this.viewAngle = Vec2.fromValues(0, 0);
    this.localObjectRadius = 16 * SCALE;
    this.localObjectHeight = 8 * SCALE;
    this.targetHeight = 0;
  }

  public update(delta: number): void {
    super.update(delta);

    const mouse = Controls.getMouseMovement();
    this.viewAngle[1] += mouse[0] * -0.002;
    this.viewAngle[0] += mouse[1] * -0.002;
    this.viewAngle[0] = clamp(this.viewAngle[0], -Math.PI * 0.47, Math.PI * 0.47);

    if (Controls.keyDown('ArrowLeft')) {
      this.viewAngle[1] += 0.04 * delta;
    } else if (Controls.keyDown('ArrowRight')) {
      this.viewAngle[1] -= 0.04 * delta;
    }
    if (Controls.keyHit('KeyQ')) {
      this.enableCollision = !this.enableCollision;
      console.debug(`[Player] Collision ${this.enableCollision ? 'enabled' : 'disabled'}`);
    }

    // Vec2.scale(move, move, PLAYER_WALK_SPEED);
    if (this.localGrounded) {
      const move = Vec2.fromValues(0, 0);
      if (Controls.keyDown('KeyA')) {
        move[0] -= 1;
      }
      if (Controls.keyDown('KeyD')) {
        move[0] += 1;
      }
      if (Controls.keyDown('KeyW')) {
        move[1] -= 1;
      }
      if (Controls.keyDown('KeyS')) {
        move[1] += 1;
      }
      Vec2.rotate(move, move, [0, 0], -this.viewAngle[1]);

      const run = Controls.keyDown('ShiftLeft');
      const currentSpeed = Math.hypot(this.localVelocity[0], this.localVelocity[2]);
      const targetSpeed = run ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
      Vec2.scale(move, move, run ? PLAYER_RUN_ACCEL : PLAYER_WALK_ACCEL);

      if (currentSpeed <= targetSpeed) {
        this.localVelocity[0] += move[0] * delta;
        this.localVelocity[2] += move[1] * delta;
      }
    }
  }

  public postUpdate(delta: number): void {
    super.postUpdate(delta);

    if (this.localPosition[1] > this.targetHeight) {
      this.targetHeight = damp(this.targetHeight, this.localPosition[1], 0.2, delta);
    } else if (this.localPosition[1] < this.targetHeight) {
      this.targetHeight = this.localPosition[1];
    }

    const pos = Vec3.clone(this.localPosition);
    pos[1] = this.targetHeight;
    pos[1] += PLAYER_VIEW_HEIGHT;

    getRenderer().camera.position = pos;
    getRenderer().camera.rotation = Vec3.fromValues(this.viewAngle[0], this.viewAngle[1], 0);
  }

  public render(): void {
    super.render();
  }
}
