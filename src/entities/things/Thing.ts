import { Vec2, Vec3 } from 'gl-matrix';
import { Map } from '@/entities/map/Map.ts';
import { damp } from '@/helpers/MathUtils.ts';

export abstract class Thing {
  protected localObjectRadius: number;

  protected localObjectHeight: number;

  protected localFlags: number;

  protected localGrounded: boolean;

  protected localPosition: Vec3;

  protected localAngle: number;

  protected localVelocity: Vec3;

  protected enableCollision: boolean;

  public get position() {
    return Vec3.clone(this.localPosition);
  }

  public set position(value: Vec3) {
    if (!Vec3.equals(this.localPosition, value)) {
      Vec3.copy(this.localPosition, value);
      Vec3.zero(this.localVelocity);
    }
  }

  protected constructor(protected readonly map: Map) {
    this.localObjectRadius = 16;
    this.localObjectHeight = 32;
    this.localFlags = 0;
    this.localGrounded = true;
    this.localPosition = Vec3.fromValues(0, 0, 0);
    this.localVelocity = Vec3.fromValues(0, 0, 0);
    this.localAngle = 0;
    this.enableCollision = true;
  }

  public update(delta: number) {}

  public updateCollision(delta: number) {
    if (!this.localGrounded && this.enableCollision) {
      this.localVelocity[1] -= 0.007 * delta;
    } else {
      this.localVelocity[1] = 0;
    }

    const scaledVel = Vec3.clone(this.localVelocity);
    Vec3.scale(scaledVel, scaledVel, delta);

    if (this.enableCollision) {
      const result = this.map.collide(
        this.localPosition,
        scaledVel,
        this.localObjectRadius,
        this.localObjectHeight,
      );
      Vec3.copy(this.localPosition, result.result);

      if (this.localGrounded !== result.grounded) {
        if (!result.grounded) {
          this.localVelocity[1] = -0.01;
        }
        this.localGrounded = result.grounded;
      }
    } else {
      Vec3.add(this.localPosition, this.localPosition, scaledVel);
      this.localPosition[1] = this.map.getFloorHeight(
        Vec2.fromValues(this.localPosition[0], this.localPosition[2]),
        this.localObjectRadius,
      );
    }
  }

  public postUpdate(delta: number) {
    const dampFactor = this.localGrounded ? 0.14 : 0.01;

    this.localVelocity[0] = damp(this.localVelocity[0], 0, dampFactor, delta);
    this.localVelocity[2] = damp(this.localVelocity[2], 0, dampFactor, delta);
  }

  public render() {}
}
